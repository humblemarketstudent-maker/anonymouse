import { createLocalBackend } from "@/backend/local";

/**
 * Swap point for a hosted backend.
 * Replace `createLocalBackend()` with a Supabase or Firebase adapter
 * that implements `Backend` from `./types`. Do not import vendor SDKs
 * from components — keep them behind that adapter.
 *
 * The local backend persists to localStorage and simulates live rooms
 * with timers. Demo OTP is 000000 for any phone number. The number is
 * stored for sign-in only and is never copied onto the public snapshot.
 */
export const backend = createLocalBackend();

export { DEMO_OTP } from "@/backend/types";
