/**
 * On-device record that the current Terms and Privacy Policy were accepted.
 * The stored value is `DISCLAIMER_VERSION` only.
 */
export const DISCLAIMER_STORAGE_KEY = "anonymouse.disclaimer.accepted";

/** Bumped so agreement to 2026-11-27 or 2026-11-27.2 does not carry over. */
export const DISCLAIMER_VERSION = "2026-11-27.3";

export type DisclaimerStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function browserStorage(): DisclaimerStorage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readDisclaimerAcceptance(storage: DisclaimerStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(DISCLAIMER_STORAGE_KEY) === DISCLAIMER_VERSION;
  } catch {
    return false;
  }
}

export function writeDisclaimerAcceptance(
  accepted: boolean,
  storage: DisclaimerStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    if (accepted) storage.setItem(DISCLAIMER_STORAGE_KEY, DISCLAIMER_VERSION);
    else storage.removeItem(DISCLAIMER_STORAGE_KEY);
  } catch {
    /* Private mode and quota failures still leave the in-page checkbox in effect. */
  }
}
