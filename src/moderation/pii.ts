import { findContactSpans, foldContact, type ContactKind, type ContactSpan } from "../lib/contact";

const MASK = "****";

export interface Redaction {
  text: string;
  types: ContactKind[];
  redacted: boolean;
}

function merge(spans: ContactSpan[]): Array<ContactSpan & { types: ContactKind[] }> {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Array<ContactSpan & { types: ContactKind[] }> = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (!last || span.start > last.end) {
      merged.push({ ...span, types: [span.type] });
      continue;
    }
    last.end = Math.max(last.end, span.end);
    if (!last.types.includes(span.type)) last.types.push(span.type);
  }
  return merged;
}

/** Replace contact spans with `****`. Surrounding text stays. */
export function redactContacts(original: string): Redaction {
  const folded = foldContact(original);
  const spans = merge(findContactSpans(folded));
  if (spans.length === 0) {
    return { text: folded === original ? original : folded, types: [], redacted: false };
  }
  let out = "";
  let cursor = 0;
  const types: ContactKind[] = [];
  for (const span of spans) {
    out += folded.slice(cursor, span.start) + MASK;
    cursor = span.end;
    for (const type of span.types) {
      if (!types.includes(type)) types.push(type);
    }
  }
  out += folded.slice(cursor);
  return { text: out, types, redacted: true };
}
