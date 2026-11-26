import { describe, expect, it } from "vitest";
import { MOCK_USERS, NEWS_ITEMS, SEED_CHATTERS, SEED_ROOMS } from "@/data/floor";
import { contactViolation } from "@/lib/contact";
import { createMemoryJournal } from "@/moderation/journal";
import { NOTICE } from "@/moderation/notices";
import { enforceSync, evaluate, evaluateAsync, previewOf } from "@/moderation/pipeline";
import { createRateStore } from "@/moderation/rate";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function textAttachment(contents: string, name = "note.txt", mime = "text/plain") {
  const bytes = new TextEncoder().encode(contents);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return {
    name,
    mime,
    size: bytes.length,
    dataUrl: `data:${mime};base64,${btoa(binary)}`,
  };
}

const SECRET = "AKIAIOSFODNN7EXAMPLE";

describe("PII masking", () => {
  it("replaces only the personal detail and reports metadata", () => {
    const cases: Array<[string, string, string]> = [
      ["Ping me at 212-555-0199 after the close", "Ping me at **** after the close", "phone"],
      ["mail jane.doe@gmail.com tonight", "mail **** tonight", "email"],
      ["jane [at] gmail [dot] com", "****", "email"],
      ["find me on t.me/nightowl later", "find me on **** later", "telegram"],
      ["telegram at night_owl", "****", "telegram"],
      ["wechat: night_owl", "****", "wechat"],
      ["wxid_ab12cd is stale", "**** is stale", "wechat"],
      ["trader@bloomberg.net", "****", "bloomberg"],
      ["my bbg id is 8f3a9c21 today", "my **** today", "bloomberg"],
    ];
    for (const [raw, masked, kind] of cases) {
      const result = evaluate({ parts: { body: raw }, channelId: "room_market", actorId: "hum_test" });
      expect(result.action, raw).toBe("redact");
      expect(result.pii_redacted, raw).toBe(true);
      expect(result.redacted_types, raw).toContain(kind);
      expect(result.parts.body, raw).toBe(masked);
      expect(result.notice).toBe(NOTICE.pii);
      expect(JSON.stringify(result.parts), raw).not.toMatch(/212-555-0199|jane\.doe@gmail|t\.me\/nightowl|night_owl|wxid_ab12cd|bloomberg\.net|8f3a9c21/);
    }
  });

  it("keeps ordinary floor copy publishable", () => {
    const lines = [
      ...SEED_CHATTERS.map((line) => line.body),
      ...SEED_ROOMS.flatMap((room) => [room.name, room.blurb]),
      ...MOCK_USERS.map((user) => user.bioQuote),
      ...NEWS_ITEMS.flatMap((item) => [item.url, item.title, item.summary]),
      "The dollar is the tell.",
      "look at the dot com bubble",
      "the host is 10.0.0.1 on the lab net",
      "2024-11-25 is a date, not a number to dial",
    ];
    for (const line of lines) {
      expect(contactViolation(line), line).toBeNull();
      const result = evaluate({ parts: { body: line } });
      expect(result.action, line).toBe("allow");
      expect(result.pii_redacted, line).toBe(false);
      expect(result.parts.body, line).toBe(line);
    }
  });
});

describe("confidential leaks", () => {
  it("blocks the message and alerts without the raw secret", () => {
    const journal = createMemoryJournal();
    const result = enforceSync(
      { parts: { body: `prod key ${SECRET} thanks` }, channelId: "room_market", actorId: "hum_desk" },
      { journal, now: 1_700_000_000_000 },
    );
    expect(result.action).toBe("block");
    expect(result.parts.body).toBe("");
    expect(result.notice).toBe(NOTICE.blocked);
    const alerts = journal.listAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.severity).toBe("high");
    expect(alerts[0]?.channelId).toBe("room_market");
    expect(alerts[0]?.reason).toBe("Confidential leak");
    expect(alerts[0]?.preview).toContain("****");
    expect(alerts[0]?.preview).not.toContain(SECRET);
    const blob = JSON.stringify({ alerts, audit: journal.listAudit(), result });
    expect(blob).not.toContain(SECRET);
    expect(blob).not.toContain("hum_desk");
    expect(alerts[0]?.actorHash.startsWith("ses_")).toBe(true);
  });

  it("does not publish an attachment that contains a credential", () => {
    const file = textAttachment(`token ${SECRET}`, "secret.txt");
    const result = evaluate({ parts: { body: "notes" }, attachment: file, channelId: "thread_1" });
    expect(result.action).toBe("block");
    expect(result.attachmentAllowed).toBe(false);
    expect(JSON.stringify(result)).not.toContain(SECRET);
    expect(JSON.stringify(result)).not.toContain(file.dataUrl);
  });
});

describe("adult content and attachment scanning", () => {
  it("blocks explicit text and keeps the phrase out of the preview", () => {
    const result = evaluate({ parts: { body: "please send explicit porn now" }, channelId: "room_night" });
    expect(result.action).toBe("block");
    expect(result.rule).toBe("adult_content");
    expect(result.notice).toBe(NOTICE.blocked);
    expect(result.preview).not.toMatch(/porn/i);
    expect(JSON.stringify(result.parts)).not.toMatch(/porn/i);
  });

  it("blocks an attachment whose text is explicit", () => {
    const file = textAttachment("explicit porn in the upload", "pic.txt");
    const result = evaluate({ parts: { body: "file" }, attachment: file });
    expect(result.action).toBe("block");
    expect(result.notice).toBe(NOTICE.attachmentBlocked);
    expect(result.attachmentAllowed).toBe(false);
    expect(JSON.stringify(result)).not.toContain(file.dataUrl);
    expect(result.preview).not.toMatch(/porn/i);
  });

  it("quarantines when the attachment scanner times out", async () => {
    const file = {
      name: "chart.png",
      mime: "image/png",
      size: 68,
      dataUrl: PNG,
    };
    const result = await evaluateAsync(
      { parts: { body: "desk chart" }, attachment: file, channelId: "room_market" },
      { scanner: () => new Promise(() => {}), scanTimeoutMs: 20 },
    );
    expect(result.action).toBe("quarantine");
    expect(result.rule).toBe("scanner_timeout");
    expect(result.attachmentAllowed).toBe(false);
    expect(result.notice).toBe(NOTICE.held);
    expect(JSON.stringify(result)).not.toContain(PNG.slice(40));
  });

  it("quarantines a file whose bytes do not match the declared type", () => {
    const file = textAttachment("hello from a renamed file", "photo.png", "image/png");
    const result = evaluate({ parts: { body: "pic" }, attachment: file });
    expect(result.action).toBe("quarantine");
    expect(result.rule).toBe("mime_mismatch");
    expect(result.attachmentAllowed).toBe(false);
  });

  it("withholds sexual content that appears to involve a minor", () => {
    const marker = "MINORMARKER8841";
    const file = textAttachment(`underage porn ${marker}`, "bad.txt");
    const result = evaluate({ parts: { body: "see file" }, attachment: file, channelId: "room_1", actorId: "hum_x" });
    expect(result.action).toBe("block");
    expect(result.severity).toBe("critical");
    expect(result.rule).toBe("minor_safety");
    expect(result.preview).toBe("[withheld]");
    expect(result.withhold).toBe(true);
    const blob = JSON.stringify(result);
    expect(blob).not.toContain(marker);
    expect(blob).not.toContain(file.dataUrl);
    expect(blob).not.toMatch(/porn/i);
  });
});

describe("audit and escalation", () => {
  it("appends an immutable audit row and an escalation hook", () => {
    const journal = createMemoryJournal();
    const rate = createRateStore();
    const policy = { maxPerWindow: 40, windowMs: 60_000, strikeLimit: 2, strikeWindowMs: 60_000, cooldownMs: 60_000 };
    const leak = (n: number) =>
      enforceSync(
        { parts: { body: `key ${SECRET} ${n}` }, channelId: "thread_a", actorId: "hum_repeat" },
        { journal, rate, policy, now: 1_700_000_000_000 + n },
      );
    expect(leak(1).action).toBe("block");
    expect(leak(2).action).toBe("block");
    const audit = journal.listAudit();
    expect(audit.some((entry) => entry.action === "escalate" && entry.rule === "repeat_offender")).toBe(true);
    expect(audit.some((entry) => entry.action === "block")).toBe(true);
    expect(JSON.stringify(audit)).not.toContain(SECRET);
    const before = audit.length;
    const paused = enforceSync(
      { parts: { body: "ordinary follow up" }, channelId: "thread_a", actorId: "hum_repeat" },
      { journal, rate, policy, now: 1_700_000_000_500 },
    );
    expect(paused.action).toBe("rate_limit");
    expect(paused.notice).toBe(NOTICE.paused);
    expect(journal.listAudit().length).toBeGreaterThan(before);
    expect(previewOf(`key ${SECRET}`)).not.toContain(SECRET);
  });
});
