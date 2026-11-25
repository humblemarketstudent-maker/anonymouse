/** How far back a room's heat radar looks. */
export const HEAT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Every radar is this many bars. */
export const HEAT_BAR_COUNT = 5;

/**
 * Messages in the last 24 hours, mapped to filled bars:
 * 0 → 0, 1 → 1, 2 → 2, 3–4 → 3, 5–7 → 4, 8 or more → 5.
 */
export function heatBars(recentMessages: number): number {
  const count = Math.max(0, Math.floor(recentMessages));
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  if (count <= 7) return 4;
  return Math.min(HEAT_BAR_COUNT, 5);
}

/** Messages whose timestamps fall inside the heat window. */
export function countRecent(timestamps: number[], now: number, windowMs = HEAT_WINDOW_MS): number {
  const cutoff = now - windowMs;
  let total = 0;
  for (const timestamp of timestamps) {
    if (timestamp >= cutoff && timestamp <= now) total += 1;
  }
  return total;
}
