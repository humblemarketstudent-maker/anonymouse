/**
 * Blocks personal contact details in rooms and private messages.
 * Catches common formats and light obfuscation without flagging ordinary chat.
 */

export type ContactKind = "phone" | "email" | "bloomberg" | "telegram";

export const CONTACT_BLOCKED =
  "Personal contact details aren't allowed. Phone numbers, email addresses, Bloomberg IDs, and Telegram handles can't be sent.";

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
]);

function fold(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\uFF20/g, "@");
}

function isTld(label: string): boolean {
  return TLDS.has(label.toLowerCase());
}

function hasBloomberg(text: string): boolean {
  if (/bloomberg\.net\b/i.test(text)) return true;
  if (/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(text)) return true;
  const labeled =
    /\b(?:bloomberg|bbg)\s+(?:id|uuid|handle|messenger|chat)\b(?:\s+is)?\s*([:#-])?\s*([a-z0-9][a-z0-9._-]{3,})/gi;
  for (const match of text.matchAll(labeled)) {
    const token = match[2] ?? "";
    if (STOP_DOMAINS.has(token.toLowerCase())) continue;
    if (match[1] || /\d/.test(token)) return true;
  }
  return false;
}

function hasTelegram(text: string): boolean {
  if (/\btg:\/\//i.test(text)) return true;
  if (/(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/[a-z0-9_]{4,}/i.test(text)) return true;
  if (/\bt\s*(?:\.|\bdot\b)\s*me\s*\/\s*[a-z0-9_]{4,}/i.test(text)) return true;
  if (/\btelegram\s*(?:\.|\bdot\b)\s*(?:me|dog)\s*\/\s*[a-z0-9_]{4,}/i.test(text)) return true;
  // @handle, but not the domain half of an email (user@gmail.com).
  if (/(^|[^a-z0-9._%+-])@[a-z][a-z0-9_]{4,31}(?![a-z0-9._])/i.test(text)) return true;
  return false;
}

function hasStandardEmail(text: string): boolean {
  const pattern =
    /\b[a-z0-9][a-z0-9._%+-]{0,63}\s*@\s*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\s*\.\s*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)*\s*\.\s*([a-z]{2,24})\b/gi;
  for (const match of text.matchAll(pattern)) {
    const tld = match[1];
    if (tld && isTld(tld)) return true;
  }
  return false;
}

function hasWrappedEmail(text: string): boolean {
  const pattern =
    /\b[a-z0-9][a-z0-9._%+-]{0,63}\s*(?:\(\s*at\s*\)|\[\s*at\s*\]|\{\s*at\s*\})\s*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\s*(?:\.|\(\s*dot\s*\)|\[\s*dot\s*\]|\{\s*dot\s*\}|\bdot\b)\s*[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+/gi;
  for (const match of text.matchAll(pattern)) {
    const labels = match[0].split(/\s*(?:\.|\(\s*dot\s*\)|\[\s*dot\s*\]|\{\s*dot\s*\}|\bdot\b)\s*/i);
    const tld = labels[labels.length - 1]?.replace(/[^a-z]/gi, "");
    if (tld && isTld(tld)) return true;
  }
  return false;
}

function hasWordEmail(text: string): boolean {
  const dotted =
    /\b([a-z0-9][a-z0-9._%+-]{0,63})\s+(?:@|\bat\b)\s+([a-z0-9][a-z0-9-]{0,62})((?:\s+\bdot\b\s+[a-z0-9][a-z0-9-]{0,62})+)/gi;
  for (const match of text.matchAll(dotted)) {
    const domain = match[2]?.toLowerCase() ?? "";
    if (STOP_DOMAINS.has(domain)) continue;
    const tail = match[3] ?? "";
    const labels = tail.split(/\s+\bdot\b\s+/i).filter(Boolean);
    const tld = labels[labels.length - 1]?.toLowerCase() ?? "";
    if (isTld(tld)) return true;
  }

  const mailbox =
    /\b[a-z0-9][a-z0-9._%+-]{0,63}\s+\bat\b\s+([a-z0-9][a-z0-9-]{0,62})\s*(?:\.|\bdot\b)\s*([a-z]{2,24})\b/gi;
  for (const match of text.matchAll(mailbox)) {
    const domain = match[1]?.toLowerCase() ?? "";
    const tld = match[2]?.toLowerCase() ?? "";
    if (STOP_DOMAINS.has(domain)) continue;
    if (MAILBOXES.has(domain) && isTld(tld)) return true;
  }
  return false;
}

function hasEmail(text: string): boolean {
  return hasStandardEmail(text) || hasWrappedEmail(text) || hasWordEmail(text);
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

function hasPhone(text: string): boolean {
  if (/\btel:\s*\+?\d/i.test(text)) return true;
  if (/(?:^|[^\w])(?:\+|00)(?:[\s().-]*\d){8,15}(?!\d)/.test(text)) return true;
  if (/(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?!\d)/.test(text)) return true;
  if (/(?<!\d)\d{10,15}(?!\d)/.test(text)) return true;

  const grouped = text.match(/(?<!\d)(?:\d{1,4}[\s.-]){2,14}\d{1,4}(?!\d)/g) ?? [];
  for (const token of grouped) {
    const digits = digitCount(token);
    if (digits < 8 || digits > 15) continue;
    if (isDateToken(token) || isIpv4(token)) continue;
    const parts = token.split(/[\s.-]+/).filter(Boolean);
    const allSingle = parts.every((part) => part.length === 1);
    const onlyDots = /^[\d.]+$/.test(token);
    if (allSingle && onlyDots) continue;
    if (allSingle && digits < 10) continue;
    return true;
  }
  return false;
}

/** Returns which kind of contact detail is present, or null when the text is ordinary chat. */
export function contactViolation(text: string): ContactKind | null {
  const source = fold(text);
  if (!source.trim()) return null;
  if (hasBloomberg(source)) return "bloomberg";
  if (hasTelegram(source)) return "telegram";
  if (hasEmail(source)) return "email";
  if (hasPhone(source)) return "phone";
  return null;
}
