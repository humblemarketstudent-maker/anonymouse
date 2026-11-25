import type { ChatAttachment, NewsLink } from "@/backend/types";
import { CONTACT_BLOCKED, contactViolation } from "@/lib/contact";
import { previewFromUrl } from "@/lib/news";

export interface OutgoingDraft {
  body: string;
  news?: NewsLink;
  attachment?: ChatAttachment;
}

/**
 * Composer payload for a room line or a private message.
 * Contact details in the caption or in the URL itself block the whole send.
 */
export function buildOutgoing(input: {
  body: string;
  url: string;
  linkOpen: boolean;
  attachment?: ChatAttachment;
  maxLength: number;
  lengthError: string;
}): OutgoingDraft | { error: string } {
  const caption = input.body.trim();
  const url = input.linkOpen ? input.url.trim() : "";
  const haystack = [caption, url].filter(Boolean).join("\n");
  if (contactViolation(haystack)) return { error: CONTACT_BLOCKED };
  if (/^(mailto:|tel:)/i.test(url)) return { error: CONTACT_BLOCKED };

  let body = caption;
  let news: NewsLink | undefined;
  if (url) {
    news = previewFromUrl(url, caption) ?? undefined;
    if (!news) return { error: "Paste a full http(s) link." };
    if (contactViolation([news.url, news.title, news.summary].join("\n"))) return { error: CONTACT_BLOCKED };
  } else if (/^https?:\/\/\S+$/.test(caption)) {
    news = previewFromUrl(caption) ?? undefined;
    if (!news) return { error: "That link doesn't look usable." };
    if (contactViolation([news.url, news.title, news.summary].join("\n"))) return { error: CONTACT_BLOCKED };
    body = "";
  }

  if (body.length > input.maxLength) return { error: input.lengthError };
  if (!body && !news && !input.attachment) return { error: "Write a message, attach a file, or share a link." };
  return { body, news, attachment: input.attachment };
}
