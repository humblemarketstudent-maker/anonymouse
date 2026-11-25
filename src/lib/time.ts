/** Local calendar day, used for the Match tap limit. */
export function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatAge(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 15) return "just now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Day chip inside a conversation: Today, Yesterday, or a calendar date. */
export function formatDayLabel(timestamp: number, now: number): string {
  const day = localDayKey(timestamp);
  if (day === localDayKey(now)) return "Today";
  const prior = new Date(now);
  prior.setHours(0, 0, 0, 0);
  prior.setDate(prior.getDate() - 1);
  if (day === localDayKey(prior.getTime())) return "Yesterday";
  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}

/** Clock time on a message bubble, e.g. 2:41 PM. */
export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Chat-list stamp: a clock today, Yesterday, otherwise a short date. */
export function formatChatListTime(timestamp: number, now: number): string {
  const day = localDayKey(timestamp);
  if (day === localDayKey(now)) return formatClock(timestamp);
  const prior = new Date(now);
  prior.setHours(0, 0, 0, 0);
  prior.setDate(prior.getDate() - 1);
  if (day === localDayKey(prior.getTime())) return "Yesterday";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
