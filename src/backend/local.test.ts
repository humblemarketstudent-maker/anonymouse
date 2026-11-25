import { describe, expect, it } from "vitest";
import { createLocalBackend, type Kv } from "@/backend/local";
import { searchRooms } from "@/lib/search";

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

function setup(storage = memory(), random: () => number = () => 0.2, schedule?: (fn: () => void, ms: number) => () => void) {
  let clock = 1_700_000_000_000;
  const backend = createLocalBackend({
    storage,
    now: () => clock,
    random,
    schedule: schedule ?? (() => () => undefined),
  });
  return {
    backend,
    advance(ms: number) {
      clock += ms;
    },
  };
}

function freshPeer(backend: ReturnType<typeof setup>["backend"]) {
  const snap = backend.getSnapshot();
  const id = snap.matchPeerIds.find((peerId) => !snap.threads.some((thread) => thread.peerId === peerId));
  expect(id).toBeTruthy();
  return id!;
}

async function signIn(storage = memory(), alias = "TapeMouse", random?: () => number, immediate = false) {
  const rig = setup(
    storage,
    random,
    immediate ? (fn) => {
      fn();
      return () => undefined;
    } : undefined,
  );
  const request = await rig.backend.requestOtp({ contact: "+1 212 555 0148" });
  expect(request.ok).toBe(true);
  const verified = await rig.backend.verifyOtp("000000");
  expect(verified.ok).toBe(true);
  if (!verified.ok) return rig;
  expect(verified.needsProfile).toBe(true);
  const profile = rig.backend.completeProfile({
    alias,
    bioQuote: "Flat into the print",
    hashtags: ["markets", "nyc"],
  });
  expect(profile.ok).toBe(true);
  return rig;
}

describe("local anonymouse", () => {
  it("accepts a phone and the demo code, and rejects email", async () => {
    const { backend } = setup();
    expect((await backend.verifyOtp("000000")).ok).toBe(false);
    expect((await backend.requestOtp({ contact: "floor@anonymouse.app" })).ok).toBe(false);
    expect((await backend.requestOtp({ contact: "555" })).ok).toBe(false);
    await backend.requestOtp({ contact: "+1 (212) 555-0148" });
    expect((await backend.verifyOtp("123456")).ok).toBe(false);
    const right = await backend.verifyOtp("000000");
    expect(right.ok).toBe(true);
  });

  it("keeps the phone off the public snapshot and restores the session", async () => {
    const storage = memory();
    const { backend } = await signIn(storage);
    const snap = backend.getSnapshot();
    const json = JSON.stringify(snap);
    expect(json).not.toContain("12125550148");
    expect(json).not.toContain("@");
    expect(backend.debug().contacts).toEqual(["+12125550148"]);
    expect(snap.me?.alias).toBe("TapeMouse");
    expect(snap.me?.hashtags).toEqual(["markets", "nyc"]);
    expect(snap.session?.method).toBe("phone");
    expect(snap.friendIds.length).toBe(4);
    expect(snap.threads).toHaveLength(2);
    expect(snap.threads.every((thread) => thread.origin === "direct")).toBe(true);
    expect(snap.joinedRoomIds).toEqual(["room_night", "room_library", "room_market"]);
    expect(snap.incomingTaps.map((tap) => tap.fromId)).toEqual(["usr_keel"]);
    expect(snap.matchPeerIds).toHaveLength(10);
    expect(snap.matchPeerIds).not.toContain("usr_keel");
    expect(snap.topHashtags).toHaveLength(20);
    expect(snap.topHashtags[0]!.count).toBeGreaterThanOrEqual(snap.topHashtags[1]!.count);
    expect(snap.tapsRemaining).toBe(5);

    const restored = setup(storage).backend;
    expect(restored.getSnapshot().me?.alias).toBe("TapeMouse");
    expect(restored.getSnapshot().me?.hashtags).toEqual(["markets", "nyc"]);
    expect(restored.getSnapshot().joinedRoomIds).toEqual(snap.joinedRoomIds);
    expect(restored.getSnapshot().incomingTaps).toHaveLength(1);
    expect(JSON.stringify(restored.getSnapshot())).not.toContain("12125550148");

    restored.signOut();
    const signedOut = setup(storage).backend;
    expect(signedOut.getSnapshot().session).toBeNull();
    await signedOut.requestOtp({ contact: "+1 212 555 0148" });
    const again = await signedOut.verifyOtp("000000");
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.needsProfile).toBe(false);
    expect(signedOut.getSnapshot().me?.alias).toBe("TapeMouse");
  });

  it("searches rooms by words and hashtags, and keeps a created room", async () => {
    const { backend } = await signIn();
    const seeded = backend.getSnapshot().rooms;
    expect(searchRooms(seeded, "library").some((room) => room.name === "The Library")).toBe(true);
    expect(searchRooms(seeded, "#books").some((room) => room.name === "The Library")).toBe(true);
    expect(searchRooms(seeded, "night desk").some((room) => room.name === "Night Desk")).toBe(true);
    expect(searchRooms(seeded, "#library")).toEqual([]);

    const created = backend.createRoom({
      name: "Mouse Hole",
      blurb: "Smaller than the rest.",
      hashtags: ["Night Owl", "quiet-rooms"],
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const rooms = backend.getSnapshot().rooms;
    const hole = rooms.find((room) => room.id === created.roomId);
    expect(hole?.hashtags).toEqual(["night-owl", "quiet-rooms"]);
    expect(searchRooms(rooms, "#quiet-rooms").map((room) => room.name)).toContain("Mouse Hole");
    expect(searchRooms(rooms, "smaller than").map((room) => room.name)).toContain("Mouse Hole");
    expect(backend.getSnapshot().joinedRoomIds[0]).toBe(created.roomId);

    expect(backend.leaveRoom(created.roomId).ok).toBe(true);
    expect(backend.getSnapshot().joinedRoomIds).not.toContain(created.roomId);
    expect(backend.postChatter({ body: "Still here.", roomId: created.roomId }).ok).toBe(false);
    expect(backend.joinRoom(created.roomId).ok).toBe(true);
    expect(backend.postChatter({ body: "Back in.", roomId: created.roomId }).ok).toBe(true);
  });

  it("posts, blasts, blocks, and burns without turning a friend into a tap", async () => {
    const { backend } = await signIn();
    const beforeThreads = backend.getSnapshot().threads.length;
    const added = backend.addFriend("usr_loom");
    expect(added.ok).toBe(true);
    expect(backend.getSnapshot().friendIds).toContain("usr_loom");
    expect(backend.getSnapshot().threads).toHaveLength(beforeThreads);
    expect(backend.getSnapshot().tapsRemaining).toBe(5);
    expect(backend.getSnapshot().outgoingTaps).toHaveLength(0);

    const friendId = backend.getSnapshot().friendIds[0]!;
    const posted = backend.postChatter({
      body: "Flat, and saying so before the print.",
      roomId: "room_market",
      blastFriendIds: [friendId],
    });
    expect(posted.ok).toBe(true);
    const after = backend.getSnapshot();
    expect(after.chatters.some((chatter) => chatter.body.includes("Flat, and saying"))).toBe(true);
    const thread = after.threads.find((item) => item.peerId === friendId);
    expect(thread?.preview.startsWith("Blast")).toBe(true);
    expect(thread?.origin).toBe("direct");

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
    expect(backend.endMatch(open.threadId).ok).toBe(false);

    backend.report({ targetType: "user", targetId: friendId, reason: "Spam or solicitation" });
    expect(backend.debug().reports).toBe(1);
    expect(backend.addFriend(after.me!.id).ok).toBe(false);
  });

  it("limits taps to five a day and resets on the next local day", async () => {
    const storage = memory();
    const { backend, advance } = await signIn(storage);
    const ids = [...backend.getSnapshot().matchPeerIds];
    expect(ids.length).toBeGreaterThanOrEqual(6);
    for (let index = 0; index < 5; index += 1) {
      expect(backend.tapUser(ids[index]!).ok).toBe(true);
    }
    expect(backend.getSnapshot().tapsRemaining).toBe(0);
    expect(backend.getSnapshot().outgoingTaps).toHaveLength(5);
    const blocked = backend.tapUser(ids[5]!);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toMatch(/5 a day/);

    const restored = setup(storage).backend;
    expect(restored.getSnapshot().tapsRemaining).toBe(0);
    expect(restored.getSnapshot().outgoingTaps).toHaveLength(5);

    advance(24 * 60 * 60 * 1000);
    expect(backend.getSnapshot().tapsRemaining).toBe(5);
    expect(backend.tapUser(ids[5]!).ok).toBe(true);
  });

  it("opens MSG after an accepted tap and keeps a decline out of the next pool", async () => {
    const accepted = await signIn(memory(), "TapeMouse", () => 0.1, true);
    const peerId = freshPeer(accepted.backend);
    expect(accepted.backend.tapUser(peerId).ok).toBe(true);
    const after = accepted.backend.getSnapshot();
    expect(after.tapsRemaining).toBe(4);
    expect(after.outgoingTaps).toHaveLength(0);
    const thread = after.threads.find((item) => item.peerId === peerId);
    expect(thread?.origin).toBe("match");
    expect(thread?.preview).toBe("You tapped. I'm here.");
    expect(after.matchPeerIds).not.toContain(peerId);

    expect(accepted.backend.endMatch(thread!.id).ok).toBe(true);
    expect(accepted.backend.getSnapshot().threads.some((item) => item.id === thread!.id)).toBe(false);
    accepted.backend.refreshMatch();
    expect(accepted.backend.getSnapshot().matchPeerIds).not.toContain(peerId);

    const declined = await signIn(memory(), "OtherMouse", () => 0.95, true);
    const passed = freshPeer(declined.backend);
    expect(declined.backend.tapUser(passed).ok).toBe(true);
    expect(declined.backend.getSnapshot().threads.some((item) => item.peerId === passed)).toBe(false);
    expect(declined.backend.getSnapshot().outgoingTaps).toHaveLength(0);
    declined.backend.refreshMatch();
    expect(declined.backend.getSnapshot().matchPeerIds).not.toContain(passed);

    const incoming = declined.backend.getSnapshot().incomingTaps[0]!;
    const started = declined.backend.acceptTap(incoming.id);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(
      declined.backend.getSnapshot().threads.some((item) => item.id === started.threadId && item.origin === "match"),
    ).toBe(true);
  });

  it("rejects a taken alias", async () => {
    const { backend } = setup();
    await backend.requestOtp({ contact: "2125550199" });
    await backend.verifyOtp("000000");
    const taken = backend.completeProfile({
      alias: "MacroMouse",
      bioQuote: "Already taken",
      hashtags: ["books"],
    });
    expect(taken.ok).toBe(false);
  });
});
