import { NEWS_ITEMS } from "@/data/floor";
import type { NewsLink } from "@/backend/types";

const OUTLETS: { test: RegExp; name: string }[] = [
  { test: /(^|\.)reuters\.com$/, name: "Reuters" },
  { test: /(^|\.)bloomberg\.com$/, name: "Bloomberg" },
  { test: /(^|\.)ft\.com$/, name: "Financial Times" },
  { test: /(^|\.)wsj\.com$/, name: "WSJ" },
  { test: /(^|\.)cnbc\.com$/, name: "CNBC" },
  { test: /(^|\.)theinformation\.com$/, name: "The Information" },
  { test: /(^|\.)barrons\.com$/, name: "Barron's" },
  { test: /(^|\.)economist\.com$/, name: "The Economist" },
  { test: /(^|\.)sec\.gov$/, name: "SEC" },
  { test: /(^|\.)federalreserve\.gov$/, name: "Federal Reserve" },
];

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function titleFromPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const slug = parts[parts.length - 1] ?? "";
  const words = decodeURIComponent(slug)
    .replace(/\.\w+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(20\d{2}|\d{6,})\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (words.length < 3) return "";
  return words.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function previewFromUrl(raw: string, take?: string): NewsLink | null {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const known = NEWS_ITEMS.find((item) => item.url === trimmed || item.url === url.href);
  const note = take?.trim();
  if (known) {
    return note ? { ...known, summary: note } : { ...known };
  }

  const source = OUTLETS.find((outlet) => outlet.test.test(url.hostname))?.name ?? url.hostname.replace(/^www\./, "");
  const title = titleFromPath(url.pathname) || `Note from ${source}`;
  return {
    url: url.href,
    source,
    title,
    summary: note || `Shared from ${source}.`,
  };
}
