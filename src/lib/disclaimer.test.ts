import { describe, expect, it } from "vitest";
import {
  DISCLAIMER_STORAGE_KEY,
  DISCLAIMER_VERSION,
  readDisclaimerAcceptance,
  writeDisclaimerAcceptance,
  type DisclaimerStorage,
} from "@/lib/disclaimer";

function memory(): DisclaimerStorage & { snapshot(): Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    snapshot: () => Object.fromEntries(map),
  };
}

describe("disclaimer acceptance", () => {
  it("starts unchecked and remembers only the current version", () => {
    const storage = memory();
    expect(readDisclaimerAcceptance(storage)).toBe(false);

    writeDisclaimerAcceptance(true, storage);
    expect(readDisclaimerAcceptance(storage)).toBe(true);
    expect(storage.snapshot()).toEqual({ [DISCLAIMER_STORAGE_KEY]: DISCLAIMER_VERSION });
    expect(DISCLAIMER_STORAGE_KEY).toBe("anonymouse.disclaimer.accepted");
    expect(DISCLAIMER_STORAGE_KEY).not.toMatch(/email|otp|token|secret/i);
    expect(DISCLAIMER_VERSION).not.toContain("@");
    expect(DISCLAIMER_VERSION).not.toBe("2026-11-27");
    expect(DISCLAIMER_VERSION).not.toBe("2026-11-27.2");

    writeDisclaimerAcceptance(false, storage);
    expect(readDisclaimerAcceptance(storage)).toBe(false);
    expect(storage.snapshot()).toEqual({});
  });

  it("ignores the short notice and any other older version", () => {
    const storage = memory();
    storage.setItem(DISCLAIMER_STORAGE_KEY, "2026-11-27");
    expect(readDisclaimerAcceptance(storage)).toBe(false);
    storage.setItem(DISCLAIMER_STORAGE_KEY, "2026-11-27.2");
    expect(readDisclaimerAcceptance(storage)).toBe(false);
    storage.setItem(DISCLAIMER_STORAGE_KEY, "2020-01-01");
    expect(readDisclaimerAcceptance(storage)).toBe(false);
  });

  it("treats a blocked store as not accepted and does not throw", () => {
    const storage: DisclaimerStorage = {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
      removeItem() {
        throw new Error("denied");
      },
    };
    expect(readDisclaimerAcceptance(storage)).toBe(false);
    expect(() => writeDisclaimerAcceptance(true, storage)).not.toThrow();
    expect(readDisclaimerAcceptance(null)).toBe(false);
    expect(() => writeDisclaimerAcceptance(true, null)).not.toThrow();
  });
});
