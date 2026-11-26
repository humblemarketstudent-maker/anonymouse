import { describe, expect, it } from "vitest";
import { MESSAGE_TTL_MS, type ChatAttachment } from "@/backend/types";
import { defaultAvatar } from "@/lib/avatar";
import { NOTICE } from "@/moderation/notices";
import { NEWS_ITEMS } from "@/data/floor";
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

function openedThread(backend: ReturnType<typeof setup>["backend"], peerId = "usr_byte") {
  const opened = backend.openThread(peerId);
  expect(opened.ok).toBe(true);
  if (!opened.ok) throw new Error("expected a thread");
  return opened.threadId;
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
    expect(snap.friendIds.length).toBe(4);
    expect(snap.threads).toHaveLength(0);
    expect(snap.messages).toHaveLength(0);
    expect(json).not.toContain("Still short. Smaller than I sound.");
    expect(snap.joinedRoomIds).toEqual(["room_night", "room_library", "room_market"]);
    expect(snap.incomingTaps.map((tap) => tap.fromId)).toEqual(["usr_keel"]);
    expect(snap.matchPeerIds).toHaveLength(20);
    expect(snap.matchPeerIds).not.toContain("usr_keel");
    expect(snap.matchEligibleIds.length).toBeGreaterThanOrEqual(20);
    expect(snap.topHashtags).toHaveLength(20);
    expect(snap.topHashtags[0]!.count).toBeGreaterThanOrEqual(snap.topHashtags[1]!.count);
    expect(snap.tapsRemaining).toBe(20);

    const restored = setup(storage).backend;
    expect(restored.getSnapshot().me?.alias).toBe("TapeMouse");
    expect(restored.getSnapshot().me?.hashtags).toEqual(["markets", "nyc"]);
    expect(restored.getSnapshot().joinedRoomIds).toEqual(snap.joinedRoomIds);
    expect(restored.getSnapshot().incomingTaps).toHaveLength(1);
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
    expect(backend.getSnapshot().tapsRemaining).toBe(20);
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

  it("limits taps to twenty a day and resets on the next local day", async () => {
    const storage = memory();
    const { backend, advance } = await signIn(storage);
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
    const peerId = freshPeer(accepted.backend);
    expect(accepted.backend.tapUser(peerId).ok).toBe(true);
    const after = accepted.backend.getSnapshot();
    expect(after.tapsRemaining).toBe(19);
    expect(after.outgoingTaps.map((tap) => tap.toId)).toEqual([peerId]);
    expect(after.threads.some((item) => item.peerId === peerId)).toBe(false);
    expect(after.matchPeerIds).not.toContain(peerId);
    accepted.backend.refreshMatch();
    expect(accepted.backend.getSnapshot().matchPeerIds).not.toContain(peerId);

    const incoming = after.incomingTaps[0]!;
    const started = accepted.backend.acceptTap(incoming.id);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const thread = accepted.backend.getSnapshot().threads.find((item) => item.id === started.threadId);
    expect(thread?.origin).toBe("match");
    expect(accepted.backend.endMatch(started.threadId).ok).toBe(true);
    accepted.backend.refreshMatch();
    expect(accepted.backend.getSnapshot().matchPeerIds).not.toContain(incoming.fromId);
  });

  it("drops an unanswered tap after an hour and keeps them out of the next shuffle", async () => {
    const { backend, advance } = await signIn();
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
    const threadId = openedThread(backend, "usr_byte");
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
    const incoming = accepted.backend.getSnapshot().incomingTaps[0]!;
    const started = accepted.backend.acceptTap(incoming.id);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(accepted.backend.endChat(started.threadId).ok).toBe(true);
    expect(accepted.backend.getSnapshot().threads.some((item) => item.id === started.threadId)).toBe(false);
    accepted.backend.refreshMatch();
    expect(accepted.backend.getSnapshot().matchPeerIds).not.toContain(incoming.fromId);
    expect(accepted.backend.getSnapshot().matchEligibleIds).not.toContain(incoming.fromId);
  });

  it("deletes messages and room lines on a rolling 3-day clock", async () => {
    const { backend, advance } = await signIn();
    const threadId = openedThread(backend);
    expect(backend.sendMessage(threadId, "Still here today.").ok).toBe(true);
    expect(backend.postChatter({ body: "Fresh take.", roomId: "room_market" }).ok).toBe(true);

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
    expect(expired.chatters.some((chatter) => chatter.body.includes("Auction feels heavy"))).toBe(false);

    expect(backend.sendMessage(threadId, "New after the purge.").ok).toBe(true);
    expect(backend.postChatter({ body: "New room line.", roomId: "room_market" }).ok).toBe(true);
    const revived = backend.getSnapshot();
    expect(revived.messages.some((message) => message.body === "New after the purge.")).toBe(true);
    expect(revived.chatters.some((chatter) => chatter.body === "New room line.")).toBe(true);
  });

  it("purges old and personal messages already stored in the mock", async () => {
    const storage = memory();
    const { backend } = await signIn(storage);
    const keptId = openedThread(backend, "usr_byte");
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
      authorId: "usr_loom",
      roomId: "room_market",
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
      authorId: "usr_loom",
      roomId: "room_market",
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
    const threadId = openedThread(backend);
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
      const room = backend.postChatter({ body, roomId: "room_market" });
      expect(room.ok, body).toBe(true);
      const stored = JSON.stringify(backend.getSnapshot());
      expect(stored, body).not.toContain(raw);
      expect(stored, body).toContain("****");
    }

    expect(backend.sendMessage(threadId, "Still short. Smaller than I sound.").ok).toBe(true);
    expect(
      backend.postChatter({
        body: "The dollar is the tell.",
        roomId: "room_market",
        news: NEWS_ITEMS[1],
      }).ok,
    ).toBe(true);
    const link = backend.postChatter({
      body: "",
      roomId: "room_market",
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
    await backend.requestOtp({ contact: "second@example.com" });
    await backend.verifyOtp("000000");
    const taken = backend.completeProfile({
      alias: "MacroMouse",
      bioQuote: "Already taken",
      hashtags: ["books"],
    });
    expect(taken.ok).toBe(false);
  });

  it("blasts the same message into every selected chat, or into none", async () => {
    const { backend } = await signIn();
    const ids = [openedThread(backend, "usr_macro"), openedThread(backend, "usr_folio")];
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
    const threadId = openedThread(backend);
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
    const room = backend.postChatter({ body: "", roomId: "room_market", attachment: textFile("room", "brief.txt") });
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

  it("spreads room heat across several bar levels", async () => {
    const { backend } = await signIn();
    const snap = backend.getSnapshot();
    const newest = Math.max(...snap.chatters.map((chatter) => chatter.createdAt));
    const day = 24 * 60 * 60 * 1000;
    const recent = (roomId: string) =>
      snap.chatters.filter((chatter) => chatter.roomId === roomId && newest - chatter.createdAt <= day).length;
    expect(heatBars(recent("room_market"))).toBe(5);
    expect(heatBars(recent("room_ai"))).toBe(4);
    expect(heatBars(recent("room_builders"))).toBe(3);
    expect(heatBars(recent("room_crypto"))).toBe(2);
    expect(heatBars(recent("room_deals"))).toBe(1);
    expect(heatBars(recent("room_night"))).toBe(0);
    expect(heatBars(recent("room_library"))).toBe(0);
  });

  it("saves a mouse on the profile and restores it", async () => {
    const storage = memory();
    const { backend } = await signIn(storage);
    expect(backend.getSnapshot().users.find((user) => user.id === "usr_macro")?.avatar?.eyes).toBe("Glowing Neon");
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
    const keepId = openedThread(backend, "usr_macro");
    const dropId = openedThread(backend, "usr_folio");
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

  it("drops seeded and unsolicited chats, and keeps ones the user joined", async () => {
    const storage = memory();
    const { backend } = await signIn(storage);
    const meId = backend.getSnapshot().me!.id;
    const raw = JSON.parse(storage.getItem(STORAGE_KEY)!) as {
      savedAt: number;
      threads: object[];
      messages: object[];
      notifications: object[];
    };
    const now = raw.savedAt;
    raw.threads.push(
      { id: "thr_seed", a: meId, b: "usr_macro", origin: "direct", updatedAt: now, unread: 1, keptBy: [] },
      { id: "thr_kept", a: meId, b: "usr_folio", origin: "direct", updatedAt: now, unread: 0, keptBy: [meId] },
      { id: "thr_real", a: meId, b: "usr_byte", origin: "direct", updatedAt: now, unread: 0, keptBy: [] },
      { id: "thr_blast", a: meId, b: "usr_lane", origin: "direct", updatedAt: now, unread: 1, keptBy: [] },
      { id: "thr_match", a: meId, b: "usr_keel", origin: "match", updatedAt: now, unread: 0, keptBy: [] },
      { id: "thr_open", a: meId, b: "usr_loom", origin: "direct", updatedAt: now, unread: 0, keptBy: [], engagedBy: [meId] },
    );
    raw.messages.push(
      { id: "m1", threadId: "thr_seed", senderId: "usr_macro", body: "You still short the front end, or did someone talk you out of it?", kind: "text", createdAt: now },
      { id: "m2", threadId: "thr_seed", senderId: meId, body: "Still short. Smaller than I sound.", kind: "text", createdAt: now },
      { id: "m3", threadId: "thr_kept", senderId: "usr_folio", body: "Read anything this week that wasn't a memo?", kind: "text", createdAt: now },
      { id: "m4", threadId: "thr_real", senderId: meId, body: "I started this.", kind: "text", createdAt: now },
      { id: "m5", threadId: "thr_blast", senderId: "usr_lane", body: "Not advice. Also not nothing.", kind: "blast", createdAt: now },
      { id: "m6", threadId: "thr_match", senderId: "usr_keel", body: "You tapped. I'm here.", kind: "text", createdAt: now },
    );
    raw.notifications.push({
      id: "n1",
      userId: meId,
      title: "MacroMouse",
      body: "Respect. The loud version of that trade is the one that gets hurt.",
      threadId: "thr_seed",
      createdAt: now,
      read: false,
    });
    storage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const restored = setup(storage).backend;
    const ids = restored.getSnapshot().threads.map((thread) => thread.id).sort();
    expect(ids).toEqual(["thr_kept", "thr_match", "thr_open", "thr_real"]);
    const stored = storage.getItem(STORAGE_KEY) ?? "";
    expect(stored).not.toContain("You still short the front end");
    expect(stored).not.toContain("Respect. The loud version");
    expect(stored).not.toContain("thr_blast");
    expect(restored.getSnapshot().messages.some((message) => message.body === "I started this.")).toBe(true);
    expect(threadIsUnsolicited(
      { a: meId, b: "usr_lane", origin: "direct", keptBy: [], engagedBy: [] },
      [{ senderId: "usr_lane", body: "Not advice. Also not nothing.", kind: "blast" }],
      new Set([meId]),
    )).toBe(true);
  });

  it("does not invent a private chat from the live timer", async () => {
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
    backend.startLive();
    queued.fn?.();
    expect(backend.getSnapshot().threads).toHaveLength(0);
    const opened = backend.openThread("usr_macro");
    expect(opened.ok).toBe(true);
    const before = backend.getSnapshot().messages.length;
    queued.fn?.();
    clock += 1;
    expect(backend.getSnapshot().threads).toHaveLength(1);
    expect(backend.getSnapshot().messages.length).toBeGreaterThan(before);
    backend.stopLive();
  });

  it("puts the signed-in mouse on that profile for MSG to read", async () => {
    const { backend } = await signIn();
    const me = backend.getSnapshot().me!;
    expect(backend.setAvatar(defaultAvatar()).ok).toBe(true);
    const users = backend.getSnapshot().users;
    expect(users.find((user) => user.id === me.id)?.avatar?.fur).toBe("Agouti Brown");
    expect(users.find((user) => user.id === "usr_folio")?.avatar?.headwear).toBe("Beanie");
    expect(users.find((user) => user.id === "usr_byte")?.avatar ?? null).toBeNull();
    openedThread(backend, "usr_byte");
    expect(backend.getSnapshot().threads.map((thread) => thread.peerId)).toEqual(["usr_byte"]);
  });

  it("drops an opened chat with no messages after 3 days of inactivity", async () => {
    const { backend, advance } = await signIn();
    const peerId = freshPeer(backend);
    const opened = backend.openThread(peerId);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(backend.getSnapshot().threads.some((thread) => thread.id === opened.threadId)).toBe(true);
    advance(MESSAGE_TTL_MS + 5);
    expect(backend.getSnapshot().threads.some((thread) => thread.id === opened.threadId)).toBe(false);
  });
});
