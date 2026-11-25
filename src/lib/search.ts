export interface SearchableRoom {
  name: string;
  blurb: string;
  hashtags: string[];
}

/**
 * Match a room by plain words (name, blurb, or hashtag) or by a hashtag query.
 * A leading # restricts the match to hashtags. Several words must all hit.
 */
export function searchRooms<T extends SearchableRoom>(rooms: T[], query: string): T[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [...rooms];
  const tagMode = raw.startsWith("#");
  const term = raw.replace(/^#+/, "").trim();
  if (!term) return [...rooms];
  const words = term.split(/\s+/).filter(Boolean);

  const scored = rooms.flatMap((room) => {
    const name = room.name.toLowerCase();
    const blurb = room.blurb.toLowerCase();
    const tags = room.hashtags.map((tag) => tag.toLowerCase());
    if (tagMode) {
      const exact = tags.some((tag) => tag === term);
      const partial = tags.some((tag) => tag.includes(term));
      if (!exact && !partial) return [];
      return [{ room, score: exact ? 0 : 1 }];
    }
    const hay = `${name} ${blurb} ${tags.join(" ")}`;
    if (!words.every((word) => hay.includes(word))) return [];
    let score = 5;
    if (name === term) score = 0;
    else if (name.startsWith(term)) score = 1;
    else if (tags.includes(term)) score = 2;
    else if (name.includes(term)) score = 3;
    else if (tags.some((tag) => tag.includes(words[0] ?? term))) score = 4;
    return [{ room, score }];
  });

  scored.sort((a, b) => a.score - b.score || a.room.name.localeCompare(b.room.name));
  return scored.map((item) => item.room);
}
