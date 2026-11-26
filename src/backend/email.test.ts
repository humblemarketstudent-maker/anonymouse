import { describe, expect, it } from "vitest";
import { EMAIL_INVALID, EMAIL_ONLY, emailSignInError, normalizeEmail } from "@/backend/email";

describe("sign-in email", () => {
  it("normalizes a usable address and rejects a phone number", () => {
    expect(normalizeEmail("  Tape@Example.COM ")).toBe("tape@example.com");
    expect(normalizeEmail("floor.mouse+desk@anonymouse.app")).toBe("floor.mouse+desk@anonymouse.app");
    expect(normalizeEmail("+1 212 555 0148")).toBeNull();
    expect(normalizeEmail("2125550148")).toBeNull();
    expect(normalizeEmail("555")).toBeNull();
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
    expect(normalizeEmail("user@example..com")).toBeNull();
    expect(normalizeEmail("user name@example.com")).toBeNull();
    expect(normalizeEmail(`${"a".repeat(250)}@example.com`)).toBeNull();
  });

  it("tells a phone attempt apart from a malformed address", () => {
    expect(emailSignInError("+12125550148")).toBe(EMAIL_ONLY);
    expect(emailSignInError("2125550148")).toBe(EMAIL_ONLY);
    expect(emailSignInError("")).toBe(EMAIL_INVALID);
    expect(emailSignInError("not-an-email")).toBe(EMAIL_ONLY);
    expect(emailSignInError("a@b")).toBe(EMAIL_INVALID);
  });
});
