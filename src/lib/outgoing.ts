import type { ChatAttachment, NewsLink } from "@/backend/types";
import { contactViolation } from "@/lib/contact";
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
  if (/^(mailto:|tel:)/i.test(url)) {
    const body = [caption, url].filter(Boolean).join("\n");
    if (body.length > input.maxLength) return { error: input.lengthError };
    if (!body && !input.attachment) return { error: "Write a message, attach a file, or share a link." };
    return { body, attachment: input.attachment };
  }

  let body = caption;
  let news: NewsLink | undefined;
  const unsafe = (value: string) => contactViolation(value) != null;
  if (url) {
    if (unsafe(url) || unsafe(caption)) {
      body = [caption, url].filter(Boolean).join("\n");
    } else {
      news = previewFromUrl(url, caption) ?? undefined;
      if (!news) return { error: "Paste a full http(s) link." };
      if (unsafe([news.url, news.title, news.summary, news.source].join("\n"))) {
        body = [caption, url].filter(Boolean).join("\n");
        news = undefined;
      }
    }
  } else if (/^https?:\/\/\S+$/.test(caption)) {
    if (unsafe(caption)) {
      body = caption;
    } else {
      news = previewFromUrl(caption) ?? undefined;
      if (!news) return { error: "That link doesn't look usable." };
      if (unsafe([news.url, news.title, news.summary, news.source].join("\n"))) {
        body = caption;
        news = undefined;
      } else {
        body = "";
      }
    }
  }

  if (body.length > input.maxLength) return { error: input.lengthError };
  if (!body && !news && !input.attachment) return { error: "Write a message, attach a file, or share a link." };
  return { body, news, attachment: input.attachment };
}
