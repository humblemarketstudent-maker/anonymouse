import { createHmac } from "node:crypto";

/** One SMS per number per minute. */
export const SMS_PER_NUMBER_PER_MINUTE = 1;
/** Tight hourly cap so a number cannot be used to pump texts. */
export const SMS_PER_NUMBER_PER_HOUR = 5;
/** Tight hourly cap for one client address. */
export const SMS_PER_IP_PER_HOUR = 10;
/** Stop code guessing well before a 6-digit space can be walked. */
export const CHECKS_PER_NUMBER_PER_10_MIN = 5;
export const CHECKS_PER_IP_PER_HOUR = 30;
/** Process-wide cap. Limits are in memory and reset on restart. */
export const SMS_GLOBAL_PER_HOUR = 30;

const MINUTE = 60_000;
const TEN_MINUTES = 10 * MINUTE;
const HOUR = 60 * MINUTE;

export interface Limiter {
  takeSms(phone: string, ip: string, now: number): string | null;
  takeCheck(phone: string, ip: string, now: number): string | null;
}

/**
 * In-memory counters. Keys are HMACs, so the map does not hold the phone number.
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
    takeSms(phone, ip, now) {
      const phoneKey = id(`sms:${phone}`);
      const ipKey = id(`ip:${ip}`);
      const minute = `${phoneKey}:m`;
      const hour = `${phoneKey}:h`;
      const network = `${ipKey}:h`;
      const global = "sms:global";
      if (!room(minute, SMS_PER_NUMBER_PER_MINUTE, MINUTE, now)) {
        return "A code was just sent. Wait a minute before requesting another.";
      }
      if (!room(hour, SMS_PER_NUMBER_PER_HOUR, HOUR, now)) {
        return "Too many codes were requested for this number. Try again later.";
      }
      if (!room(network, SMS_PER_IP_PER_HOUR, HOUR, now)) {
        return "Too many codes were requested from this network. Try again later.";
      }
      if (!room(global, SMS_GLOBAL_PER_HOUR, HOUR, now)) {
        return "Too many codes were requested. Try again later.";
      }
      commit([minute, hour, network, global], now);
      return null;
    },
    takeCheck(phone, ip, now) {
      const phoneKey = id(`check:${phone}`);
      const ipKey = id(`check-ip:${ip}`);
      const window = `${phoneKey}:10`;
      const network = `${ipKey}:h`;
      if (!room(window, CHECKS_PER_NUMBER_PER_10_MIN, TEN_MINUTES, now)) {
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
