import { describe, expect, it } from "vitest";
import { MESSAGE_TTL_MS, type ChatAttachment } from "@/backend/types";
import { defaultAvatar } from "@/lib/avatar";
import { NOTICE } from "@/moderation/notices";
import { NEWS_ITEMS } from "@/data/floor";
import { RETIRED_ROOM_IDS, RETIRED_USER_IDS } from "@/data/retired-stock";
import { heatBars } from "@/lib/heat";
import { createLocalBackend, STORAGE_KEY, threadIsUnsolicited, type Kv } from "@/backend/local";
import { searchRooms } from "@/lib/search";

function textFile(contents: string, name = "note.txt"): ChatAttachment {
  const bytes = new TextEncoder().encode(contents);
  return {
    name,
    mime: "text/plain",
    size: bytes.length,
    dataUrl: `data:text/plain;base64,${btoa(String.fromCharCode(...bytes))}`,
  };
}

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

type Local = ReturnType<typeof setup>["backend"];

const HOME = "tape@example.com";

async function signBack(backend: Local, email = HOME) {
  backend.signOut();
  expect((await backend.requestOtp({ contact: email })).ok).toBe(true);
  const verified = await backend.verifyOtp("000000");
  expect(verified.ok).toBe(true);
  if (verified.ok) expect(verified.needsProfile).toBe(false);
}

async function addPerson(backend: Local, email: string, alias: string, hashtags = ["books"]) {
  backend.signOut();
  expect((await backend.requestOtp({ contact: email })).ok).toBe(true);
  expect((await backend.verifyOtp("000000")).ok).toBe(true);
  expect(backend.completeProfile({ alias, bioQuote: "Quiet peer", hashtags }).ok).toBe(true);
  return backend.getSnapshot().me!.id;
}

async function peersFor(backend: Local, count: number) {
  const ids: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const n = String(index + 1).padStart(2, "0");
    ids.push(await addPerson(backend, `peer${n}@example.com`, `Peer${n}`));
  }
  await signBack(backend);
  backend.refreshMatch();
  return ids;
}

async function receiveTap(backend: Local, email: string, alias: string) {
  const meId = backend.getSnapshot().me!.id;
  const peerId = await addPerson(backend, email, alias);
  expect(backend.tapUser(meId).ok).toBe(true);
  await signBack(backend);
  const tap = backend.getSnapshot().incomingTaps.find((item) => item.fromId === peerId);
  expect(tap).toBeTruthy();
  return { peerId, tapId: tap!.id };
}

function openedThread(backend: Local, peerId: string) {
  const opened = backend.openThread(peerId);
  expect(opened.ok).toBe(true);
  if (!opened.ok) throw new Error("expected a thread");
  return opened.threadId;
}

function ownRoom(backend: Local, name = "Mouse Hole") {
  const created = backend.createRoom({
    name,
    blurb: "Smaller than the rest.",
    hashtags: ["Night Owl", "quiet-rooms"],
  });
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error("expected a room");
  return created.roomId;
}

function freshPeer(backend: Local) {
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
  const request = await rig.backend.requestOtp({ contact: "tape@example.com" });
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
  it("starts empty of stock bots and stock rooms", () => {
    const snap = setup().backend.getSnapshot();
    expect(snap.users).toEqual([]);
    expect(snap.rooms).toEqual([]);
    expect(snap.chatters).toEqual([]);
    expect(snap.threads).toEqual([]);
    expect(snap.messages).toEqual([]);
    expect(snap.friendIds).toEqual([]);
    expect(snap.directory).toEqual([]);
    const dumped = JSON.stringify(snap);
    for (const id of [...RETIRED_USER_IDS, ...RETIRED_ROOM_IDS]) expect(dumped).not.toContain(id);
  });

  it("accepts an email and the demo code, and rejects a phone number", async () => {
    const { backend } = setup();
    expect((await backend.verifyOtp("000000")).ok).toBe(false);
    expect((await backend.requestOtp({ contact: "+1 (212) 555-0148" })).ok).toBe(false);
    expect((await backend.requestOtp({ contact: "555" })).ok).toBe(false);
    expect((await backend.requestOtp({ contact: "not-an-email" })).ok).toBe(false);
    await backend.requestOtp({ contact: "  Floor@Anonymouse.app " });
    expect((await backend.verifyOtp("123456")).ok).toBe(false);
    const right = await backend.verifyOtp("000000");
    expect(right.ok).toBe(true);
    expect(backend.debug().contacts).toEqual(["floor@anonymouse.app"]);
  });

  it("signs in with a normalized email and restores the same account", async () => {
    const storage = memory();
    const email = "harbour@example.com";
    const { backend } = setup(storage);
    expect((await backend.requestOtp({ contact: "Harbour@Example.com" })).ok).toBe(true);
    expect((await backend.verifyOtp("123456")).ok).toBe(false);
    const verified = await backend.verifyOtp("000000");
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.needsProfile).toBe(true);
    expect(backend.debug().contacts).toEqual([email]);
    expect(JSON.stringify(backend.getSnapshot())).not.toContain(email);
    expect(JSON.stringify(backend.getSnapshot())).not.toContain("@");

    expect(
      backend.completeProfile({
        alias: "Harbour",
        bioQuote: "Quiet on the ferry",
        hashtags: ["harbour"],
      }).ok,
    ).toBe(true);
    backend.signOut();

    const again = setup(storage).backend;
    expect(again.getSnapshot().session).toBeNull();
    expect((await again.requestOtp({ contact: "  HARBOUR@example.com  " })).ok).toBe(true);
    const restored = await again.verifyOtp("000000");
    expect(restored.ok).toBe(true);
    if (restored.ok) expect(restored.needsProfile).toBe(false);
    expect(again.getSnapshot().me?.alias).toBe("Harbour");
    expect(JSON.stringify(again.getSnapshot())).not.toContain(email);
    expect(JSON.stringify(again.getSnapshot())).not.toContain("@");
    expect((await again.requestOtp({ contact: "+12125550148" })).ok).toBe(false);
  });

  it("opens a local session after the code was already checked", () => {
    const storage = memory();
    const email = "harbour@example.com";
    const { backend } = setup(storage);
    const created = backend.establishSession("Harbour@Example.com");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.needsProfile).toBe(true);
    expect(JSON.stringify(backend.getSnapshot())).not.toContain(email);
    expect(backend.getSnapshot().me).toBeNull();
    expect(backend.establishSession("+12125550148").ok).toBe(false);
    expect(
      backend.completeProfile({ alias: "Harbour", bioQuote: "Quiet on the ferry", hashtags: ["harbour"] }).ok,
    ).toBe(true);
    backend.signOut();

    const again = setup(storage).backend;
    expect(again.getSnapshot().session).toBeNull();
    const restored = again.establishSession("  harbour@example.com ");
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.needsProfile).toBe(false);
    expect(again.getSnapshot().me?.alias).toBe("Harbour");
    const snap = again.getSnapshot();
    const json = JSON.stringify({ me: snap.me, users: snap.users, directory: snap.directory });
    expect(json).not.toContain(email);
    expect(json).not.toContain("@");
    expect(snap.session?.method).toBe("email");
  });

  it("keeps the email off the public snapshot and restores the session", async () => {
    const storage = memory();
    const { backend } = await signIn(storage);
    const snap = backend.getSnapshot();
    const json = JSON.stringify(snap);
    expect(json).not.toContain("tape@example.com");
    expect(json).not.toContain("@");
    expect(backend.debug().contacts).toEqual(["tape@example.com"]);
    expect(snap.me?.alias).toBe("TapeMouse");
    expect(snap.me?.hashtags).toEqual(["markets", "nyc"]);
    expect(snap.session?.method).toBe("email");
    expect(snap.users.map((user) => user.id)).toEqual([snap.me?.id]);
    expect(snap.directory).toEqual([]);
    expect(snap.friendIds).toEqual([]);
    expect(snap.rooms).toEqual([]);
    expect(snap.joinedRoomIds).toEqual([]);
    expect(snap.threads).toHaveLength(0);
    expect(snap.messages).toHaveLength(0);
    expect(snap.chatters).toHaveLength(0);
    expect(snap.incomingTaps).toEqual([]);
    expect(snap.matchPeerIds).toEqual([]);
    expect(snap.matchEligibleIds).toEqual([]);
    expect(snap.topHashtags.map((item) => item.tag)).toEqual(["markets", "nyc"]);
    expect(json).not.toContain("Still short. Smaller than I sound.");
    for (const id of [...RETIRED_USER_IDS, ...RETIRED_ROOM_IDS]) expect(json).not.toContain(id);
    expect(snap.tapsRemaining).toBe(20);

    const restored = setup(storage).backend;
    expect(restored.getSnapshot().me?.alias).toBe("TapeMouse");
    expect(restored.getSnapshot().me?.hashtags).toEqual(["markets", "nyc"]);
    expect(restored.getSnapshot().joinedRoomIds).toEqual(snap.joinedRoomIds);
    expect(restored.getSnapshot().incomingTaps).toHaveLength(0);
    expect(restored.getSnapshot().rooms).toEqual([]);
    expect(JSON.stringify(restored.getSnapshot())).not.toContain("tape@example.com");
    expect(JSON.stringify(restored.getSnapshot())).not.toContain("@");

    restored.signOut();
    const signedOut = setup(storage).backend;
    expect(signedOut.getSnapshot().session).toBeNull();
    await signedOut.requestOtp({ contact: "Tape@Example.com" });
    const again = await signedOut.verifyOtp("000000");
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.needsProfile).toBe(false);
    expect(signedOut.getSnapshot().me?.alias).toBe("TapeMouse");
  });

  it("keeps a stuffed email off public profile payloads", async () => {
    const storage = memory();
    const email = "tape@example.com";
    await signIn(storage);
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}") as {
      accounts: Array<{ contact: string | null; profile: Record<string, unknown> | null }>;
    };
    const account = raw.accounts.find((item) => item.contact === email);
    expect(account?.profile).toBeTruthy();
    if (!account?.profile) return;
    account.profile.email = email;
    account.profile.contact = email;
    account.profile.phone = "+12125550148";
    storage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const reloaded = setup(storage).backend;
    const snap = reloaded.getSnapshot();
    const allowed = new Set(["id", "alias", "bioQuote", "hashtags", "joinedAt", "avatar"]);
    for (const user of [snap.me, ...snap.users, ...snap.directory, ...snap.blockedUsers]) {
      if (!user) continue;
      for (const key of Object.keys(user)) expect(allowed.has(key), key).toBe(true);
    }
    const published = JSON.stringify({
      me: snap.me,
      users: snap.users,
      directory: snap.directory,
      blockedUsers: snap.blockedUsers,
      session: snap.session,
    });
    expect(published).not.toContain(email);
    expect(published).not.toContain("@");
    expect(published).not.toContain("12125550148");
    expect(snap.session).toEqual({ userId: snap.me?.id, method: "email" });
    expect(reloaded.debug().contacts).toContain(email);
    const stored = JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}") as {
      accounts: Array<{ contact: string | null; profile: Record<string, unknown> | null }>;
    };
    const kept = stored.accounts.find((item) => item.contact === email);
    expect(kept?.profile && "email" in kept.profile).toBe(false);
    expect(kept?.profile && "contact" in kept.profile).toBe(false);
    expect(kept?.profile && "phone" in kept.profile).toBe(false);
    expect(kept?.contact).toBe(email);
  });

  it("searches rooms by words and hashtags, and keeps a created room", async () => {
    const { backend } = await signIn();
    expect(backend.getSnapshot().rooms).toEqual([]);

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
    expect(searchRooms(rooms, "#mouse")).toEqual([]);
    expect(backend.getSnapshot().joinedRoomIds[0]).toBe(created.roomId);

    expect(backend.leaveRoom(created.roomId).ok).toBe(true);
    expect(backend.getSnapshot().joinedRoomIds).not.toContain(created.roomId);
    expect(backend.postChatter({ body: "Still here.", roomId: created.roomId }).ok).toBe(false);
    expect(backend.joinRoom(created.roomId).ok).toBe(true);
    expect(backend.postChatter({ body: "Back in.", roomId: created.roomId }).ok).toBe(true);
  });

  it("posts, blasts, blocks, and burns without turning a friend into a tap", async () => {
    const { backend } = await signIn();
    const peerId = await addPerson(backend, "loom@example.com", "LoomMouse");
    await signBack(backend);
    expect(backend.getSnapshot().threads).toHaveLength(0);
    const added = backend.addFriend(peerId);
    expect(added.ok).toBe(true);
    expect(backend.getSnapshot().friendIds).toContain(peerId);
    expect(backend.getSnapshot().threads).toHaveLength(0);
    expect(backend.getSnapshot().tapsRemaining).toBe(20);
    expect(backend.getSnapshot().outgoingTaps).toHaveLength(0);

    const roomId = ownRoom(backend);
    const posted = backend.postChatter({
      body: "Flat, and saying so before the print.",
      roomId,
      blastFriendIds: [peerId],
    });
    expect(posted.ok).toBe(true);
    const after = backend.getSnapshot();
    expect(after.chatters.some((chatter) => chatter.body.includes("Flat, and saying"))).toBe(true);
    const thread = after.threads.find((item) => item.peerId === peerId);
    expect(thread?.preview.startsWith("Blast")).toBe(true);
    expect(thread?.origin).toBe("direct");

    backend.signOut();
    expect((await backend.requestOtp({ contact: "loom@example.com" })).ok).toBe(true);
    expect((await backend.verifyOtp("000000")).ok).toBe(true);
    expect(backend.joinRoom(roomId).ok).toBe(true);
    expect(backend.postChatter({ body: "From the other desk.", roomId }).ok).toBe(true);
    await signBack(backend);
    expect(backend.getSnapshot().chatters.some((chatter) => chatter.body === "From the other desk.")).toBe(true);
    backend.blockUser(peerId);
    expect(backend.getSnapshot().chatters.some((chatter) => chatter.authorId === peerId)).toBe(false);
    expect(backend.getSnapshot().chatters.some((chatter) => chatter.body.includes("Flat, and saying"))).toBe(true);
    expect(backend.openThread(peerId).ok).toBe(false);
    backend.unblockUser(peerId);
    expect(backend.getSnapshot().chatters.some((chatter) => chatter.authorId === peerId)).toBe(true);

    const open = backend.openThread(peerId);
    expect(open.ok).toBe(true);
    if (!open.ok) return;
    expect(backend.sendMessage(open.threadId, "Still with you.").ok).toBe(true);
    backend.burnThread(open.threadId);
    expect(backend.getSnapshot().threads.some((item) => item.id === open.threadId)).toBe(false);
    expect(backend.endMatch(open.threadId).ok).toBe(false);

    backend.report({ targetType: "user", targetId: peerId, reason: "Spam or solicitation" });
    expect(backend.debug().reports).toBe(1);
    expect(backend.addFriend(after.me!.id).ok).toBe(false);
  });

  it("limits taps to twenty a day and resets on the next local day", async () => {
    const storage = memory();
    const { backend, advance } = await signIn(storage);
    await peersFor(backend, 21);
    const snap = backend.getSnapshot();
    const ids = [...snap.matchPeerIds];
    expect(ids).toHaveLength(20);
    const extra = snap.matchEligibleIds.find((id) => !ids.includes(id));
    expect(extra).toBeTruthy();
    for (const id of ids) {
      expect(backend.tapUser(id).ok).toBe(true);
    }
    expect(backend.getSnapshot().tapsRemaining).toBe(0);
    expect(backend.getSnapshot().outgoingTaps).toHaveLength(20);
    const blocked = backend.tapUser(extra!);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toMatch(/20 a day/);

    const restored = setup(storage).backend;
    expect(restored.getSnapshot().tapsRemaining).toBe(0);
    expect(restored.getSnapshot().outgoingTaps).toHaveLength(20);

    advance(24 * 60 * 60 * 1000);
    expect(backend.getSnapshot().tapsRemaining).toBe(20);
    expect(backend.tapUser(extra!).ok).toBe(true);
  });

  it("keeps an outgoing tap pending and opens MSG when an incoming tap is accepted", async () => {
    const accepted = await signIn(memory(), "TapeMouse", () => 0.1, true);
    const [peerId] = await peersFor(accepted.backend, 1);
    expect(accepted.backend.tapUser(peerId).ok).toBe(true);
    const after = accepted.backend.getSnapshot();
    expect(after.tapsRemaining).toBe(19);
    expect(after.outgoingTaps.map((tap) => tap.toId)).toEqual([peerId]);
    expect(after.threads.some((item) => item.peerId === peerId)).toBe(false);
    expect(after.matchPeerIds).not.toContain(peerId);
    accepted.backend.refreshMatch();
    expect(accepted.backend.getSnapshot().matchPeerIds).not.toContain(peerId);

    const incoming = await receiveTap(accepted.backend, "incoming@example.com", "IncomingMouse");
    const started = accepted.backend.acceptTap(incoming.tapId);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const thread = accepted.backend.getSnapshot().threads.find((item) => item.id === started.threadId);
    expect(thread?.origin).toBe("match");
    expect(accepted.backend.endMatch(started.threadId).ok).toBe(true);
    accepted.backend.refreshMatch();
    expect(accepted.backend.getSnapshot().matchPeerIds).not.toContain(incoming.peerId);
  });

  it("drops an unanswered tap after an hour and keeps them out of the next shuffle", async () => {
    const { backend, advance } = await signIn();
    await peersFor(backend, 1);
    const peerId = freshPeer(backend);
    expect(backend.tapUser(peerId).ok).toBe(true);
    const pending = backend.getSnapshot().outgoingTaps[0]!;
    expect(pending.toId).toBe(peerId);
    expect(pending.expiresAt - pending.createdAt).toBe(60 * 60 * 1000);
    advance(60 * 60 * 1000);
    const after = backend.getSnapshot();
    expect(after.outgoingTaps).toHaveLength(0);
    expect(after.matchEligibleIds).not.toContain(peerId);
    backend.refreshMatch();
    expect(backend.getSnapshot().matchPeerIds).not.toContain(peerId);
  });

  it("ends a chat from the list and does not restore that thread", async () => {
    const { backend } = await signIn();
    const [peerId] = await peersFor(backend, 1);
    const threadId = openedThread(backend, peerId);
    const thread = backend.getSnapshot().threads.find((item) => item.id === threadId)!;
    expect(backend.sendMessage(thread.id, "Still with you.").ok).toBe(true);
    expect(backend.endChat(thread.id).ok).toBe(true);
    const after = backend.getSnapshot();
    expect(after.threads.some((item) => item.id === thread.id)).toBe(false);
    expect(after.messages.some((item) => item.threadId === thread.id)).toBe(false);
    const again = backend.openThread(thread.peerId);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.threadId).not.toBe(thread.id);
    expect(backend.getSnapshot().messages.some((item) => item.threadId === thread.id)).toBe(false);
  });

  it("ends a match chat and keeps that alias out of the next pass", async () => {
    const accepted = await signIn(memory(), "TapeMouse", () => 0.1, true);
    const incoming = await receiveTap(accepted.backend, "incoming@example.com", "IncomingMouse");
    const started = accepted.backend.acceptTap(incoming.tapId);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(accepted.backend.endChat(started.threadId).ok).toBe(true);
    expect(accepted.backend.getSnapshot().threads.some((item) => item.id === started.threadId)).toBe(false);
    accepted.backend.refreshMatch();
    expect(accepted.backend.getSnapshot().matchPeerIds).not.toContain(incoming.peerId);
    expect(accepted.backend.getSnapshot().matchEligibleIds).not.toContain(incoming.peerId);
  });

  it("deletes messages and room lines on a rolling 3-day clock", async () => {
    const { backend, advance } = await signIn();
    const [peerId] = await peersFor(backend, 1);
    const threadId = openedThread(backend, peerId);
    const roomId = ownRoom(backend);
    expect(backend.sendMessage(threadId, "Still here today.").ok).toBe(true);
    expect(backend.postChatter({ body: "Fresh take.", roomId }).ok).toBe(true);

    advance(26 * 60 * 60 * 1000);
    const nextDay = backend.getSnapshot();
    expect(nextDay.messages.some((message) => message.body === "Still here today.")).toBe(true);
    expect(nextDay.chatters.some((chatter) => chatter.body === "Fresh take.")).toBe(true);

    advance(MESSAGE_TTL_MS - 26 * 60 * 60 * 1000);
    const atWindow = backend.getSnapshot();
    expect(atWindow.messages.some((message) => message.body === "Still here today.")).toBe(true);

    advance(1);
    const expired = backend.getSnapshot();
    expect(expired.messages.some((message) => message.body === "Still here today.")).toBe(false);
    expect(expired.chatters.some((chatter) => chatter.body === "Fresh take.")).toBe(false);

    expect(backend.sendMessage(threadId, "New after the purge.").ok).toBe(true);
    expect(backend.postChatter({ body: "New room line.", roomId }).ok).toBe(true);
    const revived = backend.getSnapshot();
    expect(revived.messages.some((message) => message.body === "New after the purge.")).toBe(true);
    expect(revived.chatters.some((chatter) => chatter.body === "New room line.")).toBe(true);
  });

  it("purges old and personal messages already stored in the mock", async () => {
    const storage = memory();
    const { backend } = await signIn(storage);
    const [peerId] = await peersFor(backend, 1);
    const keptId = openedThread(backend, peerId);
    const roomId = ownRoom(backend);
    expect(backend.sendMessage(keptId, "Keep this line.").ok).toBe(true);
    const raw = storage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as {
      savedAt: number;
      threads: { id: string; a: string }[];
      messages: object[];
      chatters: object[];
      notifications: object[];
    };
    const thread = parsed.threads[0]!;
    const meId = backend.getSnapshot().me!.id;
    const old = parsed.savedAt - MESSAGE_TTL_MS - 60_000;
    parsed.messages.push({
      id: "msg_old",
      threadId: thread.id,
      senderId: thread.a,
      body: "Ancient note",
      kind: "text",
      createdAt: old,
    });
    parsed.chatters.push({
      id: "cht_old",
      authorId: meId,
      roomId,
      body: "Ancient room line",
      createdAt: old,
    });
    parsed.messages.push({
      id: "msg_pii",
      threadId: thread.id,
      senderId: thread.a,
      body: "mail me at jane@gmail.com",
      kind: "text",
      createdAt: parsed.savedAt,
    });
    parsed.chatters.push({
      id: "cht_pii",
      authorId: meId,
      roomId,
      body: "telegram is t.me/nightowl",
      createdAt: parsed.savedAt,
    });
    parsed.notifications.push({
      id: "note_pii",
      userId: backend.getSnapshot().me!.id,
      title: "Alias",
      body: "ping jane@gmail.com",
      createdAt: parsed.savedAt,
      read: false,
    });
    storage.setItem(STORAGE_KEY, JSON.stringify(parsed));

    const restored = setup(storage).backend;
    const snap = restored.getSnapshot();
    const json = JSON.stringify(snap);
    expect(json).not.toContain("Ancient note");
    expect(json).not.toContain("Ancient room line");
    expect(json).not.toContain("jane@gmail.com");
    expect(json).not.toContain("t.me/nightowl");
    expect(storage.getItem(STORAGE_KEY)).not.toContain("jane@gmail.com");
    expect(snap.messages.some((message) => message.body === "Keep this line.")).toBe(true);
  });

  it("masks personal contact details in rooms and private threads", async () => {
    const { backend } = await signIn();
    const [peerId] = await peersFor(backend, 1);
    const threadId = openedThread(backend, peerId);
    const roomId = ownRoom(backend);
    const blocked = [
      ["text me 212-555-0199", "212-555-0199"],
      ["jane at gmail dot com", "jane at gmail dot com"],
      ["trader@bloomberg.net", "trader@bloomberg.net"],
      ["uuid 12345678-1234-1234-1234-123456789abc", "12345678-1234-1234-1234-123456789abc"],
      ["https://t.me/nightowl", "t.me/nightowl"],
      ["@nightowl_desk", "@nightowl_desk"],
      ["wechat: night_owl", "night_owl"],
    ];
    for (const [body, raw] of blocked) {
      const direct = backend.sendMessage(threadId, body);
      expect(direct.ok, body).toBe(true);
      if (direct.ok) {
        expect(direct.pii_redacted, body).toBe(true);
        expect(direct.redacted_types.length, body).toBeGreaterThan(0);
      }
      const room = backend.postChatter({ body, roomId });
      expect(room.ok, body).toBe(true);
      const stored = JSON.stringify(backend.getSnapshot());
      expect(stored, body).not.toContain(raw);
      expect(stored, body).toContain("****");
    }

    expect(backend.sendMessage(threadId, "Still short. Smaller than I sound.").ok).toBe(true);
    expect(
      backend.postChatter({
        body: "The dollar is the tell.",
        roomId,
        news: NEWS_ITEMS[1],
      }).ok,
    ).toBe(true);
    const link = backend.postChatter({
      body: "",
      roomId,
      news: {
        url: "https://t.me/nightowl",
        source: "Telegram",
        title: "A channel",
        summary: "Come through.",
      },
    });
    expect(link.ok).toBe(true);
    const afterLink = JSON.stringify(backend.getSnapshot());
    expect(afterLink).not.toContain("t.me/nightowl");
    expect(afterLink).not.toContain("telegram.me");
  });

  it("rejects a taken alias", async () => {
    const { backend } = setup();
    await addPerson(backend, "first@example.com", "OtherMouse");
    backend.signOut();
    await backend.requestOtp({ contact: "second@example.com" });
    await backend.verifyOtp("000000");
    const taken = backend.completeProfile({
      alias: "OtherMouse",
      bioQuote: "Already taken",
      hashtags: ["books"],
    });
    expect(taken.ok).toBe(false);
  });

  it("blasts the same message into every selected chat, or into none", async () => {
    const { backend } = await signIn();
    const [first, second] = await peersFor(backend, 2);
    const ids = [openedThread(backend, first!), openedThread(backend, second!)];
    expect(backend.getSnapshot().threads.length).toBeGreaterThan(1);
    const empty = backend.blastThreads([], "Hello");
    expect(empty.ok).toBe(false);
    const masked = backend.blastThreads(ids, "text me 212-555-0199");
    expect(masked.ok).toBe(true);
    if (masked.ok) expect(masked.pii_redacted).toBe(true);
    expect(JSON.stringify(backend.getSnapshot())).not.toContain("212-555-0199");
    expect(backend.getSnapshot().messages.filter((message) => message.body === "text me ****").length).toBe(ids.length);

    const sent = backend.blastThreads(ids, "Same note for both desks.");
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.sent).toBe(ids.length);
    for (const id of ids) {
      const hit = backend.getSnapshot().messages.filter((message) => message.threadId === id && message.body === "Same note for both desks.");
      expect(hit).toHaveLength(1);
      expect(hit[0]?.kind).toBe("blast");
    }
  });

  it("stores a file and a link card, and drops them with the message", async () => {
    const storage = memory();
    const { backend, advance } = await signIn(storage);
    const [peerId] = await peersFor(backend, 1);
    const threadId = openedThread(backend, peerId);
    const roomId = ownRoom(backend);
    const file = textFile("hello", "attachment-token.txt");
    expect(backend.sendMessage(threadId, "See this", { attachment: file }).ok).toBe(true);
    expect(
      backend.sendMessage(threadId, "Worth a look", {
        news: {
          url: "https://www.reuters.com/markets/us/dollar-holds",
          source: "Reuters",
          title: "Dollar Holds",
          summary: "Shared from Reuters.",
        },
      }).ok,
    ).toBe(true);
    const room = backend.postChatter({ body: "", roomId, attachment: textFile("room", "brief.txt") });
    expect(room.ok).toBe(true);
    const live = backend.getSnapshot();
    expect(live.messages.some((message) => message.attachment?.name === "attachment-token.txt")).toBe(true);
    expect(live.messages.some((message) => message.news?.title === "Dollar Holds")).toBe(true);
    expect(live.chatters.some((chatter) => chatter.attachment?.name === "brief.txt")).toBe(true);

    const pii = backend.sendMessage(threadId, "mail jane@gmail.com", { attachment: textFile("notes", "clean.txt") });
    expect(pii.ok).toBe(true);
    if (pii.ok) expect(pii.pii_redacted).toBe(true);
    const leaked = backend.sendMessage(threadId, "see this", {
      attachment: textFile("token AKIAIOSFODNN7EXAMPLE", "secret.txt"),
    });
    expect(leaked.ok).toBe(false);
    if (!leaked.ok) expect(leaked.error).toBe(NOTICE.attachmentBlocked);
    const tel = backend.sendMessage(threadId, "", {
      news: { url: "tel:+12125550148", source: "Phone", title: "Call", summary: "Now" },
    });
    expect(tel.ok).toBe(false);
    const stored = JSON.stringify(backend.getSnapshot());
    expect(stored).not.toContain("jane@gmail.com");
    expect(stored).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(stored).not.toContain("secret.txt");
    expect(stored).not.toContain("tel:+12125550148");

    advance(MESSAGE_TTL_MS + 5);
    const expired = JSON.stringify(backend.getSnapshot());
    expect(expired).not.toContain("attachment-token.txt");
    expect(expired).not.toContain("Dollar Holds");
    expect(expired).not.toContain("brief.txt");
    expect(storage.getItem(STORAGE_KEY)).not.toContain("attachment-token.txt");
  });

  it("counts heat from lines in a room the person created", async () => {
    const { backend } = await signIn();
    expect(backend.getSnapshot().chatters).toEqual([]);
    const roomId = ownRoom(backend);
    expect(heatBars(0)).toBe(0);
    expect(backend.postChatter({ body: "First line.", roomId }).ok).toBe(true);
    const snap = backend.getSnapshot();
    const newest = Math.max(...snap.chatters.map((chatter) => chatter.createdAt));
    const day = 24 * 60 * 60 * 1000;
    const recent = snap.chatters.filter((chatter) => chatter.roomId === roomId && newest - chatter.createdAt <= day);
    expect(recent).toHaveLength(1);
    expect(heatBars(recent.length)).toBe(1);
  });

  it("saves a mouse on the profile and restores it", async () => {
    const storage = memory();
    const { backend } = await signIn(storage);
    expect(backend.getSnapshot().users).toHaveLength(1);
    expect(backend.setAvatar(defaultAvatar()).ok).toBe(true);
    expect(backend.getSnapshot().me?.avatar?.fur).toBe("Agouti Brown");
    const me = backend.getSnapshot().me!;
    expect(backend.updateProfile({ alias: me.alias, bioQuote: "Still flat", hashtags: me.hashtags }).ok).toBe(true);
    expect(backend.getSnapshot().me?.avatar?.tail).toBe("Classic Smooth");
    const restored = setup(storage).backend;
    expect(restored.getSnapshot().me?.avatar?.skin).toBe("Soft Pink");
    expect(backend.setAvatar(null).ok).toBe(true);
    expect(backend.getSnapshot().me?.avatar ?? null).toBeNull();
  });

  it("keeps a permanent chat on MSG after the 3-day purge and drops a quiet one", async () => {
    const { backend, advance } = await signIn();
    const [keepPeer, dropPeer] = await peersFor(backend, 2);
    const keepId = openedThread(backend, keepPeer!);
    const dropId = openedThread(backend, dropPeer!);
    const snap = backend.getSnapshot();
    const keep = snap.threads.find((thread) => thread.id === keepId)!;
    const drop = snap.threads.find((thread) => thread.id === dropId)!;
    expect(keep.permanent).toBe(false);
    expect(backend.setThreadPermanent(keep.id, true).ok).toBe(true);
    expect(backend.sendMessage(keep.id, "Stay with me.").ok).toBe(true);
    expect(backend.sendMessage(drop.id, "This one fades.").ok).toBe(true);

    advance(MESSAGE_TTL_MS + 5);
    const after = backend.getSnapshot();
    expect(after.messages.some((message) => message.body === "Stay with me.")).toBe(false);
    expect(after.messages.some((message) => message.body === "This one fades.")).toBe(false);
    const kept = after.threads.find((thread) => thread.id === keep.id);
    expect(kept?.permanent).toBe(true);
    expect(kept?.preview).toBe("No messages in the last 3 days");
    expect(after.threads.some((thread) => thread.id === drop.id)).toBe(false);

    expect(backend.sendMessage(keep.id, "Still kept.").ok).toBe(true);
    const revived = backend.getSnapshot().threads.find((thread) => thread.id === keep.id);
    expect(revived?.permanent).toBe(true);
    expect(revived?.preview).toContain("Still kept.");
    expect(backend.getSnapshot().messages.some((message) => message.body === "Stay with me.")).toBe(false);

    const again = backend.openThread(drop.peerId);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(backend.getSnapshot().threads.some((thread) => thread.peerId === drop.peerId)).toBe(true);

    expect(backend.endChat(keep.id).ok).toBe(true);
    expect(backend.getSnapshot().threads.some((thread) => thread.id === keep.id)).toBe(false);
  });

  it("drops retired bots and rooms from a store that still has them", async () => {
    const storage = memory();
    const { backend } = await signIn(storage);
    const meId = backend.getSnapshot().me!.id;
    const [friendId] = await peersFor(backend, 1);
    const roomId = ownRoom(backend);
    expect(backend.addFriend(friendId).ok).toBe(true);
    const threadId = openedThread(backend, friendId!);
    expect(backend.sendMessage(threadId, "Stay with me.").ok).toBe(true);
    expect(backend.postChatter({ body: "My line.", roomId }).ok).toBe(true);

    const raw = JSON.parse(storage.getItem(STORAGE_KEY)!) as {
      savedAt: number;
      accounts: object[];
      rooms: object[];
      memberships: object[];
      chatters: object[];
      threads: object[];
      messages: object[];
      friends: object[];
      notifications: object[];
      taps: object[];
      batches: { userId: string; peerIds: string[] }[];
    };
    const now = raw.savedAt;
    for (const id of RETIRED_USER_IDS) {
      if (id === "usr_folio") {
        raw.accounts.push({
          userId: id,
          contact: "folio@example.com",
          seated: true,
          profile: { id, alias: "KeptMouse", bioQuote: "A real quote", hashtags: ["books"], joinedAt: now },
        });
        continue;
      }
      raw.accounts.push({
        userId: id,
        contact: null,
        seated: true,
        profile: { id, alias: "StockMouse", bioQuote: "Stock quote", hashtags: ["markets"], joinedAt: now },
      });
    }
    for (const id of RETIRED_ROOM_IDS) {
      raw.rooms.push({
        id,
        name: "Stock Room",
        blurb: "Planted room",
        hashtags: ["markets"],
        createdBy: "usr_macro",
        createdAt: now,
        listeners: 40,
      });
      raw.memberships.push({ userId: meId, roomId: id, joinedAt: now });
      raw.chatters.push({
        id: `seed_${id}_4_usr_macro`,
        authorId: "usr_macro",
        roomId: id,
        body: "STOCK_LINE",
        createdAt: now,
      });
    }
    raw.chatters.push(
      { id: "heat_room_market_0", authorId: "usr_macro", roomId: "room_market", body: "STOCK_HEAT", createdAt: now },
      { id: "cht_in_stock", authorId: meId, roomId: "room_market", body: "My line in a stock room", createdAt: now },
    );
    raw.rooms.push({
      id: "room_custom_open",
      name: "Market Open",
      blurb: "My own open.",
      hashtags: ["markets"],
      createdBy: meId,
      createdAt: now,
      listeners: 1,
    });
    raw.memberships.push({ userId: meId, roomId: "room_custom_open", joinedAt: now });
    raw.friends.push({ ownerId: meId, friendId: "usr_macro" }, { ownerId: meId, friendId: "usr_folio" });
    raw.threads.push(
      { id: "thr_stock", a: meId, b: "usr_macro", origin: "direct", updatedAt: now, unread: 1, keptBy: [meId], engagedBy: [meId] },
      { id: "thr_kept_real", a: meId, b: "usr_folio", origin: "direct", updatedAt: now, unread: 0, keptBy: [meId], engagedBy: [meId] },
    );
    raw.messages.push(
      { id: "msg_stock", threadId: "thr_stock", senderId: meId, body: "I wrote back to the stock alias.", kind: "text", createdAt: now },
      { id: "msg_folio", threadId: "thr_kept_real", senderId: "usr_folio", body: "Read anything this week that wasn't a memo?", kind: "text", createdAt: now },
      { id: "msg_folio_me", threadId: "thr_kept_real", senderId: meId, body: "This one stays.", kind: "text", createdAt: now },
    );
    raw.taps.push({ id: "tap_stock", fromId: "usr_keel", toId: meId, status: "pending", createdAt: now });
    raw.notifications.push({
      id: "note_stock",
      userId: meId,
      title: "Stock",
      body: "tapped you",
      peerId: "usr_keel",
      threadId: "thr_stock",
      createdAt: now,
      read: false,
    });
    const batch = raw.batches.find((item) => item.userId === meId);
    if (batch) batch.peerIds.push("usr_macro", "usr_folio");
    else raw.batches.push({ userId: meId, peerIds: [friendId!, "usr_macro", "usr_folio"] });
    storage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const restored = setup(storage).backend;
    const snap = restored.getSnapshot();
    expect(snap.me?.alias).toBe("TapeMouse");
    expect(snap.users.some((user) => user.alias === "StockMouse")).toBe(false);
    expect(snap.users.some((user) => user.alias === "KeptMouse")).toBe(true);
    expect(snap.users.some((user) => user.id === friendId)).toBe(true);
    expect(snap.directory.some((user) => user.id === "usr_macro")).toBe(false);
    expect(snap.friendIds).toContain(friendId);
    expect(snap.friendIds).toContain("usr_folio");
    expect(snap.friendIds).not.toContain("usr_macro");
    expect(snap.rooms.map((room) => room.id).sort()).toEqual([roomId, "room_custom_open"].sort());
    expect(snap.joinedRoomIds).toEqual(expect.arrayContaining([roomId, "room_custom_open"]));
    for (const id of RETIRED_ROOM_IDS) {
      expect(snap.rooms.some((room) => room.id === id)).toBe(false);
      expect(snap.joinedRoomIds).not.toContain(id);
    }
    for (const id of RETIRED_USER_IDS) {
      if (id === "usr_folio") continue;
      expect(snap.users.some((user) => user.id === id)).toBe(false);
      expect(snap.matchPeerIds).not.toContain(id);
      expect(snap.threads.some((thread) => thread.peerId === id)).toBe(false);
    }
    expect(snap.chatters.some((chatter) => chatter.body === "My line.")).toBe(true);
    expect(snap.chatters.some((chatter) => chatter.body === "STOCK_LINE")).toBe(false);
    expect(snap.chatters.some((chatter) => chatter.body === "STOCK_HEAT")).toBe(false);
    expect(snap.chatters.some((chatter) => chatter.body === "My line in a stock room")).toBe(false);
    expect(snap.threads.map((thread) => thread.id).sort()).toEqual([threadId, "thr_kept_real"].sort());
    expect(snap.messages.some((message) => message.body === "Stay with me.")).toBe(true);
    expect(snap.messages.some((message) => message.body === "This one stays.")).toBe(true);
    expect(snap.messages.some((message) => message.body === "I wrote back to the stock alias.")).toBe(false);
    expect(snap.incomingTaps).toEqual([]);
    expect(JSON.stringify(snap)).not.toContain("folio@example.com");
    const stored = storage.getItem(STORAGE_KEY) ?? "";
    expect(stored).not.toContain("usr_macro");
    expect(stored).not.toContain("usr_keel");
    expect(stored).not.toContain("room_market");
    expect(stored).not.toContain("STOCK_LINE");
    expect(stored).toContain("Stay with me.");
    expect(stored).toContain("Mouse Hole");
    expect(stored).toContain("usr_folio");
    expect(threadIsUnsolicited(
      { a: meId, b: "usr_lane", origin: "direct", keptBy: [], engagedBy: [] },
      [{ senderId: "usr_lane", body: "Not advice. Also not nothing.", kind: "blast" }],
      new Set([meId]),
    )).toBe(true);
  });

  it("reset clears this device and does not restore stock rooms", async () => {
    const { backend } = await signIn();
    const roomId = ownRoom(backend);
    expect(backend.getSnapshot().rooms.map((room) => room.id)).toEqual([roomId]);
    backend.resetFloor();
    const snap = backend.getSnapshot();
    expect(snap.session).toBeNull();
    expect(snap.me).toBeNull();
    expect(snap.rooms).toEqual([]);
    expect(snap.users).toEqual([]);
    const dumped = JSON.stringify(snap);
    for (const id of [...RETIRED_USER_IDS, ...RETIRED_ROOM_IDS]) expect(dumped).not.toContain(id);
  });

  it("does not invent stock chats from the live timer", async () => {
    const queued: { fn: (() => void) | null } = { fn: null };
    const storage = memory();
    let clock = 1_700_000_000_000;
    const backend = createLocalBackend({
      storage,
      now: () => clock,
      random: () => 0.7,
      schedule: (fn) => {
        queued.fn = fn;
        return () => {
          if (queued.fn === fn) queued.fn = null;
        };
      },
    });
    await backend.requestOtp({ contact: "tape@example.com" });
    await backend.verifyOtp("000000");
    expect(backend.completeProfile({ alias: "TapeMouse", bioQuote: "Flat into the print", hashtags: ["markets"] }).ok).toBe(true);
    expect(backend.getSnapshot().threads).toHaveLength(0);
    expect(backend.getSnapshot().rooms).toHaveLength(0);
    backend.startLive();
    queued.fn?.();
    clock += 1;
    const snap = backend.getSnapshot();
    expect(snap.threads).toHaveLength(0);
    expect(snap.messages).toHaveLength(0);
    expect(snap.rooms).toHaveLength(0);
    expect(snap.incomingTaps).toHaveLength(0);
    expect(snap.directory).toHaveLength(0);
    expect(backend.openThread("usr_macro").ok).toBe(false);
    backend.stopLive();
  });

  it("puts the signed-in mouse on that profile for MSG to read", async () => {
    const { backend } = await signIn();
    const [peerId] = await peersFor(backend, 1);
    const me = backend.getSnapshot().me!;
    expect(backend.setAvatar(defaultAvatar()).ok).toBe(true);
    const users = backend.getSnapshot().users;
    expect(users.find((user) => user.id === me.id)?.avatar?.fur).toBe("Agouti Brown");
    expect(users.find((user) => user.id === peerId)?.avatar ?? null).toBeNull();
    openedThread(backend, peerId!);
    expect(backend.getSnapshot().threads.map((thread) => thread.peerId)).toEqual([peerId]);
  });

  it("drops an opened chat with no messages after 3 days of inactivity", async () => {
    const { backend, advance } = await signIn();
    await peersFor(backend, 1);
    const peerId = freshPeer(backend);
    const opened = backend.openThread(peerId);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(backend.getSnapshot().threads.some((thread) => thread.id === opened.threadId)).toBe(true);
    advance(MESSAGE_TTL_MS + 5);
    expect(backend.getSnapshot().threads.some((thread) => thread.id === opened.threadId)).toBe(false);
  });
});
