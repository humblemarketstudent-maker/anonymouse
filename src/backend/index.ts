import { createLocalBackend } from "@/backend/local";

/**
 * Swap point for a hosted backend.
 * Replace `createLocalBackend()` with a Supabase or Firebase adapter
 * that implements `Backend` from `./types`. Do not import vendor SDKs
 * from components — keep them behind that adapter.
 *
 * The local backend persists to localStorage and simulates a live floor
 * with timers. Demo OTP is 000000. Contacts are stored for sign-in only
 * and are never copied onto the public snapshot.
 */
export const backend = createLocalBackend();

export { DEMO_OTP } from "@/backend/types";
