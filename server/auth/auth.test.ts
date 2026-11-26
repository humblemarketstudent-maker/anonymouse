import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { DEMO_OTP } from "../../src/backend/demo-otp.ts";
import { createApp } from "./app.ts";
import { DEFAULT_CORS_ORIGINS, loadConfig } from "./config.ts";
import { OTP_GLOBAL_PER_HOUR, OTP_PER_EMAIL_PER_HOUR, OTP_PER_IP_PER_HOUR } from "./limits.ts";
import { verifySession } from "./token.ts";

const ACCOUNT = `AC${"ab".repeat(16)}`;
const SERVICE = `VA${"cd".repeat(16)}`;
const TWILIO_TOKEN = "test-twilio-auth-token";
const SESSION = "test-session-secret-value";
const EMAIL = "floor@example.com";
const GOOD_CODE = "482913";

interface TwilioCall {
  url: string;
  body: string;
  auth: string;
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve(address.port);
    });
  });
}

async function close(server: Server) {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

function twilioFetch(calls: TwilioCall[], approveCode = GOOD_CODE, startStatus = 201): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? init.body : "";
    const auth = new Headers(init?.headers).get("authorization") ?? "";
    calls.push({ url, body, auth });
    if (url.endsWith("/Verifications")) {
      return new Response(JSON.stringify({ status: startStatus === 201 ? "pending" : "failed", to: EMAIL, message: "upstream-email-echo" }), {
        status: startStatus,
      });
    }
    const params = new URLSearchParams(body);
    const approved = params.get("Code") === approveCode;
    return new Response(
      JSON.stringify({ status: approved ? "approved" : "pending", to: params.get("To"), message: "upstream-email-echo" }),
      { status: 200 },
    );
  };
}

function productionEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    AUTH_PORT: "8788",
    TWILIO_ACCOUNT_SID: ACCOUNT,
    TWILIO_AUTH_TOKEN: TWILIO_TOKEN,
    TWILIO_VERIFY_SERVICE_SID: SERVICE,
    AUTH_SESSION_SECRET: SESSION,
    ALLOW_DEMO_OTP: "false",
    CORS_ORIGIN: "",
    ...overrides,
  };
}

async function boot(env: NodeJS.ProcessEnv, fetchImpl: typeof fetch, now: () => number = () => 1_700_000_000_000) {
  const config = loadConfig(env);
  const app = createApp({ config, fetchImpl, now });
  const server = createServer((req, res) => {
    void app(req, res);
  });
  const port = await listen(server);
  return { server, base: `http://127.0.0.1:${port}`, config };
}

async function post(base: string, path: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("auth API", () => {
  it("stays healthy without Twilio and does not echo secrets", async () => {
    const calls: TwilioCall[] = [];
    const { server, base } = await boot(productionEnv({ TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_VERIFY_SERVICE_SID: "" }), twilioFetch(calls));
    try {
      const health = await fetch(`${base}/api/auth/health`);
      expect(await health.json()).toEqual({ ok: true });
      expect(health.headers.get("cache-control")).toBe("no-store");
      const denied = await post(base, "/api/auth/request-otp", { contact: EMAIL });
      const text = await denied.text();
      expect(denied.status).toBe(503);
      expect(text).not.toContain(TWILIO_TOKEN);
      expect(text).not.toContain(SESSION);
      expect(text).not.toContain(EMAIL);
      expect(text).not.toContain("@");
      expect(calls).toHaveLength(0);
    } finally {
      await close(server);
    }
  });

  it("asks Twilio Verify to email a code and does not keep the code", async () => {
    const calls: TwilioCall[] = [];
    const { server, base } = await boot(productionEnv(), twilioFetch(calls));
    try {
      const response = await post(base, "/api/auth/request-otp", { contact: "Floor@Example.com" });
      const text = await response.text();
      expect(response.status).toBe(200);
      expect(text).toBe(JSON.stringify({ ok: true }));
      expect(text).not.toContain(EMAIL);
      expect(text).not.toContain("@");
      expect(text).not.toContain("upstream-email-echo");
      expect(text).not.toContain(TWILIO_TOKEN);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe(`https://verify.twilio.com/v2/Services/${SERVICE}/Verifications`);
      expect(calls[0]?.body).toBe(new URLSearchParams({ To: EMAIL, Channel: "email" }).toString());
      expect(calls[0]?.body).not.toContain("sms");
      expect(Buffer.from((calls[0]?.auth ?? "").replace(/^Basic /, ""), "base64").toString()).toBe(`${ACCOUNT}:${TWILIO_TOKEN}`);
    } finally {
      await close(server);
    }
  });

  it("returns a short-lived token after Twilio approves the code, without the email", async () => {
    const calls: TwilioCall[] = [];
    const clock = 1_700_000_000_000;
    const { server, base } = await boot(productionEnv(), twilioFetch(calls), () => clock);
    try {
      await post(base, "/api/auth/request-otp", { contact: EMAIL });
      const wrong = await post(base, "/api/auth/verify-otp", { contact: EMAIL, code: "111111" });
      const wrongText = await wrong.text();
      expect(wrong.status).toBe(400);
      expect(wrongText).not.toContain("token");
      expect(wrongText).not.toContain(EMAIL);
      expect(wrongText).not.toContain("@");
      expect(wrongText).not.toContain(DEMO_OTP);

      const response = await post(base, "/api/auth/verify-otp", { contact: "Floor@Example.com", code: GOOD_CODE });
      const text = await response.text();
      const body = JSON.parse(text) as { ok: boolean; token: string; expiresAt: number };
      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.expiresAt).toBe(clock + 5 * 60 * 1000);
      expect(verifySession(SESSION, body.token, clock)).toBe(true);
      expect(verifySession(SESSION, body.token, clock + 5 * 60 * 1000)).toBe(false);
      const payload = JSON.parse(Buffer.from(body.token.split(".")[0] ?? "", "base64url").toString("utf8")) as Record<string, unknown>;
      expect(payload).toEqual({ v: 1, iat: clock, exp: clock + 5 * 60 * 1000 });
      expect(JSON.stringify(payload)).not.toContain("@");
      expect(text).not.toContain(EMAIL);
      expect(text).not.toContain("@");
      expect(text).not.toContain(TWILIO_TOKEN);
      expect(text).not.toContain("upstream-email-echo");
      const check = calls.at(-1);
      expect(check?.url).toContain("/VerificationCheck");
      expect(check?.body).toContain(`To=${encodeURIComponent(EMAIL)}`);
      expect(check?.body).toContain(`Code=${GOOD_CODE}`);
    } finally {
      await close(server);
    }
  });

  it("rejects the demo code unless ALLOW_DEMO_OTP is on and the process is not production", async () => {
    const liveCalls: TwilioCall[] = [];
    const live = await boot(productionEnv({ ALLOW_DEMO_OTP: "true" }), twilioFetch(liveCalls));
    try {
      const requested = await post(live.base, "/api/auth/request-otp", { contact: EMAIL });
      expect(requested.status).toBe(200);
      expect(liveCalls).toHaveLength(1);
      const verified = await post(live.base, "/api/auth/verify-otp", { contact: EMAIL, code: DEMO_OTP });
      const text = await verified.text();
      expect(verified.status).toBe(400);
      expect(text).not.toContain(DEMO_OTP);
      expect(liveCalls).toHaveLength(1);
    } finally {
      await close(live.server);
    }

    const demoCalls: TwilioCall[] = [];
    const demo = await boot(
      productionEnv({ NODE_ENV: "development", ALLOW_DEMO_OTP: "true" }),
      twilioFetch(demoCalls),
    );
    try {
      const requested = await post(demo.base, "/api/auth/request-otp", { contact: EMAIL });
      expect(await requested.json()).toEqual({ ok: true });
      expect(demoCalls).toHaveLength(0);
      const other = await post(demo.base, "/api/auth/verify-otp", { contact: EMAIL, code: GOOD_CODE });
      expect(other.status).toBe(400);
      const verified = await post(demo.base, "/api/auth/verify-otp", { contact: EMAIL, code: DEMO_OTP });
      const body = (await verified.json()) as { ok: boolean; token: string };
      expect(body.ok).toBe(true);
      expect(verifySession(SESSION, body.token, 1_700_000_000_000)).toBe(true);
      expect(demoCalls).toHaveLength(0);
    } finally {
      await close(demo.server);
    }
  });

  it("limits codes per email, per address, and per process", async () => {
    const calls: TwilioCall[] = [];
    let clock = 1_700_000_000_000;
    const { server, base } = await boot(productionEnv(), twilioFetch(calls), () => clock);
    try {
      expect((await post(base, "/api/auth/request-otp", { contact: EMAIL })).status).toBe(200);
      const again = await post(base, "/api/auth/request-otp", { contact: "Floor@Example.com" });
      expect(again.status).toBe(429);
      expect(await again.json()).toEqual({ ok: false, error: "A code was just sent. Wait a minute before requesting another." });
      expect(calls).toHaveLength(1);

      for (let sent = 1; sent < OTP_PER_EMAIL_PER_HOUR; sent += 1) {
        clock += 60_000;
        expect((await post(base, "/api/auth/request-otp", { contact: EMAIL })).status).toBe(200);
      }
      clock += 60_000;
      const hourly = await post(base, "/api/auth/request-otp", { contact: EMAIL });
      expect(hourly.status).toBe(429);
      expect(((await hourly.json()) as { error: string }).error).toMatch(/this email/i);
      expect(calls).toHaveLength(OTP_PER_EMAIL_PER_HOUR);

      clock += 60 * 60_000;
      for (let index = 0; index < OTP_PER_IP_PER_HOUR; index += 1) {
        const email = `ip${index}@example.com`;
        expect((await post(base, "/api/auth/request-otp", { contact: email }, { "x-forwarded-for": "203.0.113.10" })).status).toBe(200);
      }
      const networked = await post(base, "/api/auth/request-otp", { contact: "extra@example.com" }, { "x-forwarded-for": "203.0.113.10" });
      expect(networked.status).toBe(429);
      expect(((await networked.json()) as { error: string }).error).toMatch(/this network/i);

      clock += 60 * 60_000;
      for (let index = 0; index < OTP_GLOBAL_PER_HOUR; index += 1) {
        const email = `global${index}@example.com`;
        const response = await post(base, "/api/auth/request-otp", { contact: email }, { "x-forwarded-for": `198.51.100.${index + 1}` });
        expect(response.status).toBe(200);
      }
      const globalCap = await post(base, "/api/auth/request-otp", { contact: "overflow@example.com" }, { "x-forwarded-for": "198.51.100.200" });
      expect(globalCap.status).toBe(429);
      expect(((await globalCap.json()) as { error: string }).error).toBe("Too many codes were requested. Try again later.");
    } finally {
      await close(server);
    }
  });

  it("stops code guessing before Twilio is called again", async () => {
    const calls: TwilioCall[] = [];
    const { server, base } = await boot(productionEnv(), twilioFetch(calls));
    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await post(base, "/api/auth/verify-otp", { contact: EMAIL, code: "111111" });
        expect(response.status).toBe(400);
      }
      expect(calls).toHaveLength(5);
      const blocked = await post(base, "/api/auth/verify-otp", { contact: EMAIL, code: GOOD_CODE });
      expect(blocked.status).toBe(429);
      expect(calls).toHaveLength(5);
    } finally {
      await close(server);
    }
  });

  it("allows the public site origins and the local dev origin only outside production", async () => {
    expect(DEFAULT_CORS_ORIGINS).toEqual([
      "https://anonymouse.lol",
      "https://www.anonymouse.lol",
      "https://anonymouse-eafk.onrender.com",
    ]);
    const calls: TwilioCall[] = [];
    const { server, base } = await boot(productionEnv(), twilioFetch(calls));
    try {
      for (const origin of DEFAULT_CORS_ORIGINS) {
        const preflight = await fetch(`${base}/api/auth/request-otp`, { method: "OPTIONS", headers: { origin } });
        expect(preflight.status).toBe(204);
        expect(preflight.headers.get("access-control-allow-origin")).toBe(origin);
      }
      const blocked = await post(base, "/api/auth/request-otp", { contact: EMAIL }, { origin: "https://evil.example" });
      expect(blocked.status).toBe(403);
      expect(blocked.headers.get("access-control-allow-origin")).toBeNull();
      expect(calls).toHaveLength(0);
      const allowed = await post(base, "/api/auth/request-otp", { contact: EMAIL }, { origin: "https://anonymouse.lol" });
      expect(allowed.status).toBe(200);
      expect(allowed.headers.get("access-control-allow-origin")).toBe("https://anonymouse.lol");
    } finally {
      await close(server);
    }

    const dev = await boot(productionEnv({ NODE_ENV: "development", ALLOW_DEMO_OTP: "false" }), twilioFetch([]));
    try {
      const local = await fetch(`${dev.base}/api/auth/health`, { headers: { origin: "http://127.0.0.1:43123" } });
      expect(local.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:43123");
    } finally {
      await close(dev.server);
    }
  });

  it("rejects a phone number, a bad address, a huge body, and a missing session secret before Twilio", async () => {
    const calls: TwilioCall[] = [];
    const { server, base } = await boot(productionEnv(), twilioFetch(calls));
    try {
      expect((await post(base, "/api/auth/request-otp", { contact: "+12125550148" })).status).toBe(400);
      expect((await post(base, "/api/auth/request-otp", { contact: "2125550148" })).status).toBe(400);
      expect((await post(base, "/api/auth/request-otp", { contact: "a@b" })).status).toBe(400);
      expect((await post(base, "/api/auth/verify-otp", { contact: "+12125550148", code: GOOD_CODE })).status).toBe(400);
      expect((await post(base, "/api/auth/verify-otp", { contact: EMAIL, code: "12" })).status).toBe(400);
      const huge = await fetch(`${base}/api/auth/request-otp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact: EMAIL, pad: "x".repeat(5000) }),
      });
      expect(huge.status).toBe(413);
      expect(calls).toHaveLength(0);
      const still = await post(base, "/api/auth/request-otp", { contact: EMAIL });
      expect(still.status).toBe(200);
    } finally {
      await close(server);
    }

    const unsigned = await boot(productionEnv({ AUTH_SESSION_SECRET: "too-short" }), twilioFetch([]));
    try {
      const response = await post(unsigned.base, "/api/auth/request-otp", { contact: EMAIL });
      expect(response.status).toBe(503);
    } finally {
      await close(unsigned.server);
    }
  });
});
