import type { ChatAttachment } from "@/backend/types";

/** Raw file cap. Data URLs are larger, and the mock store lives in localStorage. */
export const ATTACHMENT_MAX_BYTES = 450 * 1024;

export const ATTACHMENT_TOO_BIG = "That file is too large. Keep attachments under 450 KB.";
export const ATTACHMENT_TYPE =
  "Attach an image (JPG, PNG, GIF, WebP) or a document (PDF, text, Word, Excel, PowerPoint).";
export const ATTACHMENT_EMPTY = "That file is empty.";
export const ATTACHMENT_UNREADABLE = "That file couldn't be read.";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const ALLOWED = new Set(Object.values(MIME_BY_EXT));

export const ATTACHMENT_ACCEPT = Object.keys(MIME_BY_EXT)
  .map((ext) => `.${ext}`)
  .join(",");

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "";
}

export function normalizeMime(name: string, type: string): string {
  const raw = type.toLowerCase().split(";")[0]?.trim() ?? "";
  if (raw === "image/jpg") return "image/jpeg";
  if (ALLOWED.has(raw)) return raw;
  return mimeFromName(name);
}

function decodedBytes(dataUrl: string): number | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const body = dataUrl.slice(comma + 1).replace(/\s/g, "");
  if (!body || !/^[A-Za-z0-9+/]+=*$/.test(body)) return null;
  const pad = body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0;
  return Math.floor((body.length * 3) / 4) - pad;
}

export function validateAttachment(file: ChatAttachment): string | null {
  const name = file.name.trim();
  if (!name || name.length > 180) return ATTACHMENT_UNREADABLE;
  const mime = normalizeMime(name, file.mime);
  if (!ALLOWED.has(mime)) return ATTACHMENT_TYPE;
  if (file.size <= 0) return ATTACHMENT_EMPTY;
  if (file.size > ATTACHMENT_MAX_BYTES) return ATTACHMENT_TOO_BIG;
  if (!file.dataUrl.startsWith(`data:${mime};base64,`)) return ATTACHMENT_UNREADABLE;
  const bytes = decodedBytes(file.dataUrl);
  if (bytes == null || bytes <= 0) return ATTACHMENT_UNREADABLE;
  if (bytes > ATTACHMENT_MAX_BYTES) return ATTACHMENT_TOO_BIG;
  if (Math.abs(bytes - file.size) > 8) return ATTACHMENT_UNREADABLE;
  return null;
}

export function attachmentPreview(file: ChatAttachment): string {
  return isImageMime(file.mime) ? "Photo" : file.name;
}

export async function readAttachment(file: File): Promise<{ ok: true; attachment: ChatAttachment } | { ok: false; error: string }> {
  const mime = normalizeMime(file.name, file.type);
  if (!ALLOWED.has(mime)) return { ok: false, error: ATTACHMENT_TYPE };
  if (file.size <= 0) return { ok: false, error: ATTACHMENT_EMPTY };
  if (file.size > ATTACHMENT_MAX_BYTES) return { ok: false, error: ATTACHMENT_TOO_BIG };
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, error: ATTACHMENT_UNREADABLE };
  }
  if (bytes.byteLength > ATTACHMENT_MAX_BYTES) return { ok: false, error: ATTACHMENT_TOO_BIG };
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  const attachment: ChatAttachment = {
    name: file.name.trim().slice(0, 180) || "file",
    mime,
    size: bytes.byteLength,
    dataUrl: `data:${mime};base64,${btoa(binary)}`,
  };
  const error = validateAttachment(attachment);
  if (error) return { ok: false, error };
  return { ok: true, attachment };
}
