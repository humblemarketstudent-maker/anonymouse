import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createServerJournal } from "./store.ts";
import { createMemoryJournal } from "../src/moderation/journal.ts";

const SECRET = "AKIAIOSFODNN7EXAMPLE";

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

describe("moderation agent HTTP", () => {
  it("masks PII, blocks secrets, and never echoes the secret", async () => {
    const hits: string[] = [];
    const hook = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        hits.push(Buffer.concat(chunks).toString("utf8"));
        res.writeHead(204);
        res.end();
      });
    });
    const hookPort = await listen(hook);
    const journal = createMemoryJournal(0);
    const config = loadConfig({
      MODERATION_ADMIN_TOKEN: "test-admin-token-value",
      MODERATION_ALERT_WEBHOOK_URL: `http://127.0.0.1:${hookPort}/hook`,
      MODERATION_PUBLIC_INSPECT: "true",
    });
    const app = createApp({ config, journal, fetchImpl: fetch });
    const server = createServer((req, res) => {
      void app(req, res);
    });
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;
    try {
      const masked = await fetch(`${base}/api/moderation/inspect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Ping me at 212-555-0199 after the close", channelId: "room_market", actorId: "hum_1" }),
      });
      const maskedBody = (await masked.json()) as { action: string; body: string; pii_redacted: boolean; redacted_types: string[] };
      expect(maskedBody.action).toBe("redact");
      expect(maskedBody.pii_redacted).toBe(true);
      expect(maskedBody.redacted_types).toContain("phone");
      expect(maskedBody.body).toBe("Ping me at **** after the close");

      const blocked = await fetch(`${base}/api/moderation/inspect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `prod key ${SECRET} thanks`, channelId: "thread_9", actorId: "hum_1" }),
      });
      const blockedText = await blocked.text();
      const blockedBody = JSON.parse(blockedText) as { action: string; notice: string; body: string };
      expect(blockedBody.action).toBe("block");
      expect(blockedBody.body).toBe("");
      expect(blockedText).not.toContain(SECRET);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.join("\n")).not.toContain(SECRET);
      const alert = JSON.parse(hits[0] ?? "{}") as { severity: string; channelId: string; preview: string; reason: string };
      expect(alert.severity).toBe("high");
      expect(alert.channelId).toBe("thread_9");
      expect(alert.reason).toBe("Confidential leak");
      expect(alert.preview).not.toContain(SECRET);

      const denied = await fetch(`${base}/api/moderation/admin/alerts`);
      expect(denied.status).toBe(401);
      const allowed = await fetch(`${base}/api/moderation/admin/alerts`, {
        headers: { authorization: "Bearer test-admin-token-value" },
      });
      const admin = (await allowed.json()) as { alerts: Array<{ preview: string }> };
      expect(allowed.status).toBe(200);
      expect(JSON.stringify(admin)).not.toContain(SECRET);
      expect(admin.alerts[0]?.preview).toContain("****");
    } finally {
      await close(server);
      await close(hook);
    }
  });

  it("quarantines a hung attachment scan instead of approving it", async () => {
    const config = loadConfig({
      MODERATION_ADMIN_TOKEN: "test-admin-token-value",
      MODERATION_LLM_BASE_URL: "http://127.0.0.1:9",
      MODERATION_LLM_API_KEY: "test-key",
      MODERATION_LLM_MODEL: "slow",
      MODERATION_VISION_MODEL: "slow-vision",
      MODERATION_SCAN_TIMEOUT_MS: "30",
      MODERATION_VISION_TIMEOUT_MS: "30",
    });
    const journal = createMemoryJournal(0);
    const app = createApp({
      config,
      journal,
      fetchImpl: () => new Promise(() => {}),
    });
    const server = createServer((req, res) => {
      void app(req, res);
    });
    const port = await listen(server);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/moderation/inspect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: "chart",
          channelId: "room_market",
          actorId: "hum_2",
          attachment: {
            name: "chart.png",
            mime: "image/png",
            size: 70,
            dataUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          },
        }),
      });
      const body = (await response.json()) as { action: string; attachmentAllowed: boolean; notice: string };
      expect(body.action).toBe("quarantine");
      expect(body.attachmentAllowed).toBe(false);
      expect(body.notice).toMatch(/held for review/i);
      const held = journal.listQuarantine();
      expect(held[0]?.status).toBe("pending");
      expect(JSON.stringify(held)).not.toContain("base64");
      const auditBefore = journal.listAudit().length;
      const removed = await fetch(`http://127.0.0.1:${port}/api/moderation/admin/quarantine/${held[0]?.id}/remove`, {
        method: "POST",
        headers: { authorization: "Bearer test-admin-token-value" },
      });
      expect(removed.status).toBe(200);
      expect(journal.listQuarantine()[0]?.status).toBe("removed");
      expect(journal.listAudit().length).toBeGreaterThan(auditBefore);
    } finally {
      await close(server);
    }
  });

  it("appends audit lines and does not rewrite them", () => {
    const dir = mkdtempSync(join(tmpdir(), "anonymouse-audit-"));
    const path = join(dir, "audit.jsonl");
    const journal = createServerJournal(path);
    journal.appendAudit({
      id: "aud_1",
      ts: 10,
      action: "block",
      rule: "aws_key",
      confidence: 0.97,
      actorHash: "ses_abc",
      channelId: "room_market",
      severity: "high",
      preview: "prod key **** thanks",
      redactedTypes: [],
      piiRedacted: false,
    });
    const first = readFileSync(path, "utf8");
    journal.appendAudit({
      id: "aud_2",
      ts: 11,
      action: "allow",
      rule: "clear",
      confidence: 1,
      actorHash: "ses_abc",
      channelId: "room_market",
      severity: "info",
      preview: "hello",
      redactedTypes: [],
      piiRedacted: false,
    });
    const second = readFileSync(path, "utf8");
    expect(second.startsWith(first.trim())).toBe(true);
    expect(second).not.toContain(SECRET);
    const reloaded = createServerJournal(path);
    expect(reloaded.listAudit().map((entry) => entry.id).sort()).toEqual(["aud_1", "aud_2"]);
  });
});
