import { describe, expect, it } from "vitest";
import { createLocalBackend, type Kv } from "@/backend/local";

function memory(): Kv {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function setup(storage = memory()) {
  const backend = createLocalBackend({
    storage,
    now: () => 1_700_000_000_000,
    random: () => 0.2,
    schedule: () => () => undefined,
  });
  return backend;
}

async function signIn(storage = memory(), alias = "TapeMouse") {
  const backend = setup(storage);
  const request = await backend.requestOtp({ method: "email", contact: "floor@anonymouse.app" });
  expect(request.ok).toBe(true);
  const verified = await backend.verifyOtp("000000");
  expect(verified.ok).toBe(true);
  if (!verified.ok) return backend;
  expect(verified.needsProfile).toBe(true);
  const profile = backend.completeProfile({
    alias,
    bioQuote: "Flat into the print",
    sector: "Hedge Fund",
  });
  expect(profile.ok).toBe(true);
  return backend;
}

describe("local floor", () => {
  it("rejects a bad code and accepts the demo code", async () => {
    const backend = setup();
    expect((await backend.verifyOtp("000000")).ok).toBe(false);
    expect((await backend.requestOtp({ method: "email", contact: "not-an-email" })).ok).toBe(false);
    expect((await backend.requestOtp({ method: "phone", contact: "555" })).ok).toBe(false);
    await backend.requestOtp({ method: "email", contact: "Floor@Anonymouse.app" });
    const wrong = await backend.verifyOtp("123456");
    expect(wrong.ok).toBe(false);
    const right = await backend.verifyOtp("000000");
    expect(right.ok).toBe(true);
  });

  it("keeps the contact off the public snapshot and restores the session", async () => {
    const storage = memory();
    const backend = await signIn(storage);
    const json = JSON.stringify(backend.getSnapshot());
    expect(json).not.toContain("floor@anonymouse.app");
    expect(json).not.toContain("@anonymouse");
    expect(backend.debug().contacts).toEqual(["floor@anonymouse.app"]);
    expect(backend.getSnapshot().me?.alias).toBe("TapeMouse");
    expect(backend.getSnapshot().friendIds.length).toBeGreaterThan(0);
    expect(backend.getSnapshot().threads.length).toBe(3);

    const restored = setup(storage);
    expect(restored.getSnapshot().me?.alias).toBe("TapeMouse");
    expect(restored.getSnapshot().session?.method).toBe("email");
    expect(JSON.stringify(restored.getSnapshot())).not.toContain("floor@anonymouse.app");

    restored.signOut();
    const signedOut = setup(storage);
    expect(signedOut.getSnapshot().session).toBeNull();
    await signedOut.requestOtp({ method: "email", contact: "floor@anonymouse.app" });
    const again = await signedOut.verifyOtp("000000");
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.needsProfile).toBe(false);
    expect(signedOut.getSnapshot().me?.alias).toBe("TapeMouse");
  });

  it("posts, blasts, blocks, and burns", async () => {
    const backend = await signIn();
    const snap = backend.getSnapshot();
    const friendId = snap.friendIds[0]!;
    const posted = backend.postChatter({
      body: "Flat, and saying so before the print.",
      roomId: null,
      blastFriendIds: [friendId],
    });
    expect(posted.ok).toBe(true);
    const after = backend.getSnapshot();
    expect(after.chatters.some((chatter) => chatter.body.includes("Flat, and saying"))).toBe(true);
    const thread = after.threads.find((item) => item.peerId === friendId);
    expect(thread?.preview.startsWith("Blast")).toBe(true);

    const authorId = after.chatters.find((chatter) => chatter.authorId !== after.me?.id)?.authorId;
    expect(authorId).toBeTruthy();
    backend.blockUser(authorId!);
    expect(backend.getSnapshot().chatters.some((chatter) => chatter.authorId === authorId)).toBe(false);
    expect(backend.openThread(authorId!).ok).toBe(false);
    backend.unblockUser(authorId!);
    expect(backend.getSnapshot().chatters.some((chatter) => chatter.authorId === authorId)).toBe(true);

    const open = backend.openThread(friendId);
    expect(open.ok).toBe(true);
    if (!open.ok) return;
    expect(backend.sendMessage(open.threadId, "Still with you.").ok).toBe(true);
    backend.burnThread(open.threadId);
    expect(backend.getSnapshot().threads.some((item) => item.id === open.threadId)).toBe(false);

    backend.report({ targetType: "user", targetId: friendId, reason: "Spam or solicitation" });
    expect(backend.debug().reports).toBe(1);
    expect(backend.addFriend(after.me!.id).ok).toBe(false);
  });

  it("rejects a taken alias", async () => {
    const backend = setup();
    await backend.requestOtp({ method: "email", contact: "a@desk.com" });
    await backend.verifyOtp("000000");
    const taken = backend.completeProfile({
      alias: "MacroMouse",
      bioQuote: "Already taken",
      sector: "Hedge Fund",
    });
    expect(taken.ok).toBe(false);
  });
});
