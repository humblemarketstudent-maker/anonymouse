import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { createMemoryJournal, type AuditEntry, type Journal } from "../src/moderation/journal.ts";

type Line =
  | { type: "audit"; entry: AuditEntry }
  | { type: "alert"; entry: Parameters<Journal["appendAlert"]>[0] }
  | { type: "quarantine"; entry: Parameters<Journal["appendQuarantine"]>[0] }
  | { type: "resolve"; id: string; action: "allow" | "remove"; actorHash: string; now: number };

/**
 * In-memory journal plus an optional append-only JSONL file.
 * Lines are never rewritten. The browser mirror is allowed to trim;
 * this file is the durable log when MODERATION_AUDIT_PATH is set.
 */
export function createServerJournal(auditPath = ""): Journal {
  const memory = createMemoryJournal(0);
  if (!auditPath) return memory;
  mkdirSync(dirname(auditPath), { recursive: true });
  if (existsSync(auditPath)) {
    const raw = readFileSync(auditPath, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as Line;
        if (parsed.type === "audit") memory.appendAudit(parsed.entry);
        else if (parsed.type === "alert") memory.appendAlert(parsed.entry);
        else if (parsed.type === "quarantine") memory.appendQuarantine(parsed.entry);
        else if (parsed.type === "resolve") memory.resolveQuarantine(parsed.id, parsed.action, parsed.actorHash, parsed.now);
      } catch {
        // Skip a torn line. Do not rewrite the file.
      }
    }
  }

  function append(line: Line) {
    appendFileSync(auditPath, `${JSON.stringify(line)}\n`, "utf8");
  }

  return {
    appendAudit(entry) {
      memory.appendAudit(entry);
      append({ type: "audit", entry });
    },
    listAudit(limit) {
      return memory.listAudit(limit);
    },
    appendAlert(entry) {
      memory.appendAlert(entry);
      append({ type: "alert", entry });
    },
    listAlerts(limit) {
      return memory.listAlerts(limit);
    },
    appendQuarantine(entry) {
      memory.appendQuarantine(entry);
      append({ type: "quarantine", entry });
    },
    listQuarantine() {
      return memory.listQuarantine();
    },
    resolveQuarantine(id, action, actorHash, now) {
      const result = memory.resolveQuarantine(id, action, actorHash, now);
      if (result.ok) append({ type: "resolve", id, action, actorHash, now });
      return result;
    },
  };
}
