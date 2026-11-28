import { describe, expect, it } from "vitest";
import { profileDraftStatus } from "@/lib/profile";

const saved = { alias: "TapeMouse", bioQuote: "Flat into the print", hashtags: ["markets", "nyc"] };
const users = [{ id: "hum_me", alias: "TapeMouse" }, { id: "hum_other", alias: "OtherMouse" }];

describe("profileDraftStatus", () => {
  it("enables save for a quote-only edit", () => {
    const status = profileDraftStatus({
      alias: saved.alias,
      bio: "Quiet desk, louder quote",
      tags: saved.hashtags,
      saved,
      users,
      selfId: "hum_me",
    });
    expect(status.dirty).toBe(true);
    expect(status.error).toBeNull();
    expect(status.canSave).toBe(true);
  });

  it("leaves save off when nothing changed", () => {
    const status = profileDraftStatus({
      alias: saved.alias,
      bio: saved.bioQuote,
      tags: [...saved.hashtags],
      saved,
      users,
      selfId: "hum_me",
    });
    expect(status.canSave).toBe(false);
    expect(status.error).toBeNull();
  });

  it("explains why an empty quote cannot be saved", () => {
    const status = profileDraftStatus({
      alias: saved.alias,
      bio: "   ",
      tags: saved.hashtags,
      saved,
      users,
      selfId: "hum_me",
    });
    expect(status.dirty).toBe(true);
    expect(status.canSave).toBe(false);
    expect(status.error).toMatch(/quote/i);
  });

  it("enables save for an alias or hashtag change and rejects a taken alias", () => {
    expect(
      profileDraftStatus({
        alias: "NightMouse",
        bio: saved.bioQuote,
        tags: saved.hashtags,
        saved,
        users,
        selfId: "hum_me",
      }).canSave,
    ).toBe(true);
    expect(
      profileDraftStatus({
        alias: saved.alias,
        bio: saved.bioQuote,
        tags: ["books"],
        saved,
        users,
        selfId: "hum_me",
      }).canSave,
    ).toBe(true);
    const taken = profileDraftStatus({
      alias: "OtherMouse",
      bio: "Still here",
      tags: saved.hashtags,
      saved,
      users,
      selfId: "hum_me",
    });
    expect(taken.canSave).toBe(false);
    expect(taken.error).toMatch(/taken/i);
  });
});
