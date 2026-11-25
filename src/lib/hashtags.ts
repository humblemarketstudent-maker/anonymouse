const TAG = /^[a-z][a-z0-9-]{1,23}$/;

/** Turn free text into a stored hashtag, without the leading #. */
export function normalizeHashtag(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (value.startsWith("#")) value = value.slice(1).trim();
  value = value
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!TAG.test(value)) return null;
  return value;
}

export function collectHashtags(
  raw: string[],
  bounds: { min: number; max: number },
): { tags: string[]; error: string | null } {
  const tags: string[] = [];
  for (const item of raw) {
    const tag = normalizeHashtag(item);
    if (!tag) {
      return {
        tags: [],
        error: "Hashtags use 2–24 letters, numbers, or hyphens.",
      };
    }
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length < bounds.min) {
    return { tags: [], error: bounds.min === 1 ? "Add at least one hashtag." : "Add a hashtag." };
  }
  if (tags.length > bounds.max) {
    return { tags: [], error: `Keep it to ${bounds.max} hashtags.` };
  }
  return { tags, error: null };
}
