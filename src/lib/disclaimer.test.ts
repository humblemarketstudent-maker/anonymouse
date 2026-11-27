import { describe, expect, it } from "vitest";
import {
  DISCLAIMER_SECTIONS,
  DISCLAIMER_STORAGE_KEY,
  DISCLAIMER_VERSION,
  disclaimerPlainText,
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
    expect(DISCLAIMER_STORAGE_KEY).not.toMatch(/email|otp|token|secret/i);
    expect(DISCLAIMER_VERSION).not.toContain("@");

    writeDisclaimerAcceptance(false, storage);
    expect(readDisclaimerAcceptance(storage)).toBe(false);
    expect(storage.snapshot()).toEqual({});
  });

  it("ignores an older stored version", () => {
    const storage = memory();
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

describe("disclaimer copy", () => {
  const text = disclaimerPlainText();

  it("covers responsibility, other people's messages, anonymity, email, prohibited use, age, and Hong Kong", () => {
    expect(text).toMatch(/responsible for how you use Anonymouse/i);
    expect(text).toMatch(/does not pre-screen all messages/i);
    expect(text).toMatch(/not liable for other users' content/i);
    expect(text).toMatch(/offered as it is/i);
    expect(text).toMatch(/not a license to break the law/i);
    expect(text).toMatch(/email is used only to sign you back in on this device/i);
    expect(text).toMatch(/not shown on a profile, in a room, or in a message/i);
    expect(text).toMatch(/illegal, abusive, or harmful/i);
    expect(text).toMatch(/at least 13/);
    expect(text).toMatch(/operated from Hong Kong/);
    expect(text).toMatch(/does not name a company or other legal entity/);
    expect(DISCLAIMER_SECTIONS.map((section) => section.heading)).toEqual([
      "Your responsibility",
      "Messages from other people",
      "Anonymity and email",
      "Prohibited use",
      "Age",
      "Governing law",
    ]);
  });

  it("stays a product notice in the service's own voice", () => {
    expect(text).not.toMatch(/Wellhive|lawyer|legal opinion|Prototype only|Nothing here is advice/i);
  });
});
