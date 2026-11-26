export interface RatePolicy {
  maxPerWindow: number;
  windowMs: number;
  strikeLimit: number;
  strikeWindowMs: number;
  cooldownMs: number;
}

export const DEFAULT_RATE: RatePolicy = {
  maxPerWindow: 40,
  windowMs: 60_000,
  strikeLimit: 5,
  strikeWindowMs: 10 * 60_000,
  cooldownMs: 60_000,
};

interface Bucket {
  hits: number[];
  blocks: number[];
  cooldownUntil: number;
}

export interface RateStore {
  buckets: Map<string, Bucket>;
}

export function createRateStore(): RateStore {
  return { buckets: new Map() };
}

export function accountFor(
  store: RateStore,
  actorHash: string,
  action: "allow" | "redact" | "block" | "quarantine" | "rate_limit",
  now: number,
  policy: RatePolicy = DEFAULT_RATE,
): { limited: boolean; escalated: boolean; strikes: number } {
  const bucket = store.buckets.get(actorHash) ?? { hits: [], blocks: [], cooldownUntil: 0 };
  bucket.hits = bucket.hits.filter((stamp) => now - stamp < policy.windowMs);
  bucket.blocks = bucket.blocks.filter((stamp) => now - stamp < policy.strikeWindowMs);
  const inCooldown = bucket.cooldownUntil > now;
  let escalated = false;
  if (action === "block" || action === "quarantine") {
    bucket.blocks.push(now);
    if (bucket.blocks.length >= policy.strikeLimit) {
      bucket.cooldownUntil = now + policy.cooldownMs;
      escalated = true;
    }
  }
  const overVolume = bucket.hits.length >= policy.maxPerWindow;
  const limited = inCooldown || overVolume;
  if (!limited && (action === "allow" || action === "redact")) bucket.hits.push(now);
  store.buckets.set(actorHash, bucket);
  return { limited, escalated, strikes: bucket.blocks.length };
}
