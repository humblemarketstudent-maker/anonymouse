export type AuditAction =
  | "allow"
  | "redact"
  | "block"
  | "quarantine"
  | "rate_limit"
  | "escalate"
  | "allow_quarantine"
  | "remove_quarantine"
  | "webhook_failed"
  | "webhook_sent";

export interface AuditEntry {
  id: string;
  ts: number;
  action: AuditAction;
  rule: string;
  confidence: number;
  actorHash: string;
  channelId: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  preview: string;
  redactedTypes: string[];
  piiRedacted: boolean;
}

export interface AdminAlert {
  id: string;
  ts: number;
  severity: "high" | "critical";
  channelId: string;
  reason: string;
  rule: string;
  preview: string;
  actorHash: string;
  confidence: number;
}

export interface QuarantineItem {
  id: string;
  ts: number;
  channelId: string;
  actorHash: string;
  rule: string;
  reason: string;
  preview: string;
  name: string;
  mime: string;
  size: number;
  status: "pending" | "allowed" | "removed";
}

interface JournalState {
  audit: AuditEntry[];
  alerts: AdminAlert[];
  quarantine: QuarantineItem[];
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Journal {
  appendAudit(entry: AuditEntry): void;
  listAudit(limit?: number): AuditEntry[];
  appendAlert(alert: AdminAlert): void;
  listAlerts(limit?: number): AdminAlert[];
  appendQuarantine(item: QuarantineItem): void;
  listQuarantine(): QuarantineItem[];
  resolveQuarantine(
    id: string,
    action: "allow" | "remove",
    actorHash: string,
    now: number,
  ): { ok: true } | { ok: false; error: string };
}

export const JOURNAL_KEY = "anonymouse.moderation.v1";

function empty(): JournalState {
  return { audit: [], alerts: [], quarantine: [] };
}

function rid(prefix: string, now: number): string {
  return `${prefix}_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createJournal(storage: KeyValueStore, key = JOURNAL_KEY, retain = 400): Journal {
  function read(): JournalState {
    const raw = storage.getItem(key);
    if (!raw) return empty();
    try {
      const parsed = JSON.parse(raw) as Partial<JournalState>;
      return {
        audit: Array.isArray(parsed.audit) ? parsed.audit : [],
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
        quarantine: Array.isArray(parsed.quarantine) ? parsed.quarantine : [],
      };
    } catch {
      return empty();
    }
  }

  function write(state: JournalState) {
    const next: JournalState =
      retain > 0
        ? {
            audit: state.audit.slice(-retain),
            alerts: state.alerts.slice(-Math.min(retain, 200)),
            quarantine: state.quarantine.slice(-Math.min(retain, 200)),
          }
        : state;
    storage.setItem(key, JSON.stringify(next));
  }

  return {
    appendAudit(entry) {
      const state = read();
      state.audit.push(entry);
      write(state);
    },
    listAudit(limit = 200) {
      const audit = read().audit;
      return audit.slice(-limit).reverse();
    },
    appendAlert(alert) {
      const state = read();
      state.alerts.push(alert);
      write(state);
    },
    listAlerts(limit = 100) {
      return read().alerts.slice(-limit).reverse();
    },
    appendQuarantine(item) {
      const state = read();
      state.quarantine.push(item);
      write(state);
    },
    listQuarantine() {
      return [...read().quarantine].reverse();
    },
    resolveQuarantine(id, action, actorHash, now) {
      const state = read();
      const item = state.quarantine.find((entry) => entry.id === id);
      if (!item) return { ok: false, error: "That hold is no longer here." };
      if (item.status !== "pending") return { ok: false, error: "That hold was already reviewed." };
      item.status = action === "allow" ? "allowed" : "removed";
      state.audit.push({
        id: rid("aud", now),
        ts: now,
        action: action === "allow" ? "allow_quarantine" : "remove_quarantine",
        rule: item.rule,
        confidence: 1,
        actorHash,
        channelId: item.channelId,
        severity: "info",
        preview: item.preview,
        redactedTypes: [],
        piiRedacted: false,
      });
      write(state);
      return { ok: true };
    },
  };
}

export function createMemoryJournal(retain = 400): Journal {
  const bag = new Map<string, string>();
  return createJournal(
    {
      getItem: (key) => bag.get(key) ?? null,
      setItem: (key, value) => {
        bag.set(key, value);
      },
    },
    JOURNAL_KEY,
    retain,
  );
}
