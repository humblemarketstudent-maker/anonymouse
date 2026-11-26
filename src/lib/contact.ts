/**
 * Detects personal contact details in rooms and private messages.
 * Catches common formats and light obfuscation without flagging ordinary chat.
 * Span offsets refer to the folded string from `foldContact`.
 */

export type ContactKind = "phone" | "email" | "bloomberg" | "telegram" | "wechat";

export const CONTACT_BLOCKED =
  "Personal contact details aren't allowed. Phone numbers, email addresses, Bloomberg IDs, and Telegram handles can't be sent.";

export interface ContactSpan {
  start: number;
  end: number;
  type: ContactKind;
}

const TLDS = new Set([
  "com", "net", "org", "edu", "gov", "io", "co", "uk", "us", "me", "app", "dev",
  "info", "biz", "xyz", "ai", "gg", "tv", "cc", "ly", "gl", "to", "fm", "de",
  "fr", "jp", "cn", "in", "au", "ca", "br", "nl", "se", "ch", "it", "es", "ru",
  "kr", "sg", "hk", "ie", "nz", "za", "mx", "pl", "be", "eu", "pro", "tech",
  "chat", "link", "social", "email", "nyc", "finance", "id", "ph", "ng", "ae",
  "sa", "il", "tr", "ua", "cz", "at", "dk", "no", "fi", "pt", "ar", "cl", "pe",
  "th", "vn", "my", "pk", "bd", "tw", "kr", "za",
]);

const MAILBOXES = new Set([
  "gmail", "googlemail", "outlook", "hotmail", "live", "yahoo", "ymail", "icloud",
  "proton", "protonmail", "pm", "aol", "msn", "bloomberg", "gmx", "yandex",
  "fastmail", "hey", "zoho", "tutanota", "tuta", "mail", "qq", "inbox",
]);

/** Words that follow "at" in normal sentences, not mailbox names. */
const STOP_DOMAINS = new Set([
  "the", "a", "an", "noon", "midnight", "home", "work", "desk", "open", "close",
  "market", "my", "your", "our", "this", "that", "it", "me", "you", "him", "her",
  "them", "us", "some", "any", "no", "not", "one", "once", "night", "day", "today",
  "tomorrow", "least", "most", "best", "worst", "all", "its", "his", "their",
  "down", "up", "app", "apps", "banned", "closed", "message", "messages",
]);

const KIND_ORDER: ContactKind[] = ["bloomberg", "telegram", "email", "wechat", "phone"];

export function foldContact(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\uFF20/g, "@");
}

function isTld(label: string): boolean {
  return TLDS.has(label.toLowerCase());
}

function pushSpan(spans: ContactSpan[], type: ContactKind, start: number, end: number) {
  if (end > start) spans.push({ type, start, end });
}

function bloombergSpans(text: string): ContactSpan[] {
  const spans: ContactSpan[] = [];
  for (const match of text.matchAll(/bloomberg\.net/gi)) {
    const start = match.index ?? 0;
    pushSpan(spans, "bloomberg", start, start + match[0].length);
  }
  for (const match of text.matchAll(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi)) {
    const start = match.index ?? 0;
    pushSpan(spans, "bloomberg", start, start + match[0].length);
  }
  const labeled =
    /\b(?:bloomberg|bbg)\s+(?:id|uuid|handle|messenger|chat)\b(?:\s+is)?\s*([:#-])?\s*([a-z0-9][a-z0-9._-]{3,})/gi;
  for (const match of text.matchAll(labeled)) {
    const token = match[2] ?? "";
    if (STOP_DOMAINS.has(token.toLowerCase())) continue;
    if (!match[1] && !/\d/.test(token)) continue;
    const start = match.index ?? 0;
    pushSpan(spans, "bloomberg", start, start + match[0].length);
  }
  return spans;
}

function telegramSpans(text: string): ContactSpan[] {
  const spans: ContactSpan[] = [];
  for (const match of text.matchAll(/\btg:\/\/\S*/gi)) {
    const start = match.index ?? 0;
    pushSpan(spans, "telegram", start, start + match[0].length);
  }
  const links =
    /(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/[a-z0-9_]{4,}/gi;
  for (const match of text.matchAll(links)) {
    const start = match.index ?? 0;
    pushSpan(spans, "telegram", start, start + match[0].length);
  }
  const dotted =
    /\b(?:t|telegram)\s*(?:\.|\bdot\b)\s*(?:me|dog)\s*\/\s*[a-z0-9_]{4,}/gi;
  for (const match of text.matchAll(dotted)) {
    const start = match.index ?? 0;
    pushSpan(spans, "telegram", start, start + match[0].length);
  }
  const handles = /(^|[^a-z0-9._%+-])(@[a-z][a-z0-9_]{4,31})(?![a-z0-9._])/gi;
  for (const match of text.matchAll(handles)) {
    const handle = match[2] ?? "";
    const start = (match.index ?? 0) + match[0].length - handle.length;
    pushSpan(spans, "telegram", start, start + handle.length);
  }
  const spoken = /\b(?:telegram|tgid)\s+(?:id|handle|at)\s+@?([a-z0-9][a-z0-9_]{4,31})\b/gi;
  for (const match of text.matchAll(spoken)) {
    const token = (match[1] ?? "").toLowerCase();
    if (!token || STOP_DOMAINS.has(token)) continue;
    const start = match.index ?? 0;
    pushSpan(spans, "telegram", start, start + match[0].length);
  }
  for (const match of text.matchAll(/\btgid\s*[:：]\s*@?[a-z][a-z0-9_]{4,31}\b/gi)) {
    const start = match.index ?? 0;
    pushSpan(spans, "telegram", start, start + match[0].length);
  }
  const numeric = /\b(?:tgid|tg\s*id|telegram\s*id)\s*[:#]?\s*\d{6,}\b/gi;
  for (const match of text.matchAll(numeric)) {
    const start = match.index ?? 0;
    pushSpan(spans, "telegram", start, start + match[0].length);
  }
  return spans;
}

function emailSpans(text: string): ContactSpan[] {
  const spans: ContactSpan[] = [];
  const standard =
    /\b[a-z0-9][a-z0-9._%+-]{0,63}\s*@\s*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\s*\.\s*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)*\s*\.\s*([a-z]{2,24})\b/gi;
  for (const match of text.matchAll(standard)) {
    const tld = match[1];
    if (!tld || !isTld(tld)) continue;
    const start = match.index ?? 0;
    pushSpan(spans, "email", start, start + match[0].length);
  }
  const wrapped =
    /\b[a-z0-9][a-z0-9._%+-]{0,63}\s*(?:\(\s*at\s*\)|\[\s*at\s*\]|\{\s*at\s*\})\s*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\s*(?:\.|\(\s*dot\s*\)|\[\s*dot\s*\]|\{\s*dot\s*\}|\bdot\b)\s*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+/gi;
  for (const match of text.matchAll(wrapped)) {
    const labels = match[0].split(/\s*(?:\.|\(\s*dot\s*\)|\[\s*dot\s*\]|\{\s*dot\s*\}|\bdot\b)\s*/i);
    const tld = labels[labels.length - 1]?.replace(/[^a-z]/gi, "");
    if (!tld || !isTld(tld)) continue;
    const start = match.index ?? 0;
    pushSpan(spans, "email", start, start + match[0].length);
  }
  const dotted =
    /\b([a-z0-9][a-z0-9._%+-]{0,63})\s+(?:@|\bat\b)\s+([a-z0-9][a-z0-9-]{0,62})((?:\s+\bdot\b\s+[a-z0-9][a-z0-9-]{0,62})+)/gi;
  for (const match of text.matchAll(dotted)) {
    const domain = match[2]?.toLowerCase() ?? "";
    if (STOP_DOMAINS.has(domain)) continue;
    const tail = match[3] ?? "";
    const labels = tail.split(/\s+\bdot\b\s+/i).filter(Boolean);
    const tld = labels[labels.length - 1]?.toLowerCase() ?? "";
    if (!isTld(tld)) continue;
    const start = match.index ?? 0;
    pushSpan(spans, "email", start, start + match[0].length);
  }
  const mailbox =
    /\b[a-z0-9][a-z0-9._%+-]{0,63}\s+\bat\b\s+([a-z0-9][a-z0-9-]{0,62})\s*(?:\.|\bdot\b)\s*([a-z]{2,24})\b/gi;
  for (const match of text.matchAll(mailbox)) {
    const domain = match[1]?.toLowerCase() ?? "";
    const tld = match[2]?.toLowerCase() ?? "";
    if (STOP_DOMAINS.has(domain)) continue;
    if (!MAILBOXES.has(domain) || !isTld(tld)) continue;
    const start = match.index ?? 0;
    pushSpan(spans, "email", start, start + match[0].length);
  }
  return spans;
}

function digitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

function isDateToken(token: string): boolean {
  return /^(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])$/.test(token);
}

function isIpv4(token: string): boolean {
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(token)) return false;
  return token.split(".").every((part) => Number(part) <= 255);
}

function tightenPhone(text: string, start: number, end: number): [number, number] {
  const slice = text.slice(start, end);
  const tel = slice.toLowerCase().startsWith("tel:");
  if (!tel) {
    while (start < end && !/[\d+]/.test(text[start] ?? "")) start += 1;
  }
  while (end > start && !/\d/.test(text[end - 1] ?? "")) end -= 1;
  return [start, end];
}

function phoneSpans(text: string): ContactSpan[] {
  const spans: ContactSpan[] = [];
  const patterns = [
    /\btel:\s*\+?\d[\d\s().-]*/gi,
    /(?:^|[^\w])(?:\+|00)(?:[\s().-]*\d){8,15}(?!\d)/g,
    /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?!\d)/g,
    /(?<!\d)\d{10,15}(?!\d)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const rawStart = match.index ?? 0;
      const [start, end] = tightenPhone(text, rawStart, rawStart + match[0].length);
      pushSpan(spans, "phone", start, end);
    }
  }
  const grouped = /(?<!\d)(?:\d{1,4}[\s.-]){2,14}\d{1,4}(?!\d)/g;
  for (const match of text.matchAll(grouped)) {
    const token = match[0];
    const digits = digitCount(token);
    if (digits < 8 || digits > 15) continue;
    if (isDateToken(token) || isIpv4(token)) continue;
    const parts = token.split(/[\s.-]+/).filter(Boolean);
    const allSingle = parts.every((part) => part.length === 1);
    const onlyDots = /^[\d.]+$/.test(token);
    if (allSingle && onlyDots) continue;
    if (allSingle && digits < 10) continue;
    const start = match.index ?? 0;
    pushSpan(spans, "phone", start, start + token.length);
  }
  return spans;
}

function wechatSpans(text: string): ContactSpan[] {
  const spans: ContactSpan[] = [];
  for (const match of text.matchAll(/\bwxid_[a-z0-9_-]{4,32}\b/gi)) {
    const start = match.index ?? 0;
    pushSpan(spans, "wechat", start, start + match[0].length);
  }
  const labeled =
    /\b(?:wechat|weixin|微信)\s*(?:id|handle)?\s*[:：]\s*[a-z0-9][a-z0-9_-]{3,31}\b/gi;
  for (const match of text.matchAll(labeled)) {
    const start = match.index ?? 0;
    pushSpan(spans, "wechat", start, start + match[0].length);
  }
  const spoken =
    /\b(?:wechat|weixin)\s+(?:id|handle|at)\s+[a-z0-9][a-z0-9_-]{3,31}\b/gi;
  for (const match of text.matchAll(spoken)) {
    const token = match[0].split(/\s+/).pop()?.toLowerCase() ?? "";
    if (!token || STOP_DOMAINS.has(token)) continue;
    const start = match.index ?? 0;
    pushSpan(spans, "wechat", start, start + match[0].length);
  }
  return spans;
}

/** Every contact span in the folded text. Ordinary chat returns an empty list. */
export function findContactSpans(text: string): ContactSpan[] {
  const source = foldContact(text);
  if (!source.trim()) return [];
  return [
    ...bloombergSpans(source),
    ...telegramSpans(source),
    ...emailSpans(source),
    ...wechatSpans(source),
    ...phoneSpans(source),
  ];
}

/** Returns which kind of contact detail is present, or null when the text is ordinary chat. */
export function contactViolation(text: string): ContactKind | null {
  const spans = findContactSpans(text);
  for (const kind of KIND_ORDER) {
    if (spans.some((span) => span.type === kind)) return kind;
  }
  return null;
}
