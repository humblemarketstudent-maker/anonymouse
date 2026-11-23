import {
  DEMO_OTP,
  type AppNotification,
  type Backend,
  type Chatter,
  type DirectMessage,
  type Flash,
  type Method,
  type NewsLink,
  type PublicUser,
  type Sector,
  type Snapshot,
  type ThreadSummary,
} from "@/backend/types";
import {
  BLAST_LINES,
  LIVE_FEED,
  LIVE_ROOMS,
  MOCK_USERS,
  NEWS_ITEMS,
  QUESTION_REPLIES,
  REPLIES,
  SEAT_THREADS,
  SEED_CHATTERS,
  SEEDED_FRIENDS,
  roomById,
} from "@/data/floor";
import { profileError } from "@/lib/profile";

const STORAGE_KEY = "anonymouse.v1";
const TAKE_MAX = 280;
const DM_MAX = 600;

interface Account {
  userId: string;
  method: Method | null;
  contact: string | null;
  profile: PublicUser | null;
  seated: boolean;
}

interface ThreadRec {
  id: string;
  a: string;
  b: string;
  updatedAt: number;
  unread: number;
}

interface NotificationRec extends AppNotification {
  userId: string;
}

interface ReportRec {
  id: string;
  reporterId: string;
  targetType: "user" | "chatter";
  targetId: string;
  reason: string;
  createdAt: number;
}

interface State {
  accounts: Account[];
  sessionUserId: string | null;
  chatters: Chatter[];
  threads: ThreadRec[];
  messages: DirectMessage[];
  friends: { ownerId: string; friendId: string }[];
  blocks: { ownerId: string; blockedId: string }[];
  reports: ReportRec[];
  notifications: NotificationRec[];
}

interface Persisted extends State {
  version: 1;
  savedAt: number;
}

export interface Kv {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalOptions {
  storage?: Kv;
  now?: () => number;
  random?: () => number;
  schedule?: (fn: () => void, ms: number) => () => void;
}

export interface LocalBackend extends Backend {
  debug(): { reports: number; contacts: string[] };
}

function memoryKv(): Kv {
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

function browserKv(): Kv {
  return {
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* ignore quota / private mode */
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

function cleanText(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31)) continue;
    out += char;
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeContact(method: Method, contact: string): string | null {
  if (method === "email") {
    const value = contact.trim().toLowerCase();
    if (value.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
    return value;
  }
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function validNews(news: NewsLink | undefined): news is NewsLink {
  if (!news) return false;
  return (
    news.url.startsWith("http://") || news.url.startsWith("https://")
  ) && news.title.trim().length > 0 && news.source.trim().length > 0;
}

export function createLocalBackend(options: LocalOptions = {}): LocalBackend {
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;
  const schedule =
    options.schedule ??
    ((fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    });
  const storage =
    options.storage ?? (typeof localStorage === "undefined" ? memoryKv() : browserKv());

  let seq = 0;
  const uid = (prefix: string) => {
    seq += 1;
    const rand = Math.floor(random() * 1e9).toString(36);
    return `${prefix}_${now().toString(36)}_${rand}_${seq.toString(36)}`;
  };

  let state = load();
  let flashes: Flash[] = [];
  let announcement = "";
  let presence = { threadId: null as string | null };
  let pendingOtp: { contact: string; method: Method } | null = null;
  const pendingReply = new Set<string>();
  let feedCursor = 0;
  let roomCursor = 0;
  const mutedUntil = new Map<string, number>();
  let cancelLive: (() => void) | null = null;
  const listeners = new Set<() => void>();
  let snapshot = derive();
  persist();

  function load(): State {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    try {
      const parsed = JSON.parse(raw) as Persisted;
      if (parsed.version !== 1 || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.chatters)) {
        return seedState();
      }
      const next: State = {
        accounts: parsed.accounts,
        sessionUserId: parsed.sessionUserId ?? null,
        chatters: parsed.chatters,
        threads: parsed.threads ?? [],
        messages: parsed.messages ?? [],
        friends: parsed.friends ?? [],
        blocks: parsed.blocks ?? [],
        reports: parsed.reports ?? [],
        notifications: parsed.notifications ?? [],
      };
      if (next.sessionUserId && !next.accounts.some((account) => account.userId === next.sessionUserId)) {
        next.sessionUserId = null;
      }
      const delta = now() - (parsed.savedAt ?? now());
      if (delta > 2000) shift(next, delta);
      return next;
    } catch {
      return seedState();
    }
  }

  function seedState(): State {
    const clock = now();
    const aliasToId = new Map(MOCK_USERS.map((user) => [user.alias, user.id]));
    const chatters: Chatter[] = SEED_CHATTERS.flatMap((item) => {
      const authorId = aliasToId.get(item.alias);
      if (!authorId) return [];
      const chatter: Chatter = {
        id: `seed_${item.roomId ?? "feed"}_${item.minutesAgo}_${authorId}`,
        authorId,
        roomId: item.roomId ?? null,
        body: item.body,
        createdAt: clock - item.minutesAgo * 60_000,
      };
      if (item.newsIndex != null && NEWS_ITEMS[item.newsIndex]) {
        chatter.news = NEWS_ITEMS[item.newsIndex];
      }
      return [chatter];
    });
    return {
      accounts: MOCK_USERS.map((user) => ({
        userId: user.id,
        method: null,
        contact: null,
        seated: true,
        profile: { ...user, joinedAt: clock - 1000 * 60 * 60 * 24 * 30 },
      })),
      sessionUserId: null,
      chatters,
      threads: [],
      messages: [],
      friends: [],
      blocks: [],
      reports: [],
      notifications: [],
    };
  }

  function shift(target: State, delta: number) {
    for (const account of target.accounts) {
      if (account.profile) account.profile.joinedAt += delta;
    }
    for (const chatter of target.chatters) chatter.createdAt += delta;
    for (const thread of target.threads) thread.updatedAt += delta;
    for (const message of target.messages) message.createdAt += delta;
    for (const note of target.notifications) note.createdAt += delta;
  }

  function persist() {
    const payload: Persisted = { version: 1, savedAt: now(), ...state };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function emit() {
    snapshot = derive();
    persist();
    for (const listener of [...listeners]) listener();
  }

  function sessionAccount(): Account | null {
    if (!state.sessionUserId) return null;
    return state.accounts.find((account) => account.userId === state.sessionUserId) ?? null;
  }

  function me(): PublicUser | null {
    return sessionAccount()?.profile ?? null;
  }

  function profiles(): PublicUser[] {
    return state.accounts.flatMap((account) => (account.profile ? [account.profile] : []));
  }

  function blockedSet(): Set<string> {
    const id = state.sessionUserId;
    if (!id) return new Set();
    return new Set(state.blocks.filter((block) => block.ownerId === id).map((block) => block.blockedId));
  }

  function isBlocked(ownerId: string, otherId: string) {
    return state.blocks.some((block) => block.ownerId === ownerId && block.blockedId === otherId);
  }

  function isMuted(peerId: string) {
    return (mutedUntil.get(peerId) ?? 0) > now();
  }

  function isFriend(ownerId: string, otherId: string) {
    return state.friends.some((friend) => friend.ownerId === ownerId && friend.friendId === otherId);
  }

  function derive(): Snapshot {
    const account = sessionAccount();
    const profile = account?.profile ?? null;
    const blocked = blockedSet();
    const users = profiles();
    const directory = users.filter((user) => user.id !== profile?.id && !blocked.has(user.id));
    const blockedUsers = users.filter((user) => blocked.has(user.id));
    const friendIds = profile
      ? state.friends
          .filter((friend) => friend.ownerId === profile.id && !blocked.has(friend.friendId))
          .map((friend) => friend.friendId)
      : [];
    const chatters = state.chatters
      .filter((chatter) => !blocked.has(chatter.authorId))
      .sort((a, b) => a.createdAt - b.createdAt);
    const threads: ThreadSummary[] = profile
      ? state.threads
          .filter((thread) => thread.a === profile.id || thread.b === profile.id)
          .map((thread) => {
            const peerId = thread.a === profile.id ? thread.b : thread.a;
            return { thread, peerId };
          })
          .filter(({ peerId }) => !blocked.has(peerId))
          .map(({ thread, peerId }) => ({
            id: thread.id,
            peerId,
            updatedAt: thread.updatedAt,
            unread: thread.unread,
            preview: previewOf(thread.id),
          }))
          .sort((a, b) => b.updatedAt - a.updatedAt)
      : [];
    const visibleIds = new Set(threads.map((thread) => thread.id));
    const messages = state.messages
      .filter((message) => visibleIds.has(message.threadId))
      .sort((a, b) => a.createdAt - b.createdAt);
    const notifications = profile
      ? state.notifications
          .filter((note) => note.userId === profile.id && (!note.peerId || !blocked.has(note.peerId)))
          .map((note) => ({
            id: note.id,
            title: note.title,
            body: note.body,
            createdAt: note.createdAt,
            read: note.read,
            threadId: note.threadId,
            peerId: note.peerId,
          }))
          .sort((a, b) => b.createdAt - a.createdAt)
      : [];
    return {
      session: account && account.method ? { userId: account.userId, method: account.method } : null,
      me: profile,
      users,
      directory,
      blockedUsers,
      friendIds,
      chatters,
      threads,
      messages,
      notifications,
      flashes,
      announcement,
    };
  }

  function previewOf(threadId: string): string {
    const msgs = state.messages
      .filter((message) => message.threadId === threadId)
      .sort((a, b) => a.createdAt - b.createdAt);
    const last = msgs[msgs.length - 1];
    if (!last) return "New line";
    const prefix = last.kind === "blast" ? "Blast · " : "";
    return (prefix + (last.body || last.news?.title || "Link")).slice(0, 160);
  }

  function profileById(id: string): PublicUser | null {
    return state.accounts.find((account) => account.userId === id)?.profile ?? null;
  }

  function trimChannel(roomId: string | null, max = 80) {
    const matching = state.chatters.filter((chatter) => chatter.roomId === roomId);
    if (matching.length <= max) return;
    const oldest = [...matching].sort((a, b) => a.createdAt - b.createdAt).slice(0, matching.length - max);
    const drop = new Set(oldest.map((chatter) => chatter.id));
    state.chatters = state.chatters.filter((chatter) => !drop.has(chatter.id));
  }

  function trimMessages(threadId: string) {
    const matching = state.messages.filter((message) => message.threadId === threadId);
    if (matching.length <= 200) return;
    const drop = new Set(matching.slice(0, matching.length - 200).map((message) => message.id));
    state.messages = state.messages.filter((message) => !drop.has(message.id));
  }

  function findThread(a: string, b: string) {
    return state.threads.find((thread) => (thread.a === a && thread.b === b) || (thread.a === b && thread.b === a));
  }

  function ensureThread(a: string, b: string): ThreadRec {
    const found = findThread(a, b);
    if (found) return found;
    const thread: ThreadRec = { id: uid("thr"), a, b, updatedAt: now(), unread: 0 };
    state.threads.push(thread);
    return thread;
  }

  function pushNote(input: { userId: string; title: string; body: string; threadId?: string; peerId?: string; flash: boolean }) {
    const note: NotificationRec = {
      id: uid("note"),
      userId: input.userId,
      title: input.title,
      body: input.body,
      threadId: input.threadId,
      peerId: input.peerId,
      createdAt: now(),
      read: false,
    };
    state.notifications.unshift(note);
    state.notifications = state.notifications.slice(0, 40);
    if (input.flash) {
      flashes = [...flashes, { id: uid("flash"), title: input.title, body: input.body, threadId: input.threadId }].slice(-5);
    }
  }

  function addDirect(input: {
    thread: ThreadRec;
    senderId: string;
    body: string;
    kind: "text" | "blast";
    news?: NewsLink;
    notify: boolean;
    flash: boolean;
  }) {
    const message: DirectMessage = {
      id: uid("msg"),
      threadId: input.thread.id,
      senderId: input.senderId,
      body: input.body,
      kind: input.kind,
      news: input.news,
      createdAt: now(),
    };
    state.messages.push(message);
    input.thread.updatedAt = message.createdAt;
    trimMessages(input.thread.id);
    const sessionId = state.sessionUserId;
    const incoming =
      !!sessionId &&
      input.senderId !== sessionId &&
      (input.thread.a === sessionId || input.thread.b === sessionId);
    if (incoming && presence.threadId !== input.thread.id) input.thread.unread += 1;
    if (incoming && input.notify && sessionId) {
      const sender = profileById(input.senderId);
      const title = input.kind === "blast" ? `${sender?.alias ?? "Someone"} blasted you` : sender?.alias ?? "New line";
      const body = input.body || input.news?.title || "New message";
      const viewing = presence.threadId === input.thread.id;
      pushNote({
        userId: sessionId,
        title,
        body,
        threadId: input.thread.id,
        peerId: input.senderId,
        flash: input.flash && !viewing,
      });
    }
  }

  function pickAuthor(sector?: Sector): PublicUser | null {
    const blocked = blockedSet();
    const pool = profiles().filter((user) => user.id.startsWith("usr_") && user.id !== state.sessionUserId && !blocked.has(user.id));
    const matched = sector ? pool.filter((user) => user.sector === sector) : pool;
    const list = matched.length ? matched : pool;
    if (!list.length) return null;
    return list[Math.floor(random() * list.length)] ?? null;
  }

  function pushChatter(author: PublicUser, body: string, roomId: string | null, news?: NewsLink) {
    state.chatters.push({
      id: uid("cht"),
      authorId: author.id,
      roomId,
      body,
      news,
      createdAt: now(),
    });
    trimChannel(roomId);
    if (me()) announcement = roomId ? `${author.alias} in a room` : `New chatter from ${author.alias}`;
  }

  function queueReply(threadId: string, peerId: string, prompt: string) {
    if (!peerId.startsWith("usr_") || pendingReply.has(threadId) || isMuted(peerId)) return;
    pendingReply.add(threadId);
    const delay = 1400 + Math.floor(random() * 2200);
    schedule(() => {
      pendingReply.delete(threadId);
      const thread = state.threads.find((item) => item.id === threadId);
      const sessionId = state.sessionUserId;
      if (!thread || !sessionId || isBlocked(sessionId, peerId)) return;
      const bank = prompt.includes("?") ? QUESTION_REPLIES : REPLIES;
      const body = bank[Math.floor(random() * bank.length)] ?? REPLIES[0]!;
      addDirect({ thread, senderId: peerId, body, kind: "text", notify: true, flash: true });
      emit();
    }, delay);
  }

  function seat(userId: string) {
    for (const friendId of SEEDED_FRIENDS) {
      state.friends.push({ ownerId: userId, friendId });
    }
    for (const script of SEAT_THREADS) {
      const thread = ensureThread(userId, script.peerId);
      for (const line of [...script.lines].sort((a, b) => b.minutesAgo - a.minutesAgo)) {
        const senderId = line.from === "me" ? userId : script.peerId;
        const createdAt = now() - line.minutesAgo * 60_000;
        const message: DirectMessage = {
          id: uid("msg"),
          threadId: thread.id,
          senderId,
          body: line.body,
          kind: line.blast ? "blast" : "text",
          news: line.newsIndex != null ? NEWS_ITEMS[line.newsIndex] : undefined,
          createdAt,
        };
        state.messages.push(message);
        thread.updatedAt = createdAt;
      }
      thread.unread = script.unread;
      const peer = profileById(script.peerId);
      const last = script.lines.reduce((latest, line) => (line.minutesAgo < latest.minutesAgo ? line : latest), script.lines[0]!);
      if (peer && last.from === "peer") {
        pushNote({
          userId,
          title: last.blast ? `${peer.alias} blasted you` : peer.alias,
          body: last.body,
          threadId: thread.id,
          peerId: script.peerId,
          flash: false,
        });
      }
    }
  }

  function runLive() {
    const roll = random();
    if (roll < 0.62) {
      const take = LIVE_FEED[feedCursor % LIVE_FEED.length];
      feedCursor += 1;
      if (!take) return;
      const author = pickAuthor(take.sector);
      if (!author) return;
      pushChatter(author, take.body, null, take.newsIndex != null ? NEWS_ITEMS[take.newsIndex] : undefined);
      return;
    }
    if (roll < 0.86) {
      const take = LIVE_ROOMS[roomCursor % LIVE_ROOMS.length];
      roomCursor += 1;
      if (!take?.roomId) return;
      const author = pickAuthor(take.sector);
      if (!author) return;
      pushChatter(author, take.body, take.roomId, take.newsIndex != null ? NEWS_ITEMS[take.newsIndex] : undefined);
      return;
    }
    const profile = me();
    if (!profile) {
      const take = LIVE_FEED[feedCursor % LIVE_FEED.length];
      feedCursor += 1;
      const author = take ? pickAuthor(take.sector) : null;
      if (take && author) pushChatter(author, take.body, null);
      return;
    }
    const friends = state.friends
      .filter((friend) => friend.ownerId === profile.id && !isBlocked(profile.id, friend.friendId) && !isMuted(friend.friendId))
      .map((friend) => friend.friendId)
      .filter((id) => id.startsWith("usr_"));
    if (!friends.length) return;
    const peerId = friends[Math.floor(random() * friends.length)]!;
    const news = NEWS_ITEMS[Math.floor(random() * NEWS_ITEMS.length)];
    const body = BLAST_LINES[Math.floor(random() * BLAST_LINES.length)] ?? BLAST_LINES[0]!;
    const thread = ensureThread(profile.id, peerId);
    addDirect({ thread, senderId: peerId, body, kind: "blast", news, notify: true, flash: true });
  }

  const api: LocalBackend = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    async requestOtp(input) {
      const contact = normalizeContact(input.method, input.contact);
      if (!contact) {
        return {
          ok: false,
          error:
            input.method === "email"
              ? "Enter an email address. It never appears on the floor."
              : "Enter a phone number, at least 8 digits. It never appears on the floor.",
        };
      }
      pendingOtp = { contact, method: input.method };
      return { ok: true };
    },
    async verifyOtp(code) {
      if (!pendingOtp) return { ok: false, error: "Request a code first." };
      const digits = code.replace(/\D/g, "");
      if (digits.length !== 6) return { ok: false, error: "Enter the 6-digit code." };
      if (digits !== DEMO_OTP) return { ok: false, error: "That code isn't valid. The demo code is 000000." };
      const existing = state.accounts.find((account) => account.contact === pendingOtp?.contact);
      if (existing) {
        state.sessionUserId = existing.userId;
        pendingOtp = null;
        emit();
        return { ok: true, needsProfile: !existing.profile };
      }
      const account: Account = {
        userId: uid("hum"),
        method: pendingOtp.method,
        contact: pendingOtp.contact,
        profile: null,
        seated: false,
      };
      state.accounts.push(account);
      state.sessionUserId = account.userId;
      pendingOtp = null;
      emit();
      return { ok: true, needsProfile: true };
    },
    completeProfile(input) {
      const account = sessionAccount();
      if (!account) return { ok: false, error: "Sign in first." };
      const error = profileError(input, profiles(), account.userId);
      if (error) return { ok: false, error };
      account.profile = {
        id: account.userId,
        alias: input.alias.trim(),
        bioQuote: input.bioQuote.trim(),
        sector: input.sector,
        joinedAt: now(),
      };
      if (!account.seated) {
        seat(account.userId);
        account.seated = true;
      }
      emit();
      return { ok: true };
    },
    updateProfile(input) {
      const account = sessionAccount();
      if (!account?.profile) return { ok: false, error: "Set up your alias first." };
      const error = profileError(input, profiles(), account.userId);
      if (error) return { ok: false, error };
      account.profile = {
        ...account.profile,
        alias: input.alias.trim(),
        bioQuote: input.bioQuote.trim(),
        sector: input.sector,
      };
      emit();
      return { ok: true };
    },
    signOut() {
      state.sessionUserId = null;
      pendingOtp = null;
      emit();
    },
    postChatter(input) {
      const profile = me();
      if (!profile) return { ok: false, error: "Set up your alias first." };
      if (input.roomId && !roomById(input.roomId)) return { ok: false, error: "That room isn't on the floor." };
      const body = cleanText(input.body);
      const news = validNews(input.news) ? input.news : undefined;
      if (!body && !news) return { ok: false, error: "Write a take or attach a link." };
      if (body.length > TAKE_MAX) return { ok: false, error: "Keep it to 280 characters. This floor is fast." };
      const chatter: Chatter = {
        id: uid("cht"),
        authorId: profile.id,
        roomId: input.roomId,
        body,
        news,
        createdAt: now(),
      };
      state.chatters.push(chatter);
      trimChannel(input.roomId);
      const blastIds = [...new Set(input.blastFriendIds ?? [])];
      for (const friendId of blastIds) {
        if (!isFriend(profile.id, friendId) || isBlocked(profile.id, friendId)) continue;
        const thread = ensureThread(profile.id, friendId);
        addDirect({
          thread,
          senderId: profile.id,
          body: body || news?.title || "",
          kind: "blast",
          news,
          notify: false,
          flash: false,
        });
      }
      emit();
      return { ok: true, id: chatter.id };
    },
    sendMessage(threadId, raw) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      const thread = state.threads.find((item) => item.id === threadId);
      if (!thread || (thread.a !== profile.id && thread.b !== profile.id)) {
        return { ok: false, error: "That line is gone." };
      }
      const peerId = thread.a === profile.id ? thread.b : thread.a;
      if (isBlocked(profile.id, peerId)) return { ok: false, error: "Unblock this alias before you message them." };
      const body = cleanText(raw);
      if (!body) return { ok: false, error: "Write something first." };
      if (body.length > DM_MAX) return { ok: false, error: "Keep the message under 600 characters." };
      addDirect({ thread, senderId: profile.id, body, kind: "text", notify: false, flash: false });
      queueReply(thread.id, peerId, body);
      emit();
      return { ok: true };
    },
    openThread(peerId) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      if (peerId === profile.id) return { ok: false, error: "You can't message yourself." };
      const peer = profileById(peerId);
      if (!peer) return { ok: false, error: "That alias isn't on the floor." };
      if (isBlocked(profile.id, peerId)) return { ok: false, error: "Unblock this alias before you message them." };
      const thread = ensureThread(profile.id, peerId);
      emit();
      return { ok: true, threadId: thread.id };
    },
    burnThread(threadId) {
      const profile = me();
      if (!profile) return;
      const thread = state.threads.find((item) => item.id === threadId);
      if (!thread || (thread.a !== profile.id && thread.b !== profile.id)) return;
      state.threads = state.threads.filter((item) => item.id !== threadId);
      state.messages = state.messages.filter((message) => message.threadId !== threadId);
      state.notifications = state.notifications.filter((note) => note.threadId !== threadId);
      if (presence.threadId === threadId) presence.threadId = null;
      const peerId = thread.a === profile.id ? thread.b : thread.a;
      mutedUntil.set(peerId, now() + 3 * 60_000);
      emit();
    },
    addFriend(userId) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      if (userId === profile.id) return { ok: false, error: "You can't add yourself." };
      if (!profileById(userId)) return { ok: false, error: "That alias isn't on the floor." };
      if (isBlocked(profile.id, userId)) return { ok: false, error: "Unblock this alias before you add them." };
      if (!isFriend(profile.id, userId)) state.friends.push({ ownerId: profile.id, friendId: userId });
      emit();
      return { ok: true };
    },
    removeFriend(userId) {
      const profile = me();
      if (!profile) return;
      state.friends = state.friends.filter((friend) => !(friend.ownerId === profile.id && friend.friendId === userId));
      emit();
    },
    blockUser(userId) {
      const profile = me();
      if (!profile || userId === profile.id) return;
      if (!isBlocked(profile.id, userId)) state.blocks.push({ ownerId: profile.id, blockedId: userId });
      state.friends = state.friends.filter((friend) => !(friend.ownerId === profile.id && friend.friendId === userId));
      emit();
    },
    unblockUser(userId) {
      const profile = me();
      if (!profile) return;
      state.blocks = state.blocks.filter((block) => !(block.ownerId === profile.id && block.blockedId === userId));
      emit();
    },
    report(input) {
      const profile = me();
      if (!profile) return;
      const reason = cleanText(input.reason);
      if (!reason) return;
      state.reports.push({
        id: uid("rpt"),
        reporterId: profile.id,
        targetType: input.targetType,
        targetId: input.targetId,
        reason,
        createdAt: now(),
      });
      emit();
    },
    markThreadRead(threadId) {
      const profile = me();
      if (!profile) return;
      const thread = state.threads.find((item) => item.id === threadId);
      if (!thread || thread.unread === 0) return;
      if (thread.a !== profile.id && thread.b !== profile.id) return;
      thread.unread = 0;
      emit();
    },
    markNotificationsRead() {
      const profile = me();
      if (!profile) return;
      let changed = false;
      for (const note of state.notifications) {
        if (note.userId === profile.id && !note.read) {
          note.read = true;
          changed = true;
        }
      }
      if (changed) emit();
    },
    ackFlash(id) {
      if (!flashes.some((flash) => flash.id === id)) return;
      flashes = flashes.filter((flash) => flash.id !== id);
      emit();
    },
    setPresence(next) {
      presence = { threadId: next.threadId };
    },
    resetFloor() {
      state = seedState();
      flashes = [];
      announcement = "";
      pendingOtp = null;
      presence = { threadId: null };
      emit();
    },
    startLive() {
      if (cancelLive) return;
      const loop = () => {
        runLive();
        emit();
        const delay = 8000 + Math.floor(random() * 6000);
        cancelLive = schedule(loop, delay);
      };
      cancelLive = schedule(loop, 4500);
    },
    stopLive() {
      cancelLive?.();
      cancelLive = null;
    },
    debug() {
      return {
        reports: state.reports.length,
        contacts: state.accounts.flatMap((account) => (account.contact ? [account.contact] : [])),
      };
    },
  };

  return api;
}
