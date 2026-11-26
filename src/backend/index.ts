import { createLocalBackend, type LocalOptions } from "@/backend/local";
import { createHybridBackend, type HybridOptions } from "@/backend/hybrid";
import { sharedModeration } from "@/lib/moderation-runtime";
import type { Backend } from "@/backend/types";

/**
 * Swap point for a hosted backend.
 * Rooms, Match, MSG, friends, taps, and profile completion stay on the
 * local backend. When `VITE_AUTH_API_BASE` is set at build time, only
 * `requestOtp` and `verifyOtp` go to the auth API. Otherwise the demo
 * code is 000000. The email is never copied onto the public snapshot.
 * Do not import a vendor SDK from components — keep it behind the adapter.
 */
export function liveAuthFrom(authApiBase: string | undefined): boolean {
  return Boolean(authApiBase?.trim());
}

export function createBackend(authApiBase: string | undefined, options?: HybridOptions): Backend {
  const base = authApiBase?.trim() ?? "";
  if (!base) return createLocalBackend(options);
  return createHybridBackend(base, options);
}

const moderation = sharedModeration();
const localOptions: LocalOptions = { journal: moderation.journal, rate: moderation.rate };
const authApiBase = import.meta.env.VITE_AUTH_API_BASE;

export const liveAuth = liveAuthFrom(authApiBase);
export const backend = createBackend(authApiBase, localOptions);

export { DEMO_OTP } from "@/backend/types";
