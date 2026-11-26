import { createHmac } from "node:crypto";

/** One code per email per minute. */
export const OTP_PER_EMAIL_PER_MINUTE = 1;
/** Tight hourly cap so one email cannot be used to pump messages. */
export const OTP_PER_EMAIL_PER_HOUR = 5;
/** Tight hourly cap for one client address. */
export const OTP_PER_IP_PER_HOUR = 10;
/** Stop code guessing well before a 6-digit space can be walked. */
export const CHECKS_PER_EMAIL_PER_10_MIN = 5;
export const CHECKS_PER_IP_PER_HOUR = 30;
/** Process-wide cap. Limits are in memory and reset on restart. */
export const OTP_GLOBAL_PER_HOUR = 30;

const MINUTE = 60_000;
const TEN_MINUTES = 10 * MINUTE;
const HOUR = 60 * MINUTE;

export interface Limiter {
  takeSend(email: string, ip: string, now: number): string | null;
  takeCheck(email: string, ip: string, now: number): string | null;
}

/**
 * In-memory counters. Keys are HMACs, so the map does not hold the email.
 * Nothing here stores the OTP. A restart clears the counters.
 */
export function createLimiter(secret: string): Limiter {
  const buckets = new Map<string, number[]>();

  function id(value: string): string {
    return createHmac("sha256", secret).update(value).digest("hex");
  }

  function recent(key: string, windowMs: number, now: number): number[] {
    const kept = (buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
    if (kept.length === 0) buckets.delete(key);
    else buckets.set(key, kept);
    return kept;
  }

  function room(key: string, limit: number, windowMs: number, now: number): boolean {
    return recent(key, windowMs, now).length < limit;
  }

  function commit(keys: string[], now: number) {
    for (const key of keys) {
      const stamps = buckets.get(key) ?? [];
      stamps.push(now);
      buckets.set(key, stamps);
    }
  }

  return {
    takeSend(email, ip, now) {
      const emailKey = id(`otp:${email}`);
      const ipKey = id(`ip:${ip}`);
      const minute = `${emailKey}:m`;
      const hour = `${emailKey}:h`;
      const network = `${ipKey}:h`;
      const global = "otp:global";
      if (!room(minute, OTP_PER_EMAIL_PER_MINUTE, MINUTE, now)) {
        return "A code was just sent. Wait a minute before requesting another.";
      }
      if (!room(hour, OTP_PER_EMAIL_PER_HOUR, HOUR, now)) {
        return "Too many codes were requested for this email. Try again later.";
      }
      if (!room(network, OTP_PER_IP_PER_HOUR, HOUR, now)) {
        return "Too many codes were requested from this network. Try again later.";
      }
      if (!room(global, OTP_GLOBAL_PER_HOUR, HOUR, now)) {
        return "Too many codes were requested. Try again later.";
      }
      commit([minute, hour, network, global], now);
      return null;
    },
    takeCheck(email, ip, now) {
      const emailKey = id(`check:${email}`);
      const ipKey = id(`check-ip:${ip}`);
      const window = `${emailKey}:10`;
      const network = `${ipKey}:h`;
      if (!room(window, CHECKS_PER_EMAIL_PER_10_MIN, TEN_MINUTES, now)) {
        return "Too many attempts. Wait and try again.";
      }
      if (!room(network, CHECKS_PER_IP_PER_HOUR, HOUR, now)) {
        return "Too many attempts from this network. Try again later.";
      }
      commit([window, network], now);
      return null;
    },
  };
}
