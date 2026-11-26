import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DEMO_OTP } from "../../src/backend/demo-otp.ts";
import { emailSignInError, normalizeEmail } from "../../src/backend/email.ts";
import { demoOtpEnabled, sessionReady, twilioReady, type AuthConfig } from "./config.ts";
import { createLimiter, type Limiter } from "./limits.ts";
import { signSession } from "./token.ts";
import { checkEmail, startEmail } from "./twilio.ts";

export interface AuthDeps {
  config: AuthConfig;
  fetchImpl?: typeof fetch;
  now?: () => number;
  limiter?: Limiter;
}

function send(res: ServerResponse, status: number, body: unknown, origin: string) {
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-headers"] = "content-type";
    headers["access-control-allow-methods"] = "GET, POST, OPTIONS";
    headers["access-control-max-age"] = "600";
    headers.vary = "origin";
  }
  if (status === 204) {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  headers["content-type"] = "application/json; charset=utf-8";
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function pathname(req: IncomingMessage): string {
  try {
    return new URL(req.url ?? "/", "http://auth.local").pathname;
  } catch {
    return "/";
  }
}

function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = typeof forwarded === "string" ? (forwarded.split(",")[0]?.trim() ?? "") : "";
  const candidate = raw || req.socket.remoteAddress || "unknown";
  if (candidate.length > 64) return "unknown";
  return candidate;
}

async function readJson(req: IncomingMessage, max: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buf.length;
    if (size > max) throw new Error("too large");
    chunks.push(buf);
  }
  if (size === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function asContact(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 320);
}

function digits(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "").slice(0, 12);
}

function allowedOrigin(requestOrigin: string, config: AuthConfig): string {
  if (!requestOrigin) return "";
  return config.corsOrigins.includes(requestOrigin) ? requestOrigin : "";
}

export function createApp(deps: AuthDeps) {
  const config = deps.config;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => Date.now());
  const limiter = deps.limiter ?? createLimiter(config.sessionSecret || "anonymouse-auth-unconfigured");

  async function requestOtp(req: IncomingMessage, res: ServerResponse, origin: string) {
    if (!sessionReady(config)) {
      send(res, 503, { ok: false, error: "Email sign-in is not available right now." }, origin);
      return;
    }
    const body = (await readJson(req, config.maxBodyBytes)) as Record<string, unknown>;
    const raw = asContact(body?.contact);
    const contact = normalizeEmail(raw);
    if (!contact) {
      send(res, 400, { ok: false, error: emailSignInError(raw) }, origin);
      return;
    }
    const demo = demoOtpEnabled(config);
    if (!demo && !twilioReady(config)) {
      send(res, 503, { ok: false, error: "Email sign-in is not available right now." }, origin);
      return;
    }
    const limited = limiter.takeSend(contact, clientIp(req), now());
    if (limited) {
      send(res, 429, { ok: false, error: limited }, origin);
      return;
    }
    if (demo) {
      send(res, 200, { ok: true }, origin);
      return;
    }
    const started = await startEmail(config, contact, fetchImpl);
    if (!started.ok || (started.verifyStatus !== "pending" && started.verifyStatus !== "approved")) {
      const status = started.status === 429 ? 429 : started.status === 401 || started.status === 403 || started.status === 0 ? 503 : 400;
      const error =
        status === 429
          ? "Too many codes were requested. Wait and try again."
          : status === 503
            ? "Email sign-in is not available right now."
            : "That address couldn't be emailed. Check it and try again.";
      send(res, status, { ok: false, error }, origin);
      return;
    }
    send(res, 200, { ok: true }, origin);
  }

  async function verifyOtp(req: IncomingMessage, res: ServerResponse, origin: string) {
    if (!sessionReady(config)) {
      send(res, 503, { ok: false, error: "Email sign-in is not available right now." }, origin);
      return;
    }
    const body = (await readJson(req, config.maxBodyBytes)) as Record<string, unknown>;
    const raw = asContact(body?.contact);
    const contact = normalizeEmail(raw);
    const code = digits(body?.code);
    if (!contact) {
      send(res, 400, { ok: false, error: emailSignInError(raw) }, origin);
      return;
    }
    if (code.length !== 6) {
      send(res, 400, { ok: false, error: "Enter the 6-digit code." }, origin);
      return;
    }
    const demo = demoOtpEnabled(config);
    if (!demo && !twilioReady(config)) {
      send(res, 503, { ok: false, error: "Email sign-in is not available right now." }, origin);
      return;
    }
    const limited = limiter.takeCheck(contact, clientIp(req), now());
    if (limited) {
      send(res, 429, { ok: false, error: limited }, origin);
      return;
    }
    if (demo) {
      if (code !== DEMO_OTP) {
        send(res, 400, { ok: false, error: "That code isn't valid." }, origin);
        return;
      }
      const session = signSession(config.sessionSecret, now(), config.tokenTtlMs);
      send(res, 200, { ok: true, token: session.token, expiresAt: session.expiresAt }, origin);
      return;
    }
    if (code === DEMO_OTP) {
      send(res, 400, { ok: false, error: "That code isn't valid." }, origin);
      return;
    }
    const checked = await checkEmail(config, contact, code, fetchImpl);
    if (!checked.ok || checked.verifyStatus !== "approved") {
      const status = checked.status === 429 ? 429 : checked.status === 401 || checked.status === 403 || checked.status === 0 ? 503 : 400;
      const error =
        status === 429
          ? "Too many attempts. Wait and try again."
          : status === 503
            ? "Email sign-in is not available right now."
            : "That code isn't valid.";
      send(res, status, { ok: false, error }, origin);
      return;
    }
    const session = signSession(config.sessionSecret, now(), config.tokenTtlMs);
    send(res, 200, { ok: true, token: session.token, expiresAt: session.expiresAt }, origin);
  }

  return async function handle(req: IncomingMessage, res: ServerResponse) {
    const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : "";
    const origin = allowedOrigin(requestOrigin, config);
    if (requestOrigin && !origin) {
      send(res, 403, { ok: false, error: "Origin not allowed." }, "");
      return;
    }
    if (req.method === "OPTIONS") {
      send(res, 204, null, origin);
      return;
    }
    const path = pathname(req);
    try {
      if (req.method === "GET" && path === "/api/auth/health") {
        send(res, 200, { ok: true }, origin);
        return;
      }
      if (req.method === "POST" && path === "/api/auth/request-otp") {
        await requestOtp(req, res, origin);
        return;
      }
      if (req.method === "POST" && path === "/api/auth/verify-otp") {
        await verifyOtp(req, res, origin);
        return;
      }
      send(res, 404, { ok: false, error: "Not found." }, origin);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "too large";
      if (!tooLarge && !(error instanceof SyntaxError)) console.error("auth request failed");
      send(
        res,
        tooLarge ? 413 : 400,
        { ok: false, error: tooLarge ? "That payload is too large." : "Request could not be read." },
        origin,
      );
    }
  };
}

export function listen(deps: AuthDeps) {
  const handle = createApp(deps);
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  server.listen(deps.config.port, "0.0.0.0");
  return server;
}
