/**
 * Confidential-leak heuristics. Patterns name the class of secret.
 * Callers must mask matches before anything is logged or shown.
 */

export interface LeakSpan {
  start: number;
  end: number;
  rule: string;
}

const RULES: Array<{ rule: string; pattern: RegExp }> = [
  { rule: "aws_key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { rule: "github_token", pattern: /\b(?:ghp|gho|ghu|ghs)_[A-Za-z0-9]{20,}\b/g },
  { rule: "github_pat", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { rule: "slack_token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
  { rule: "stripe_key", pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { rule: "openai_key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { rule: "private_key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { rule: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}/g },
  { rule: "bearer", pattern: /\bBearer\s+[A-Za-z0-9\-._~+/]{16,}=*/g },
  { rule: "url_credentials", pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]{1,64}:[^/\s@]{1,64}@/gi },
  {
    rule: "internal_url",
    pattern:
      /\bhttps?:\/\/(?:(?:10|127)\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|[\w.-]+\.(?:internal|corp|lan|local))(?::\d{2,5})?(?:\/[^\s]*)?/gi,
  },
  {
    rule: "secret_assignment",
    pattern:
      /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|secret[_-]?key|passwd|password)\b\s*(?::|=|is)\s*['"]?[A-Za-z0-9/+=._~-]{8,}/gi,
  },
  { rule: "iban", pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g },
  {
    rule: "account_number",
    pattern: /\b(?:account|acct|routing|iban|sort code|card)\s*(?:number|no\.?|#)?\s*[:#-]?\s*\d[\d\s-]{6,22}\d/gi,
  },
];

export function findLeaks(text: string): LeakSpan[] {
  const spans: LeakSpan[] = [];
  for (const rule of RULES) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (end > start) spans.push({ start, end, rule: rule.rule });
    }
  }
  return spans;
}

export function hasLeak(text: string): boolean {
  return findLeaks(text).length > 0;
}

export function maskLeaks(text: string): string {
  const spans = [...findLeaks(text)].sort((a, b) => a.start - b.start || b.end - a.end);
  if (spans.length === 0) return text;
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    out += text.slice(cursor, span.start) + "****";
    cursor = span.end;
  }
  return out + text.slice(cursor);
}
