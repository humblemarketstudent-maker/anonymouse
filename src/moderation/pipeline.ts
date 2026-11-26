import { contactViolation } from "../lib/contact";
import { inspectAttachment, type AttachmentInput } from "./attachments";
import { sessionHash } from "./hash";
import type { AdminAlert, AuditEntry, Journal, QuarantineItem } from "./journal";
import { findLeaks, hasLeak, maskLeaks } from "./leaks";
import { NOTICE } from "./notices";
import { hasAdultText, hasMinorSexualText, maskAdultText } from "./nsfw";
import { redactContacts } from "./pii";
import { accountFor, DEFAULT_RATE, type RatePolicy, type RateStore } from "./rate";

export interface TextParts {
  body: string;
  url?: string;
  title?: string;
  summary?: string;
  source?: string;
}

export interface EvaluateInput {
  parts: TextParts;
  attachment?: AttachmentInput | null;
  channelId?: string;
  actorId?: string;
}

export interface Evaluation {
  action: "allow" | "redact" | "block" | "quarantine" | "rate_limit";
  parts: TextParts;
  attachmentAllowed: boolean;
  pii_redacted: boolean;
  redacted_types: string[];
  notice?: string;
  rule: string;
  confidence: number;
  severity: "info" | "low" | "medium" | "high" | "critical";
  preview: string;
  alert: boolean;
  withhold: boolean;
  quarantine?: Omit<QuarantineItem, "id" | "ts" | "channelId" | "actorHash" | "status">;
}

export interface EnforceDeps {
  journal?: Journal;
  rate?: RateStore;
  policy?: RatePolicy;
  now?: number;
  salt?: string;
  stamp?: { pii_redacted?: boolean; redacted_types?: string[] };
  scanner?: (file: AttachmentInput) => Promise<"ok" | "nsfw" | "minor" | "leak">;
  scanTimeoutMs?: number;
}

const EMPTY: TextParts = { body: "" };

function unique(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) if (value && !out.includes(value)) out.push(value);
  return out;
}

function rid(prefix: string, now: number): string {
  return `${prefix}_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function previewOf(text: string, withhold = false): string {
  if (withhold) return "[withheld]";
  const masked = maskAdultText(maskLeaks(redactContacts(text).text)).replace(/\s+/g, " ").trim();
  if (!masked) return "[empty]";
  return masked.length > 120 ? `${masked.slice(0, 119)}…` : masked;
}

export function textIsPublishable(text: string): boolean {
  if (!text) return true;
  if (hasMinorSexualText(text) || hasAdultText(text) || hasLeak(text)) return false;
  return !redactContacts(text).redacted;
}

function joined(parts: TextParts, extra = ""): string {
  return [parts.body, parts.url, parts.title, parts.summary, parts.source, extra].filter(Boolean).join("\n");
}

function safeName(name: string): string {
  const cleaned = (name || "file").replace(/[^\w.\- ]+/g, "").slice(0, 60) || "file";
  return previewOf(cleaned).replace(/…$/, "");
}

function blocked(
  rule: string,
  confidence: number,
  severity: Evaluation["severity"],
  notice: string,
  withhold: boolean,
  source: string,
): Evaluation {
  return {
    action: "block",
    parts: { ...EMPTY },
    attachmentAllowed: false,
    pii_redacted: false,
    redacted_types: [],
    notice,
    rule,
    confidence,
    severity,
    preview: previewOf(source, withhold),
    alert: true,
    withhold,
  };
}

function quarantined(
  input: EvaluateInput,
  rule: string,
  confidence: number,
  source: string,
  severity: Evaluation["severity"] = "medium",
): Evaluation {
  const file = input.attachment;
  return {
    action: "quarantine",
    parts: { ...EMPTY },
    attachmentAllowed: false,
    pii_redacted: false,
    redacted_types: [],
    notice: NOTICE.held,
    rule,
    confidence,
    severity,
    preview: previewOf(source, false),
    alert: true,
    withhold: false,
    quarantine: {
      rule,
      reason: "Pending scan",
      preview: previewOf(source, false),
      name: safeName(file?.name ?? "file"),
      mime: file?.mime ?? "application/octet-stream",
      size: file?.size ?? 0,
    },
  };
}

function publishParts(parts: TextParts): { parts: TextParts; types: string[]; redacted: boolean } {
  const body = redactContacts(parts.body);
  const url = redactContacts(parts.url ?? "");
  const title = redactContacts(parts.title ?? "");
  const summary = redactContacts(parts.summary ?? "");
  const source = redactContacts(parts.source ?? "");
  const types = unique([...body.types, ...url.types, ...title.types, ...summary.types, ...source.types]);
  const redacted = [body, url, title, summary, source].some((part) => part.redacted);
  const linkTouched = url.redacted || title.redacted || summary.redacted || source.redacted;
  const linkSafe = /^https?:\/\//i.test(url.text) && !contactViolation([url.text, title.text, summary.text, source.text].join("\n"));
  if ((parts.url && !linkSafe) || linkTouched) {
    const nextBody = body.text.trim() ? body.text : url.text;
    return { parts: { body: nextBody }, types, redacted: true };
  }
  return {
    parts: {
      body: body.text,
      url: parts.url ? url.text : undefined,
      title: parts.title ? title.text : undefined,
      summary: parts.summary ? summary.text : undefined,
      source: parts.source ? source.text : undefined,
    },
    types,
    redacted,
  };
}

/** Deterministic policy. Does not write logs or count rate. */
export function evaluate(input: EvaluateInput): Evaluation {
  const file = input.attachment ?? undefined;
  const finding = file ? inspectAttachment(file) : undefined;
  const message = joined(input.parts, "");
  if (finding?.status === "block" && finding.kind === "minor") {
    return blocked("minor_safety", finding.confidence, "critical", NOTICE.blocked, true, "");
  }
  if (hasMinorSexualText(message)) {
    return blocked("minor_safety", 0.99, "critical", NOTICE.blocked, true, "");
  }
  if (finding?.status === "block" && finding.kind === "adult") {
    return blocked("adult_content", finding.confidence, "high", NOTICE.attachmentBlocked, false, finding.excerpt);
  }
  if (hasAdultText(message)) {
    return blocked("adult_content", 0.88, "high", NOTICE.blocked, false, message);
  }
  if (finding?.status === "block" && finding.kind === "leak") {
    return blocked(finding.rule, finding.confidence, "high", NOTICE.attachmentBlocked, false, finding.excerpt);
  }
  const leaks = findLeaks(message);
  if (leaks.length > 0) {
    return blocked(leaks[0]?.rule ?? "secret", 0.97, "high", NOTICE.blocked, false, message);
  }
  if (finding?.status === "block" && finding.kind === "pii") {
    return blocked("attachment_pii", finding.confidence, "medium", NOTICE.attachmentBlocked, false, finding.excerpt);
  }
  if (finding?.status === "quarantine") {
    return quarantined(input, finding.rule, finding.confidence, finding.excerpt);
  }
  const published = publishParts(input.parts);
  if (published.redacted) {
    const previewSource = joined(published.parts);
    return {
      action: "redact",
      parts: published.parts,
      attachmentAllowed: !file || finding?.status === "clear",
      pii_redacted: true,
      redacted_types: published.types,
      notice: NOTICE.pii,
      rule: "pii",
      confidence: 0.93,
      severity: "low",
      preview: previewOf(previewSource),
      alert: false,
      withhold: false,
    };
  }
  return {
    action: "allow",
    parts: published.parts,
    attachmentAllowed: !file || finding?.status === "clear",
    pii_redacted: false,
    redacted_types: [],
    rule: "clear",
    confidence: 0.99,
    severity: "info",
    preview: previewOf(joined(published.parts)),
    alert: false,
    withhold: false,
  };
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("scan failed"));
      },
    );
  });
}

/** Deterministic result, plus an optional scanner. A scanner failure quarantines attachments. */
export async function evaluateAsync(input: EvaluateInput, deps: EnforceDeps = {}): Promise<Evaluation> {
  const sync = evaluate(input);
  if (!input.attachment || !deps.scanner) return sync;
  if (sync.action === "block" && sync.severity === "critical") return sync;
  if (sync.action === "block") return sync;
  try {
    const verdict = await withTimeout(deps.scanner(input.attachment), deps.scanTimeoutMs ?? 4000);
    if (verdict === "ok") return sync;
    if (verdict === "minor") return blocked("minor_safety", 0.99, "critical", NOTICE.blocked, true, "");
    if (verdict === "leak") return blocked("scanner_leak", 0.9, "high", NOTICE.attachmentBlocked, false, input.parts.body);
    return blocked("adult_content", 0.86, "high", NOTICE.attachmentBlocked, false, input.parts.body);
  } catch {
    return quarantined(input, "scanner_timeout", 1, input.parts.body, "high");
  }
}

export function applyStamp(evaluation: Evaluation, stamp?: EnforceDeps["stamp"]): Evaluation {
  if (!stamp?.pii_redacted) return evaluation;
  if (evaluation.action === "block" || evaluation.action === "quarantine" || evaluation.action === "rate_limit") return evaluation;
  return {
    ...evaluation,
    action: "redact",
    pii_redacted: true,
    redacted_types: unique([...(evaluation.redacted_types ?? []), ...(stamp.redacted_types ?? [])]),
    notice: evaluation.notice ?? NOTICE.pii,
    rule: evaluation.rule === "clear" ? "pii" : evaluation.rule,
    severity: evaluation.severity === "info" ? "low" : evaluation.severity,
  };
}

function reasonFor(rule: string): string {
  if (rule === "minor_safety") return "Safety hold";
  if (rule === "adult_content") return "Adult content";
  if (rule === "attachment_pii" || rule === "pii") return "Personal details";
  if (rule === "scanner_timeout" || rule === "mime_mismatch" || rule === "video_frames_unverified" || rule === "unreadable_attachment") {
    return "Pending scan";
  }
  return "Confidential leak";
}

export function recordDecision(evaluation: Evaluation, input: EvaluateInput, deps: EnforceDeps, now: number) {
  if (!deps.journal) return;
  const actorHash = sessionHash(input.actorId || "anonymous", deps.salt ?? "");
  const channelId = input.channelId || "unknown";
  const entry: AuditEntry = {
    id: rid("aud", now),
    ts: now,
    action: evaluation.action,
    rule: evaluation.rule,
    confidence: evaluation.confidence,
    actorHash,
    channelId,
    severity: evaluation.severity,
    preview: evaluation.preview,
    redactedTypes: evaluation.redacted_types,
    piiRedacted: evaluation.pii_redacted,
  };
  deps.journal.appendAudit(entry);
  if (evaluation.alert && (evaluation.severity === "high" || evaluation.severity === "critical")) {
    const alert: AdminAlert = {
      id: rid("alt", now),
      ts: now,
      severity: evaluation.severity,
      channelId,
      reason: reasonFor(evaluation.rule),
      rule: evaluation.rule,
      preview: evaluation.preview,
      actorHash,
      confidence: evaluation.confidence,
    };
    deps.journal.appendAlert(alert);
  }
  if (evaluation.action === "quarantine" && evaluation.quarantine) {
    const item: QuarantineItem = {
      id: rid("qrn", now),
      ts: now,
      channelId,
      actorHash,
      status: "pending",
      ...evaluation.quarantine,
    };
    deps.journal.appendQuarantine(item);
  }
}

export function commit(evaluation: Evaluation, input: EvaluateInput, deps: EnforceDeps = {}): Evaluation {
  const now = deps.now ?? Date.now();
  let next = applyStamp(evaluation, deps.stamp);
  if (!deps.rate) {
    recordDecision(next, input, deps, now);
    return next;
  }
  const actorHash = sessionHash(input.actorId || "anonymous", deps.salt ?? "");
  const rate = accountFor(deps.rate, actorHash, next.action, now, deps.policy ?? DEFAULT_RATE);
  if (rate.limited && (next.action === "allow" || next.action === "redact")) {
    next = {
      ...next,
      action: "rate_limit",
      attachmentAllowed: false,
      parts: { ...EMPTY },
      notice: NOTICE.paused,
      rule: "rate_limit",
      confidence: 1,
      severity: "medium",
      preview: "[paused]",
      alert: false,
      withhold: false,
    };
  }
  recordDecision(next, input, deps, now);
  if (rate.escalated && deps.journal) {
    deps.journal.appendAudit({
      id: rid("aud", now),
      ts: now,
      action: "escalate",
      rule: "repeat_offender",
      confidence: 1,
      actorHash,
      channelId: input.channelId || "unknown",
      severity: "high",
      preview: "[cooldown]",
      redactedTypes: [],
      piiRedacted: false,
    });
  }
  return next;
}

export async function enforce(input: EvaluateInput, deps: EnforceDeps = {}): Promise<Evaluation> {
  return commit(await evaluateAsync(input, deps), input, deps);
}

export function enforceSync(input: EvaluateInput, deps: Omit<EnforceDeps, "scanner" | "scanTimeoutMs"> = {}): Evaluation {
  return commit(evaluate(input), input, deps);
}
