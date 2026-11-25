import { formatDayLabel, localDayKey } from "@/lib/time";

export interface TranscriptLine {
  id: string;
  senderId: string;
  createdAt: number;
}

export type TranscriptItem<T extends TranscriptLine> =
  | { kind: "day"; id: string; label: string }
  | { kind: "message"; id: string; message: T; showAlias: boolean; grouped: boolean };

/**
 * Oldest first. Day chips break the thread. In a group room, the sender alias
 * shows on the first incoming bubble of a run, never on your own.
 */
export function buildTranscript<T extends TranscriptLine>(
  messages: readonly T[],
  now: number,
  options: { meId: string | null; showAliases: boolean },
): TranscriptItem<T>[] {
  const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const items: TranscriptItem<T>[] = [];
  let lastDay = "";
  let lastSender = "";
  for (const message of sorted) {
    const day = localDayKey(message.createdAt);
    if (day !== lastDay) {
      items.push({ kind: "day", id: `day-${day}`, label: formatDayLabel(message.createdAt, now) });
      lastDay = day;
      lastSender = "";
    }
    const mine = options.meId != null && message.senderId === options.meId;
    const grouped = message.senderId === lastSender;
    items.push({
      kind: "message",
      id: message.id,
      message,
      showAlias: options.showAliases && !mine && !grouped,
      grouped,
    });
    lastSender = message.senderId;
  }
  return items;
}
