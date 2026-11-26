import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AttachmentInput } from "../src/moderation/attachments.ts";
import type { Journal } from "../src/moderation/journal.ts";
import { sessionHash } from "../src/moderation/hash.ts";
import { NOTICE } from "../src/moderation/notices.ts";
import {
  commit,
  evaluateAsync,
  previewOf,
  type Evaluation,
  type EvaluateInput,
  type TextParts,
} from "../src/moderation/pipeline.ts";
import { createRateStore, type RateStore } from "../src/moderation/rate.ts";
import { type AgentConfig, llmEnabled, visionEnabled } from "./config.ts";
import { classifyImage, classifyText } from "./llm.ts";
import { createServerJournal } from "./store.ts";

export interface AppDeps {
  config: AgentConfig;
  journal?: Journal;
  rate?: RateStore;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface PublicDecision {
  action: Evaluation["action"];
  body: string;
  url: string;
  title: string;
  summary: string;
  source: string;
  attachmentAllowed: boolean;
  pii_redacted: boolean;
  redacted_types: string[];
  notice: string;
  rule: string;
  confidence: number;
  severity: Evaluation["severity"];
}

const hits = new Map<string, number[]>();

function send(res: ServerResponse, status: number, body: unknown, origin: string) {
  const payload = JSON.stringify(body);
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-headers"] = "authorization, content-type";
    headers["access-control-allow-methods"] = "GET, POST, OPTIONS";
    headers["vary"] = "origin";
  }
  res.writeHead(status, headers);
  res.end(payload);
}

function bearerOk(header: string | undefined, token: string): boolean {
  if (!token || !header) return false;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  const presented = match?.[1];
  if (!presented) return false;
  const got = Buffer.from(presented);
  const expected = Buffer.from(token);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.socket.remoteAddress || "unknown";
}

function limited(ip: string, now: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 180) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
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

function asString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

function attachmentFrom(value: unknown): AttachmentInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = asString(record.name, 180);
  const mime = asString(record.mime, 120);
  const dataUrl = typeof record.dataUrl === "string" ? record.dataUrl : "";
  const size = typeof record.size === "number" && Number.isFinite(record.size) ? record.size : 0;
  if (!name || !mime || !dataUrl.startsWith("data:")) return null;
  return { name, mime, size, dataUrl };
}

function partsFrom(body: Record<string, unknown>): TextParts {
  return {
    body: asString(body.text, 4000),
    url: asString(body.url, 2000),
    title: asString(body.title, 300),
    summary: asString(body.summary, 1000),
    source: asString(body.source, 120),
  };
}

function toPublic(evaluation: Evaluation): PublicDecision {
  const publish = evaluation.action === "allow" || evaluation.action === "redact";
  return {
    action: evaluation.action,
    body: publish ? evaluation.parts.body : "",
    url: publish ? (evaluation.parts.url ?? "") : "",
    title: publish ? (evaluation.parts.title ?? "") : "",
    summary: publish ? (evaluation.parts.summary ?? "") : "",
    source: publish ? (evaluation.parts.source ?? "") : "",
    attachmentAllowed: publish && evaluation.attachmentAllowed,
    pii_redacted: evaluation.pii_redacted,
    redacted_types: evaluation.redacted_types,
    notice: evaluation.notice ?? "",
    rule: evaluation.rule,
    confidence: evaluation.confidence,
    severity: evaluation.severity,
  };
}

function hardBlock(rule: string, severity: Evaluation["severity"], notice: string, withhold: boolean, source: string): Evaluation {
  return {
    action: "block",
    parts: { body: "" },
    attachmentAllowed: false,
    pii_redacted: false,
    redacted_types: [],
    notice,
    rule,
    confidence: 0.74,
    severity,
    preview: previewOf(source, withhold),
    alert: true,
    withhold,
  };
}

async function notify(
  evaluation: Evaluation,
  input: EvaluateInput,
  config: AgentConfig,
  journal: Journal,
  fetchImpl: typeof fetch,
  now: number,
) {
  if (!config.webhookUrl) return;
  if (!evaluation.alert) return;
  if (evaluation.severity !== "high" && evaluation.severity !== "critical") return;
  const payload = {
    source: "anonymouse-moderation",
    severity: evaluation.severity,
    ts: new Date(now).toISOString(),
    channelId: input.channelId || "unknown",
    reason: evaluation.rule === "minor_safety" ? "Safety hold" : evaluation.rule === "adult_content" ? "Adult content" : evaluation.rule === "scanner_timeout" ? "Pending scan" : "Confidential leak",
    rule: evaluation.rule,
    preview: evaluation.preview,
    actorHash: sessionHash(input.actorId || "anonymous", config.actorSalt),
    confidence: evaluation.confidence,
  };
  try {
    const response = await fetchImpl(config.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.webhookTimeoutMs),
    });
    if (!response.ok) throw new Error("webhook rejected");
    journal.appendAudit({
      id: `aud_hook_${now.toString(36)}`,
      ts: now,
      action: "webhook_sent",
      rule: evaluation.rule,
      confidence: 1,
      actorHash: payload.actorHash,
      channelId: payload.channelId,
      severity: "info",
      preview: "[delivered]",
      redactedTypes: [],
      piiRedacted: false,
    });
  } catch {
    journal.appendAudit({
      id: `aud_hook_${now.toString(36)}_f`,
      ts: now,
      action: "webhook_failed",
      rule: evaluation.rule,
      confidence: 1,
      actorHash: payload.actorHash,
      channelId: payload.channelId,
      severity: "medium",
      preview: "[not delivered]",
      redactedTypes: [],
      piiRedacted: false,
    });
  }
}

export function createApp(deps: AppDeps) {
  const config = deps.config;
  const journal = deps.journal ?? createServerJournal(config.auditPath);
  const rate = deps.rate ?? createRateStore();
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => Date.now());

  async function inspect(body: Record<string, unknown>): Promise<Evaluation> {
    const attachment = attachmentFrom(body.attachment);
    const input: EvaluateInput = {
      parts: partsFrom(body),
      attachment,
      channelId: asString(body.channelId, 120) || "unknown",
      actorId: asString(body.actorId, 120) || "anonymous",
    };
    const stampRecord = body.stamp && typeof body.stamp === "object" ? (body.stamp as Record<string, unknown>) : null;
    const stamp = stampRecord
      ? {
          pii_redacted: stampRecord.pii_redacted === true,
          redacted_types: Array.isArray(stampRecord.redacted_types)
            ? stampRecord.redacted_types.filter((item): item is string => typeof item === "string").slice(0, 8)
            : [],
        }
      : undefined;
    let evaluation = await evaluateAsync(input, {
      scanner: async (file) => {
        if (file.mime.toLowerCase().startsWith("video/")) throw new Error("frames unavailable");
        if (!visionEnabled(config) || !file.mime.toLowerCase().startsWith("image/")) return "ok";
        const verdict = await classifyImage(file.dataUrl, config, fetchImpl);
        if (verdict.minor) return "minor";
        if (verdict.nsfw) return "nsfw";
        if (verdict.leak) return "leak";
        return "ok";
      },
      scanTimeoutMs: config.scanTimeoutMs,
    });
    if (llmEnabled(config) && evaluation.severity !== "critical" && evaluation.action !== "block" && evaluation.action !== "quarantine") {
      try {
        const verdict = await classifyText([input.parts.body, input.parts.url, input.parts.title, input.parts.summary].filter(Boolean).join("\n"), config, fetchImpl);
        if (verdict.minor) evaluation = hardBlock("minor_safety", "critical", NOTICE.blocked, true, "");
        else if (verdict.nsfw) evaluation = hardBlock("adult_content", "high", input.attachment ? NOTICE.attachmentBlocked : NOTICE.blocked, false, input.parts.body);
        else if (verdict.leak) evaluation = hardBlock("llm_leak", "high", NOTICE.blocked, false, input.parts.body);
      } catch {
        // Text classification is optional. Attachment failures already quarantine above.
      }
    }
    const finalDecision = commit(evaluation, input, {
      journal,
      rate,
      policy: config.policy,
      now: now(),
      salt: config.actorSalt,
      stamp,
    });
    await notify(finalDecision, input, config, journal, fetchImpl, now());
    return finalDecision;
  }

  return async function handle(req: IncomingMessage, res: ServerResponse) {
    const origin = config.corsOrigin;
    if (req.method === "OPTIONS") {
      send(res, 204, {}, origin);
      return;
    }
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const path = url.pathname;
    try {
      if (req.method === "GET" && path === "/api/moderation/health") {
        send(res, 200, { ok: true, llm: llmEnabled(config), vision: visionEnabled(config), inspect: config.publicInspect }, origin);
        return;
      }
      if (path.startsWith("/api/moderation/admin/")) {
        if (!config.adminToken) {
          send(res, 503, { error: "Admin access is not configured." }, origin);
          return;
        }
        if (!bearerOk(req.headers.authorization, config.adminToken)) {
          send(res, 401, { error: "Admin token required." }, origin);
          return;
        }
        if (req.method === "GET" && path === "/api/moderation/admin/alerts") {
          send(res, 200, { alerts: journal.listAlerts() }, origin);
          return;
        }
        if (req.method === "GET" && path === "/api/moderation/admin/audit") {
          send(res, 200, { audit: journal.listAudit() }, origin);
          return;
        }
        if (req.method === "GET" && path === "/api/moderation/admin/quarantine") {
          send(res, 200, { quarantine: journal.listQuarantine() }, origin);
          return;
        }
        const resolve = /^\/api\/moderation\/admin\/quarantine\/([^/]+)\/(allow|remove)$/.exec(path);
        if (req.method === "POST" && resolve) {
          const id = decodeURIComponent(resolve[1] ?? "");
          const action = resolve[2] === "allow" ? "allow" : "remove";
          const result = journal.resolveQuarantine(id, action, "ses_admin", now());
          send(res, result.ok ? 200 : 404, result.ok ? { ok: true } : result, origin);
          return;
        }
        send(res, 404, { error: "Not found." }, origin);
        return;
      }
      if (req.method === "POST" && path === "/api/moderation/inspect") {
        if (!config.publicInspect) {
          send(res, 404, { error: "Not found." }, origin);
          return;
        }
        if (limited(clientIp(req), now())) {
          send(res, 429, { error: NOTICE.paused }, origin);
          return;
        }
        const body = (await readJson(req, config.maxBodyBytes)) as Record<string, unknown>;
        if (!body || typeof body !== "object") {
          send(res, 400, { error: "Send a JSON object." }, origin);
          return;
        }
        const decision = toPublic(await inspect(body));
        send(res, 200, decision, origin);
        return;
      }
      send(res, 404, { error: "Not found." }, origin);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "too large";
      send(res, tooLarge ? 413 : 400, { error: tooLarge ? "That payload is too large." : "Request could not be read." }, origin);
    }
  };
}

export function listen(deps: AppDeps) {
  const handle = createApp(deps);
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  server.listen(deps.config.port, "0.0.0.0");
  return server;
}
