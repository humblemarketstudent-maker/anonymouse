import { hasLeak } from "./leaks";
import { hasAdultText, hasMinorSexualText } from "./nsfw";
import { redactContacts } from "./pii";

export interface AttachmentInput {
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
}

export type AttachmentFinding =
  | { status: "clear"; excerpt: string }
  | { status: "block"; rule: string; kind: "leak" | "adult" | "minor" | "pii"; excerpt: string; confidence: number }
  | { status: "quarantine"; rule: string; confidence: number; excerpt: string };

const MAGIC: Array<{ mime: string; test: (bytes: Uint8Array) => boolean }> = [
  { mime: "image/jpeg", test: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { mime: "image/png", test: (bytes) => bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  { mime: "image/gif", test: (bytes) => ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a" },
  { mime: "image/webp", test: (bytes) => ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP" },
  { mime: "application/pdf", test: (bytes) => ascii(bytes, 0, 4) === "%PDF" },
];

const ZIP_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  for (let i = 0; i < length && start + i < bytes.length; i += 1) out += String.fromCharCode(bytes[start + i] ?? 0);
  return out;
}

export function decodeDataUrl(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const meta = dataUrl.slice(0, comma);
  if (!meta.startsWith("data:") || !/;base64$/i.test(meta)) return null;
  const body = dataUrl.slice(comma + 1).replace(/\s/g, "");
  if (!body || !/^[A-Za-z0-9+/]+=*$/.test(body)) return null;
  try {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function printableExcerpt(bytes: Uint8Array): string {
  let run = "";
  const parts: string[] = [];
  const limit = Math.min(bytes.length, 80_000);
  for (let i = 0; i < limit; i += 1) {
    const code = bytes[i] ?? 0;
    const printable = code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127);
    if (printable) {
      run += String.fromCharCode(code);
      if (run.length > 400) {
        parts.push(run);
        run = "";
      }
    } else if (run.length >= 4) {
      parts.push(run);
      run = "";
    } else {
      run = "";
    }
    if (parts.join("\n").length > 20_000) break;
  }
  if (run.length >= 4) parts.push(run);
  return parts.join("\n").slice(0, 20_000);
}

function magicMatches(bytes: Uint8Array, mime: string): "match" | "mismatch" | "unchecked" {
  if (mime.startsWith("text/")) {
    const sample = bytes.subarray(0, Math.min(bytes.length, 512));
    let odd = 0;
    for (const byte of sample) {
      if (byte === 0) return "mismatch";
      if (byte < 9 || (byte > 13 && byte < 32)) odd += 1;
    }
    if (sample.length > 0 && odd / sample.length > 0.2) return "mismatch";
    return "match";
  }
  if (ZIP_MIMES.has(mime) || mime === "application/msword" || mime === "application/vnd.ms-excel" || mime === "application/vnd.ms-powerpoint") {
    if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) return "match";
    if (bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf) return "match";
    return "mismatch";
  }
  const known = MAGIC.find((item) => item.mime === mime);
  if (!known) return "unchecked";
  return known.test(bytes) ? "match" : "mismatch";
}

export function inspectAttachment(file: AttachmentInput): AttachmentFinding {
  const name = file.name || "file";
  const mime = file.mime.toLowerCase().split(";")[0]?.trim() || "application/octet-stream";
  const nameHit = `${name}\n${mime}`;
  if (hasMinorSexualText(nameHit)) {
    return { status: "block", rule: "minor_safety", kind: "minor", excerpt: "", confidence: 0.99 };
  }
  if (mime.startsWith("video/")) {
    return { status: "quarantine", rule: "video_frames_unverified", confidence: 0.55, excerpt: "" };
  }
  const bytes = decodeDataUrl(file.dataUrl);
  if (!bytes || bytes.length === 0) {
    return { status: "quarantine", rule: "unreadable_attachment", confidence: 0.7, excerpt: "" };
  }
  const excerpt = printableExcerpt(bytes);
  const haystack = `${name}\n${excerpt}`;
  if (hasMinorSexualText(haystack)) {
    return { status: "block", rule: "minor_safety", kind: "minor", excerpt: "", confidence: 0.99 };
  }
  if (hasAdultText(haystack)) {
    return { status: "block", rule: "adult_content", kind: "adult", excerpt, confidence: 0.9 };
  }
  if (hasLeak(haystack)) {
    return { status: "block", rule: "attachment_secret", kind: "leak", excerpt, confidence: 0.96 };
  }
  if (redactContacts(haystack).redacted) {
    return { status: "block", rule: "attachment_pii", kind: "pii", excerpt, confidence: 0.9 };
  }
  const magic = magicMatches(bytes, mime);
  if (magic === "mismatch") {
    return { status: "quarantine", rule: "mime_mismatch", confidence: 0.84, excerpt };
  }
  return { status: "clear", excerpt };
}
