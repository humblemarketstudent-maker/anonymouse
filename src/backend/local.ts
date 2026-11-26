import {
  DEMO_OTP,
  MATCH_COOLDOWN_MS,
  MATCH_PAGE,
  MESSAGE_TTL_MS,
  TAP_LIMIT,
  TAP_WINDOW_MS,
  type AppNotification,
  type Backend,
  type ChatAttachment,
  type Chatter,
  type DirectMessage,
  type Flash,
  type ModerationStamp,
  type NewsLink,
  type PublicUser,
  type Result,
  type Snapshot,
  type ThreadOrigin,
  type ThreadSummary,
} from "@/backend/types";
import {
  BLAST_LINES,
  LIVE_ROOMS,
  MATCH_GREETINGS,
  MOCK_USERS,
  NEWS_ITEMS,
  QUESTION_REPLIES,
  REPLIES,
  SEAT_THREADS,
  SEED_CHATTERS,
  SEED_ROOMS,
  HEAT_FILL,
  SEEDED_FRIENDS,
  SEEDED_INCOMING,
  SEEDED_ROOMS,
} from "@/data/floor";
import { coerceAvatar, DEMO_AVATARS, parseAvatar, type MouseAvatar } from "@/lib/avatar";
import { contactViolation } from "@/lib/contact";
import type { Journal } from "@/moderation/journal";
import { createJournal } from "@/moderation/journal";
import { enforceSync } from "@/moderation/pipeline";
import type { RateStore } from "@/moderation/rate";
import { createRateStore } from "@/moderation/rate";
import { attachmentPreview, validateAttachment } from "@/lib/files";
import { collectHashtags } from "@/lib/hashtags";
import { profileError } from "@/lib/profile";
import { localDayKey } from "@/lib/time";

export const STORAGE_KEY = "anonymouse.v2";
const TAKE_MAX = 280;
const DM_MAX = 600;
const STORE_LIMIT = 4_500_000;

interface Account {
  userId: string;
  contact: string | null;
  profile: PublicUser | null;
  seated: boolean;
}

interface ThreadRec {
  id: string;
  a: string;
  b: string;
  origin: ThreadOrigin;
  updatedAt: number;
  unread: number;
  /** User ids who keep this chat on their MSG list after it goes quiet. */
  keptBy: string[];
  /** User ids who started, accepted, sent in, or re-opened this chat. */
  engagedBy: string[];
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

interface RoomRec {
  id: string;
  name: string;
  blurb: string;
  hashtags: string[];
  createdBy: string;
  createdAt: number;
  listeners: number;
}

interface Membership {
  userId: string;
  roomId: string;
  joinedAt: number;
}

interface TapRec {
  id: string;
  fromId: string;
  toId: string;
  status: "pending" | "accepted" | "declined" | "ended";
  createdAt: number;
  resolvedAt?: number;
  threadId?: string;
  resolveAt?: number;
  expiresAt?: number;
  willAccept?: boolean;
}

interface Exclusion {
  ownerId: string;
  peerId: string;
  until: number;
}

interface MatchBatch {
  userId: string;
  peerIds: string[];
}

interface TapDay {
  userId: string;
  dayKey: string;
  used: number;
}

interface State {
  accounts: Account[];
  sessionUserId: string | null;
  rooms: RoomRec[];
  memberships: Membership[];
  chatters: Chatter[];
  threads: ThreadRec[];
  messages: DirectMessage[];
  friends: { ownerId: string; friendId: string }[];
  blocks: { ownerId: string; blockedId: string }[];
  reports: ReportRec[];
  notifications: NotificationRec[];
  taps: TapRec[];
  exclusions: Exclusion[];
  batches: MatchBatch[];
  tapDays: TapDay[];
}

interface Persisted extends State {
  version: 2;
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
  journal?: Journal;
  rate?: RateStore;
}

export interface LocalBackend extends Backend {
  debug(): { reports: number; contacts: string[] };
  /**
   * Create or restore the on-device account after a code has already been checked.
   * The phone stays on `Account.contact` for this device and is not copied onto the public snapshot.
   */
  establishSession(contact: string): Result<{ needsProfile: boolean }>;
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

export function normalizePhone(contact: string): string | null {
  const trimmed = contact.trim();
  if (!trimmed || trimmed.includes("@")) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/**
 * Older builds planted demo 1:1 threads at sign-in and also invented blasts
 * into chats the user had never opened. A thread stays when the person
 * kept it, accepted it, sent their own line, or re-opened it.
 */
export function threadIsUnsolicited(
  thread: { a: string; b: string; origin: ThreadOrigin; keptBy: string[]; engagedBy?: string[] },
  lines: { senderId: string; body: string; kind?: "text" | "blast" }[],
  humanIds: ReadonlySet<string>,
): boolean {
  if (thread.origin === "match") return false;
  const humans = [thread.a, thread.b].filter((id) => humanIds.has(id));
  if (humans.length !== 1) return false;
  const human = humans[0]!;
  if (thread.keptBy.includes(human) || thread.engagedBy?.includes(human)) return false;
  if (lines.length === 0) return false;
  const peer = thread.a === human ? thread.b : thread.a;
  const script = SEAT_THREADS.find((item) => item.peerId === peer);
  const fromMe = new Set(script?.lines.filter((line) => line.from === "me").map((line) => line.body) ?? []);
  const fromPeer = new Set(script?.lines.filter((line) => line.from === "peer").map((line) => line.body) ?? []);
  const blasts = new Set<string>(BLAST_LINES);
  if (lines.some((line) => line.senderId === human && !fromMe.has(line.body))) return false;
  return lines.every((line) => {
    if (line.senderId === human) return fromMe.has(line.body);
    if (line.kind === "blast" && blasts.has(line.body)) return true;
    return fromPeer.has(line.body);
  });
}

function omitUnsolicited(target: State) {
  const humanIds = new Set(target.accounts.filter((account) => account.contact).map((account) => account.userId));
  const drop = new Set(
    target.threads
      .filter((thread) =>
        threadIsUnsolicited(
          thread,
          target.messages.filter((message) => message.threadId === thread.id),
          humanIds,
        ),
      )
      .map((thread) => thread.id),
  );
  for (const thread of target.threads) {
    if (drop.has(thread.id)) continue;
    const lines = target.messages.filter((message) => message.threadId === thread.id);
    for (const human of [thread.a, thread.b].filter((id) => humanIds.has(id))) {
      const peer = thread.a === human ? thread.b : thread.a;
      const script = SEAT_THREADS.find((item) => item.peerId === peer);
      const fromMe = new Set(script?.lines.filter((line) => line.from === "me").map((line) => line.body) ?? []);
      const participated =
        thread.origin === "match" ||
        thread.keptBy.includes(human) ||
        lines.some((line) => line.senderId === human && !fromMe.has(line.body));
      if (participated && !thread.engagedBy.includes(human)) thread.engagedBy.push(human);
    }
  }
  if (drop.size === 0) return;
  target.threads = target.threads.filter((thread) => !drop.has(thread.id));
  target.messages = target.messages.filter((message) => !drop.has(message.threadId));
  target.notifications = target.notifications.filter((note) => !note.threadId || !drop.has(note.threadId));
}

function validNews(news: NewsLink | undefined): news is NewsLink {
  if (!news) return false;
  return (
    (news.url.startsWith("http://") || news.url.startsWith("https://")) &&
    news.title.trim().length > 0 &&
    news.source.trim().length > 0
  );
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
  const journal = options.journal ?? createJournal(storage);
  const rate = options.rate ?? createRateStore();

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
  let pendingOtp: string | null = null;
  const pendingReply = new Set<string>();
  let roomCursor = 0;
  const mutedUntil = new Map<string, number>();
  let lastIncomingAt = 0;
  let cancelLive: (() => void) | null = null;
  const listeners = new Set<() => void>();
  expirePending();
  purgeHistory();
  let snapshot = derive();
  persist();

  function load(): State {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    try {
      const parsed = JSON.parse(raw) as Persisted;
      if (parsed.version !== 2 || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.rooms)) {
        return seedState();
      }
      const next: State = {
        accounts: parsed.accounts,
        sessionUserId: parsed.sessionUserId ?? null,
        rooms: parsed.rooms,
        memberships: parsed.memberships ?? [],
        chatters: parsed.chatters ?? [],
        threads: parsed.threads ?? [],
        messages: parsed.messages ?? [],
        friends: parsed.friends ?? [],
        blocks: parsed.blocks ?? [],
        reports: parsed.reports ?? [],
        notifications: parsed.notifications ?? [],
        taps: parsed.taps ?? [],
        exclusions: parsed.exclusions ?? [],
        batches: parsed.batches ?? [],
        tapDays: parsed.tapDays ?? [],
      };
      for (const account of next.accounts) {
        if (!account.profile) continue;
        if (!Array.isArray(account.profile.hashtags)) account.profile.hashtags = [];
        const avatar = coerceAvatar(account.profile.avatar);
        if (avatar) account.profile.avatar = avatar;
        else delete account.profile.avatar;
      }
      if (next.sessionUserId && !next.accounts.some((account) => account.userId === next.sessionUserId)) {
        next.sessionUserId = null;
      }
      for (const thread of next.threads) {
        if (!Array.isArray(thread.keptBy)) thread.keptBy = [];
        if (!Array.isArray(thread.engagedBy)) thread.engagedBy = [];
      }
      const delta = now() - (parsed.savedAt ?? now());
      if (delta > 2000) {
        for (const tap of next.taps) {
          if (tap.status === "pending" && tap.resolveAt && tap.resolveAt <= now()) {
            tap.resolveAt = parsed.savedAt;
          }
        }
        shift(next, delta);
      }
      omitUnsolicited(next);
      return next;
    } catch {
      return seedState();
    }
  }

  function seedState(): State {
    const clock = now();
    const aliasToId = new Map(MOCK_USERS.map((user) => [user.alias, user.id]));
    const roomIds = new Set(SEED_ROOMS.map((room) => room.id));
    const chatters: Chatter[] = SEED_CHATTERS.flatMap((item) => {
      const authorId = aliasToId.get(item.alias);
      if (!authorId || !roomIds.has(item.roomId)) return [];
      const chatter: Chatter = {
        id: `seed_${item.roomId}_${item.minutesAgo}_${authorId}`,
        authorId,
        roomId: item.roomId,
        body: item.body,
        createdAt: clock - item.minutesAgo * 60_000,
      };
      if (item.newsIndex != null && NEWS_ITEMS[item.newsIndex]) chatter.news = NEWS_ITEMS[item.newsIndex];
      return [chatter];
    });
    for (const fill of HEAT_FILL) {
      if (!roomIds.has(fill.roomId)) continue;
      fill.bodies.forEach((body, index) => {
        const author = MOCK_USERS[index % MOCK_USERS.length];
        if (!author) return;
        chatters.push({
          id: `heat_${fill.roomId}_${index}`,
          authorId: author.id,
          roomId: fill.roomId,
          body,
          createdAt: clock - (3 + index) * 60_000,
        });
      });
    }
    return {
      accounts: MOCK_USERS.map((user) => ({
        userId: user.id,
        contact: null,
        seated: true,
        profile: {
          ...user,
          joinedAt: clock - 1000 * 60 * 60 * 24 * 40,
          ...(DEMO_AVATARS[user.id] ? { avatar: DEMO_AVATARS[user.id] } : {}),
        },
      })),
      sessionUserId: null,
      rooms: SEED_ROOMS.map((room) => ({
        ...room,
        createdAt: clock - 1000 * 60 * 60 * 24 * 12,
      })),
      memberships: [],
      chatters,
      threads: [],
      messages: [],
      friends: [],
      blocks: [],
      reports: [],
      notifications: [],
      taps: [],
      exclusions: [],
      batches: [],
      tapDays: [],
    };
  }

  function shift(target: State, delta: number) {
    for (const account of target.accounts) {
      if (account.profile) account.profile.joinedAt += delta;
    }
    for (const room of target.rooms) room.createdAt += delta;
    for (const membership of target.memberships) membership.joinedAt += delta;
    // Room lines, direct messages, and thread activity stay on the wall clock.
    // Shifting them would freeze their age, and the 3-day purge would never see them age across visits.
    for (const note of target.notifications) note.createdAt += delta;
    for (const tap of target.taps) {
      tap.createdAt += delta;
      if (tap.resolvedAt) tap.resolvedAt += delta;
      if (tap.resolveAt) tap.resolveAt += delta;
    }
  }

  function persist() {
    const payload: Persisted = { version: 2, savedAt: now(), ...state };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function emit() {
    purgeHistory();
    snapshot = derive();
    persist();
    for (const listener of [...listeners]) listener();
  }

  function sessionAccount(): Account | null {
    if (!state.sessionUserId) return null;
    const account = state.accounts.find((item) => item.userId === state.sessionUserId) ?? null;
    if (!account?.contact) return null;
    return account;
  }

  function me(): PublicUser | null {
    return sessionAccount()?.profile ?? null;
  }

  function profiles(): PublicUser[] {
    return state.accounts.flatMap((account) => (account.profile ? [account.profile] : []));
  }

  function profileById(id: string): PublicUser | null {
    return state.accounts.find((account) => account.userId === id)?.profile ?? null;
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

  function isMember(userId: string, roomId: string) {
    return state.memberships.some((membership) => membership.userId === userId && membership.roomId === roomId);
  }

  function roomById(roomId: string) {
    return state.rooms.find((room) => room.id === roomId) ?? null;
  }

  function topHashtags() {
    const counts = new Map<string, number>();
    const add = (tag: string) => counts.set(tag, (counts.get(tag) ?? 0) + 1);
    for (const room of state.rooms) {
      for (const tag of room.hashtags) add(tag);
    }
    for (const account of state.accounts) {
      for (const tag of account.profile?.hashtags ?? []) add(tag);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 20);
  }

  function usedToday(userId: string) {
    const key = localDayKey(now());
    const row = state.tapDays.find((day) => day.userId === userId);
    if (!row || row.dayKey !== key) return 0;
    return row.used;
  }

  function ensureDay(userId: string) {
    const key = localDayKey(now());
    let row = state.tapDays.find((day) => day.userId === userId);
    if (!row) {
      row = { userId, dayKey: key, used: 0 };
      state.tapDays.push(row);
    } else if (row.dayKey !== key) {
      row.dayKey = key;
      row.used = 0;
    }
    return row;
  }

  function pairMatches(tap: TapRec, a: string, b: string) {
    return (tap.fromId === a && tap.toId === b) || (tap.fromId === b && tap.toId === a);
  }

  function hasOpenTap(a: string, b: string) {
    return state.taps.some(
      (tap) => pairMatches(tap, a, b) && (tap.status === "pending" || tap.status === "accepted"),
    );
  }

  function isExcluded(ownerId: string, peerId: string) {
    const row = state.exclusions.find((item) => item.ownerId === ownerId && item.peerId === peerId);
    return !!row && row.until > now();
  }

  function exclude(ownerId: string, peerId: string) {
    const until = now() + MATCH_COOLDOWN_MS;
    const row = state.exclusions.find((item) => item.ownerId === ownerId && item.peerId === peerId);
    if (row) row.until = Math.max(row.until, until);
    else state.exclusions.push({ ownerId, peerId, until });
  }

  function eligibleIds(userId: string) {
    const blocked = blockedSet();
    return profiles()
      .map((user) => user.id)
      .filter((id) => id !== userId && !blocked.has(id) && !isBlocked(id, userId))
      .filter((id) => !isExcluded(userId, id) && !hasOpenTap(userId, id));
  }

  function shuffle<T>(list: T[]): T[] {
    const next = [...list];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      const current = next[index]!;
      next[index] = next[swap]!;
      next[swap] = current;
    }
    return next;
  }

  function removeFromBatch(userId: string, peerId: string) {
    const batch = state.batches.find((item) => item.userId === userId);
    if (!batch) return;
    batch.peerIds = batch.peerIds.filter((id) => id !== peerId);
  }

  function drawBatch(userId: string, avoid: Set<string>) {
    const eligible = eligibleIds(userId);
    let pool = eligible.filter((id) => !avoid.has(id));
    if (pool.length < MATCH_PAGE) {
      pool = [...pool, ...eligible.filter((id) => !pool.includes(id))];
    }
    const picked = shuffle(pool).slice(0, MATCH_PAGE);
    const row = state.batches.find((item) => item.userId === userId);
    if (row) row.peerIds = picked;
    else state.batches.push({ userId, peerIds: picked });
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
      .filter((chatter) => !blocked.has(chatter.authorId) && chatterVisible(chatter))
      .sort((a, b) => a.createdAt - b.createdAt);
    const threads: ThreadSummary[] = profile
      ? state.threads
          .filter((thread) => thread.a === profile.id || thread.b === profile.id)
          .map((thread) => ({ thread, peerId: thread.a === profile.id ? thread.b : thread.a }))
          .filter(({ peerId }) => !blocked.has(peerId))
          .filter(({ thread }) => threadIsListed(thread, profile.id))
          .map(({ thread, peerId }) => {
            const permanent = thread.keptBy.includes(profile.id);
            const preview =
              permanent && !hasVisibleMessage(thread.id) ? "No messages in the last 3 days" : previewOf(thread.id);
            return {
              id: thread.id,
              peerId,
              origin: thread.origin,
              updatedAt: thread.updatedAt,
              unread: thread.unread,
              preview,
              permanent,
            };
          })
          .sort((a, b) => b.updatedAt - a.updatedAt)
      : [];
    const visibleIds = new Set(threads.map((thread) => thread.id));
    const messages = state.messages
      .filter((message) => visibleIds.has(message.threadId) && messageVisible(message))
      .sort((a, b) => a.createdAt - b.createdAt);
    const notifications = profile
      ? state.notifications
          .filter((note) => note.userId === profile.id && (!note.peerId || !blocked.has(note.peerId)))
          .filter((note) => !contactViolation(contactHaystack([note.title, note.body])))
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
    const joinedRoomIds = profile
      ? state.memberships
          .map((membership, index) => ({ membership, index }))
          .filter(({ membership }) => membership.userId === profile.id)
          .sort((a, b) => b.membership.joinedAt - a.membership.joinedAt || b.index - a.index)
          .map(({ membership }) => membership.roomId)
      : [];
    const matchPeerIds = profile
      ? (state.batches.find((batch) => batch.userId === profile.id)?.peerIds ?? []).filter(
          (id) => !blocked.has(id) && profileById(id),
        )
      : [];
    const matchEligibleIds = profile ? eligibleIds(profile.id) : [];
    const incomingTaps = profile
      ? state.taps
          .filter((tap) => tap.toId === profile.id && tap.status === "pending" && !blocked.has(tap.fromId))
          .map((tap) => ({ id: tap.id, fromId: tap.fromId, createdAt: tap.createdAt }))
          .sort((a, b) => b.createdAt - a.createdAt)
      : [];
    const outgoingTaps = profile
      ? state.taps
          .filter((tap) => tap.fromId === profile.id && tap.status === "pending" && !blocked.has(tap.toId))
          .map((tap) => ({
            id: tap.id,
            toId: tap.toId,
            createdAt: tap.createdAt,
            expiresAt: tap.expiresAt ?? tap.createdAt + TAP_WINDOW_MS,
          }))
          .sort((a, b) => a.expiresAt - b.expiresAt)
      : [];
    return {
      session: account ? { userId: account.userId, method: "phone" } : null,
      me: profile,
      users,
      directory,
      blockedUsers,
      friendIds,
      rooms: [...state.rooms].sort((a, b) => b.listeners - a.listeners || a.name.localeCompare(b.name)),
      joinedRoomIds,
      topHashtags: topHashtags(),
      chatters,
      threads,
      messages,
      notifications,
      flashes,
      announcement,
      matchPeerIds,
      matchEligibleIds,
      tapsRemaining: profile ? Math.max(0, TAP_LIMIT - usedToday(profile.id)) : TAP_LIMIT,
      tapLimit: TAP_LIMIT,
      incomingTaps,
      outgoingTaps,
    };
  }

  function contactHaystack(parts: Array<string | undefined>): string {
    return parts.filter((part): part is string => !!part).join("\n");
  }

  /** Permanent chats stay on MSG. Others leave after 3 days without activity. */
  function threadIsListed(thread: ThreadRec, userId: string): boolean {
    if (thread.keptBy.includes(userId)) return true;
    return now() - thread.updatedAt <= MESSAGE_TTL_MS;
  }

  function hasVisibleMessage(threadId: string): boolean {
    return state.messages.some((message) => message.threadId === threadId && messageVisible(message));
  }

  function messageVisible(message: DirectMessage): boolean {
    if (message.createdAt < now() - MESSAGE_TTL_MS) return false;
    const haystack = contactHaystack([message.body, message.news?.url, message.news?.title, message.news?.summary]);
    return !contactViolation(haystack);
  }

  function chatterVisible(chatter: Chatter): boolean {
    if (chatter.createdAt < now() - MESSAGE_TTL_MS) return false;
    const haystack = contactHaystack([chatter.body, chatter.news?.url, chatter.news?.title, chatter.news?.summary]);
    return !contactViolation(haystack);
  }

  /** Drop room lines and direct messages that are past 3 days or carry contact details. */
  function purgeHistory(): boolean {
    const messages = state.messages.filter((message) => messageVisible(message));
    const chatters = state.chatters.filter((chatter) => chatterVisible(chatter));
    const notifications = state.notifications.filter(
      (note) => !contactViolation(contactHaystack([note.title, note.body])),
    );
    let changed =
      messages.length !== state.messages.length ||
      chatters.length !== state.chatters.length ||
      notifications.length !== state.notifications.length;
    state.messages = messages;
    state.chatters = chatters;
    state.notifications = notifications;
    for (const thread of state.threads) {
      let latest = 0;
      for (const message of state.messages) {
        if (message.threadId === thread.id && message.createdAt > latest) latest = message.createdAt;
      }
      if (latest > 0 && thread.updatedAt > latest) {
        thread.updatedAt = latest;
        changed = true;
      }
    }
    return changed;
  }

  function previewOf(threadId: string): string {
    const msgs = state.messages
      .filter((message) => message.threadId === threadId && messageVisible(message))
      .sort((a, b) => a.createdAt - b.createdAt);
    const last = msgs[msgs.length - 1];
    if (!last) return "New line";
    const prefix = last.kind === "blast" ? "Blast · " : "";
    const text = last.body || (last.attachment ? attachmentPreview(last.attachment) : last.news?.title || "Link");
    return (prefix + text).slice(0, 160);
  }

  function trimChannel(roomId: string, max = 80) {
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

  function ensureThread(a: string, b: string, origin: ThreadOrigin): ThreadRec {
    const found = findThread(a, b);
    if (found) return found;
    const thread: ThreadRec = { id: uid("thr"), a, b, origin, updatedAt: now(), unread: 0, keptBy: [], engagedBy: [] };
    state.threads.push(thread);
    return thread;
  }

  function engage(thread: ThreadRec, userId: string) {
    if (!thread.engagedBy.includes(userId)) thread.engagedBy.push(userId);
  }

  function pushNote(input: {
    userId: string;
    title: string;
    body: string;
    threadId?: string;
    peerId?: string;
    flash: boolean;
    match?: boolean;
  }) {
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
      flashes = [
        ...flashes,
        { id: uid("flash"), title: input.title, body: input.body, threadId: input.threadId, match: input.match },
      ].slice(-5);
    }
  }

  function addDirect(input: {
    thread: ThreadRec;
    senderId: string;
    body: string;
    kind: "text" | "blast";
    news?: NewsLink;
    attachment?: ChatAttachment;
    notify: boolean;
    flash: boolean;
    moderation?: ModerationStamp;
  }) {
    const message: DirectMessage = {
      id: uid("msg"),
      threadId: input.thread.id,
      senderId: input.senderId,
      body: input.body,
      kind: input.kind,
      news: input.news,
      attachment: input.attachment,
      createdAt: now(),
      moderation: input.moderation,
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
      const body = input.body || (input.attachment ? attachmentPreview(input.attachment) : input.news?.title || "New message");
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

  function pickAuthor(): PublicUser | null {
    const blocked = blockedSet();
    const pool = profiles().filter(
      (user) => user.id.startsWith("usr_") && user.id !== state.sessionUserId && !blocked.has(user.id),
    );
    if (!pool.length) return null;
    return pool[Math.floor(random() * pool.length)] ?? null;
  }

  function pushChatter(author: PublicUser, body: string, roomId: string, news?: NewsLink) {
    state.chatters.push({
      id: uid("cht"),
      authorId: author.id,
      roomId,
      body,
      news,
      createdAt: now(),
    });
    trimChannel(roomId);
    const room = roomById(roomId);
    if (me()) announcement = `${author.alias} in ${room?.name ?? "a room"}`;
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

  function openMatchThread(tap: TapRec, flash: boolean): { threadId: string; greeted: boolean } {
    const existing = findThread(tap.fromId, tap.toId);
    if (existing) {
      tap.threadId = existing.id;
      engage(existing, tap.toId);
      return { threadId: existing.id, greeted: false };
    }
    const thread = ensureThread(tap.fromId, tap.toId, "match");
    engage(thread, tap.toId);
    const senderId = tap.fromId.startsWith("usr_") ? tap.fromId : tap.toId;
    const body = MATCH_GREETINGS[Math.floor(random() * MATCH_GREETINGS.length)] ?? MATCH_GREETINGS[0]!;
    addDirect({ thread, senderId, body, kind: "text", notify: true, flash });
    tap.threadId = thread.id;
    return { threadId: thread.id, greeted: true };
  }

  function expirePending(): boolean {
    const sessionId = state.sessionUserId;
    if (!sessionId) return false;
    let changed = false;
    for (const tap of state.taps) {
      if (tap.status !== "pending" || tap.fromId !== sessionId) continue;
      const deadline = tap.expiresAt ?? tap.createdAt + TAP_WINDOW_MS;
      if (deadline > now()) continue;
      tap.status = "declined";
      tap.resolvedAt = now();
      exclude(sessionId, tap.toId);
      removeFromBatch(sessionId, tap.toId);
      changed = true;
    }
    return changed;
  }

  function finishMatchPair(userId: string, peerId: string) {
    for (const tap of state.taps) {
      if (tap.status !== "accepted" || !pairMatches(tap, userId, peerId)) continue;
      tap.status = "ended";
      tap.resolvedAt = now();
    }
    exclude(userId, peerId);
    removeFromBatch(userId, peerId);
  }

  function dropThread(threadId: string) {
    state.threads = state.threads.filter((item) => item.id !== threadId);
    state.messages = state.messages.filter((message) => message.threadId !== threadId);
    state.notifications = state.notifications.filter((note) => note.threadId !== threadId);
    if (presence.threadId === threadId) presence.threadId = null;
  }

  function closePrivateThread(threadId: string): Result {
    const profile = me();
    if (!profile) return { ok: false, error: "Sign in first." };
    const thread = state.threads.find((item) => item.id === threadId);
    if (!thread || (thread.a !== profile.id && thread.b !== profile.id)) {
      return { ok: false, error: "That conversation is gone." };
    }
    const peerId = thread.a === profile.id ? thread.b : thread.a;
    if (thread.origin === "match") finishMatchPair(profile.id, peerId);
    dropThread(threadId);
    mutedUntil.set(peerId, now() + 3 * 60_000);
    return { ok: true };
  }

  function seat(userId: string) {
    for (const friendId of SEEDED_FRIENDS) {
      if (profileById(friendId)) state.friends.push({ ownerId: userId, friendId });
    }
    for (const roomId of SEEDED_ROOMS) {
      if (roomById(roomId)) state.memberships.push({ userId, roomId, joinedAt: now() });
    }
    const incoming = profileById(SEEDED_INCOMING);
    if (incoming && !hasOpenTap(userId, incoming.id)) {
      state.taps.push({
        id: uid("tap"),
        fromId: incoming.id,
        toId: userId,
        status: "pending",
        createdAt: now() - 60_000,
      });
      pushNote({
        userId,
        title: `${incoming.alias} tapped you`,
        body: incoming.bioQuote,
        peerId: incoming.id,
        flash: false,
        match: true,
      });
    }
  }

  function maybeBlast() {
    const profile = me();
    if (!profile) return;
    const candidates = state.threads.filter((thread) => {
      if (thread.a !== profile.id && thread.b !== profile.id) return false;
      const peerId = thread.a === profile.id ? thread.b : thread.a;
      if (!peerId.startsWith("usr_") || !isFriend(profile.id, peerId)) return false;
      if (isBlocked(profile.id, peerId) || isMuted(peerId)) return false;
      return thread.origin === "match" || thread.keptBy.includes(profile.id) || thread.engagedBy.includes(profile.id);
    });
    if (!candidates.length) return;
    const thread = candidates[Math.floor(random() * candidates.length)]!;
    const peerId = thread.a === profile.id ? thread.b : thread.a;
    const news = NEWS_ITEMS[Math.floor(random() * NEWS_ITEMS.length)];
    const body = BLAST_LINES[Math.floor(random() * BLAST_LINES.length)] ?? BLAST_LINES[0]!;
    addDirect({ thread, senderId: peerId, body, kind: "blast", news, notify: true, flash: false });
  }

  function maybeIncoming() {
    const profile = me();
    if (!profile) return;
    if (now() - lastIncomingAt < 45_000) return;
    const pending = state.taps.filter((tap) => tap.toId === profile.id && tap.status === "pending");
    if (pending.length >= 2) return;
    const pool = eligibleIds(profile.id);
    if (!pool.length) return;
    const peerId = pool[Math.floor(random() * pool.length)];
    if (!peerId) return;
    const peer = profileById(peerId);
    if (!peer) return;
    lastIncomingAt = now();
    state.taps.push({
      id: uid("tap"),
      fromId: peerId,
      toId: profile.id,
      status: "pending",
      createdAt: now(),
    });
    removeFromBatch(profile.id, peerId);
    pushNote({
      userId: profile.id,
      title: `${peer.alias} tapped you`,
      body: peer.bioQuote,
      peerId,
      flash: true,
      match: true,
    });
  }

  function runLive() {
    expirePending();
    const roll = random();
    if (roll < 0.62) {
      const take = LIVE_ROOMS[roomCursor % LIVE_ROOMS.length];
      roomCursor += 1;
      if (!take) return;
      if (!roomById(take.roomId)) return;
      const author = pickAuthor();
      if (!author) return;
      pushChatter(author, take.body, take.roomId, take.newsIndex != null ? NEWS_ITEMS[take.newsIndex] : undefined);
      return;
    }
    if (roll < 0.84) {
      maybeBlast();
      return;
    }
    maybeIncoming();
  }

  function cleanRoomName(name: string) {
    return name.trim().replace(/\s+/g, " ");
  }

  function storeRoomError(extra: number): string | null {
    if (extra <= 0) return null;
    try {
      const current = storage.getItem(STORAGE_KEY)?.length ?? 0;
      if (current + extra > STORE_LIMIT) {
        return "Not enough room on this device for that attachment. Try a smaller file.";
      }
    } catch {
      return null;
    }
    return null;
  }

  function takeAttachment(file: ChatAttachment | undefined): { ok: true; attachment?: ChatAttachment } | { ok: false; error: string } {
    if (!file) return { ok: true };
    const error = validateAttachment(file);
    if (error) return { ok: false, error };
    return {
      ok: true,
      attachment: { name: file.name.trim(), mime: file.mime, size: file.size, dataUrl: file.dataUrl },
    };
  }

  function composeMessage(input: {
    body: string;
    news?: NewsLink;
    attachment?: ChatAttachment;
    max: number;
    lengthError: string;
    emptyError: string;
    copies?: number;
    channelId: string;
    actorId: string;
    stamp?: ModerationStamp;
  }):
    | {
        ok: true;
        body: string;
        news?: NewsLink;
        attachment?: ChatAttachment;
        pii_redacted: boolean;
        redacted_types: string[];
        notice?: string;
      }
    | { ok: false; error: string } {
    const body = cleanText(input.body);
    if (body.length > input.max) return { ok: false, error: input.lengthError };
    if (input.news && !/^https?:\/\//i.test(input.news.url)) return { ok: false, error: "That link doesn't look usable." };
    const file = takeAttachment(input.attachment);
    if (!file.ok) return file;
    const evaluation = enforceSync(
      {
        parts: {
          body,
          url: input.news?.url,
          title: input.news?.title,
          summary: input.news?.summary,
          source: input.news?.source,
        },
        attachment: file.attachment,
        channelId: input.channelId,
        actorId: input.actorId,
      },
      { journal, rate, now: now(), stamp: input.stamp },
    );
    if (evaluation.action !== "allow" && evaluation.action !== "redact") {
      return { ok: false, error: evaluation.notice || "That message was blocked before it could be posted." };
    }
    let news: NewsLink | undefined;
    if (input.news && evaluation.parts.url && evaluation.parts.title && evaluation.parts.source) {
      const next: NewsLink = {
        url: evaluation.parts.url,
        title: evaluation.parts.title,
        summary: evaluation.parts.summary ?? "",
        source: evaluation.parts.source,
      };
      if (validNews(next) && !contactViolation(contactHaystack([next.url, next.title, next.summary, next.source]))) {
        news = next;
      }
    }
    const attachment = file.attachment && evaluation.attachmentAllowed ? file.attachment : undefined;
    const outBody = evaluation.parts.body;
    if (!outBody && !news && !attachment) return { ok: false, error: input.emptyError };
    if (attachment) {
      const room = storeRoomError(attachment.dataUrl.length * Math.max(1, input.copies ?? 1) + 512);
      if (room) return { ok: false, error: room };
    }
    return {
      ok: true,
      body: outBody,
      news,
      attachment,
      pii_redacted: evaluation.pii_redacted,
      redacted_types: evaluation.redacted_types,
      notice: evaluation.notice,
    };
  }

  function openSession(contact: string): Result<{ needsProfile: boolean }> {
    const normalized = normalizePhone(contact);
    if (!normalized) {
      return { ok: false, error: "Enter a phone number, at least 8 digits. It never appears on your profile." };
    }
    const existing = state.accounts.find((account) => account.contact === normalized);
    if (existing) {
      state.sessionUserId = existing.userId;
      pendingOtp = null;
      emit();
      return { ok: true, needsProfile: !existing.profile };
    }
    const account: Account = {
      userId: uid("hum"),
      contact: normalized,
      profile: null,
      seated: false,
    };
    state.accounts.push(account);
    state.sessionUserId = account.userId;
    pendingOtp = null;
    emit();
    return { ok: true, needsProfile: true };
  }

  const api: LocalBackend = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      const expired = expirePending();
      const purged = purgeHistory();
      const profileId = sessionAccount()?.profile?.id;
      let refresh = expired || purged;
      if (profileId) {
        const remaining = Math.max(0, TAP_LIMIT - usedToday(profileId));
        if (remaining !== snapshot.tapsRemaining) refresh = true;
      }
      if (refresh) {
        snapshot = derive();
        if (expired || purged) persist();
      }
      return snapshot;
    },
    async requestOtp(input) {
      if (input.contact.trim().includes("@")) {
        return { ok: false, error: "Use a phone number. Email sign-in isn't available." };
      }
      const contact = normalizePhone(input.contact);
      if (!contact) {
        return { ok: false, error: "Enter a phone number, at least 8 digits. It never appears on your profile." };
      }
      pendingOtp = contact;
      return { ok: true };
    },
    async verifyOtp(code) {
      if (!pendingOtp) return { ok: false, error: "Request a code first." };
      const digits = code.replace(/\D/g, "");
      if (digits.length !== 6) return { ok: false, error: "Enter the 6-digit code." };
      if (digits !== DEMO_OTP) return { ok: false, error: "That code isn't valid. The demo code is 000000." };
      return openSession(pendingOtp);
    },
    establishSession(contact) {
      return openSession(contact);
    },
    completeProfile(input) {
      const account = sessionAccount();
      if (!account) return { ok: false, error: "Sign in first." };
      const error = profileError(input, profiles(), account.userId);
      if (error) return { ok: false, error };
      const tags = collectHashtags(input.hashtags, { min: 0, max: 8 });
      account.profile = {
        id: account.userId,
        alias: input.alias.trim(),
        bioQuote: input.bioQuote.trim(),
        hashtags: tags.tags,
        joinedAt: now(),
      };
      if (!account.seated) {
        seat(account.userId);
        account.seated = true;
        drawBatch(account.userId, new Set());
      }
      emit();
      return { ok: true };
    },
    updateProfile(input) {
      const account = sessionAccount();
      if (!account?.profile) return { ok: false, error: "Set up your alias first." };
      const error = profileError(input, profiles(), account.userId);
      if (error) return { ok: false, error };
      const tags = collectHashtags(input.hashtags, { min: 0, max: 8 });
      account.profile = {
        ...account.profile,
        alias: input.alias.trim(),
        bioQuote: input.bioQuote.trim(),
        hashtags: tags.tags,
      };
      emit();
      return { ok: true };
    },
    signOut() {
      state.sessionUserId = null;
      pendingOtp = null;
      emit();
    },
    createRoom(input) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      const name = cleanRoomName(input.name);
      if (name.length < 2 || name.length > 32) return { ok: false, error: "Name the room in 2–32 characters." };
      if (!/^[A-Za-z0-9][A-Za-z0-9 '&+.-]*$/.test(name)) {
        return { ok: false, error: "Use letters, numbers, and simple punctuation." };
      }
      if (state.rooms.some((room) => room.name.toLowerCase() === name.toLowerCase())) {
        return { ok: false, error: "A room already has that name." };
      }
      const blurb = cleanText(input.blurb);
      if (blurb.length > 140) return { ok: false, error: "Keep the description to 140 characters." };
      const tags = collectHashtags(input.hashtags, { min: 1, max: 5 });
      if (tags.error) return { ok: false, error: tags.error };
      const room: RoomRec = {
        id: uid("room"),
        name,
        blurb,
        hashtags: tags.tags,
        createdBy: profile.id,
        createdAt: now(),
        listeners: 1,
      };
      state.rooms.unshift(room);
      state.memberships.push({ userId: profile.id, roomId: room.id, joinedAt: now() });
      emit();
      return { ok: true, roomId: room.id };
    },
    joinRoom(roomId) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      if (!roomById(roomId)) return { ok: false, error: "That room isn't here." };
      if (!isMember(profile.id, roomId)) {
        state.memberships.push({ userId: profile.id, roomId, joinedAt: now() });
        emit();
      }
      return { ok: true };
    },
    leaveRoom(roomId) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      state.memberships = state.memberships.filter(
        (membership) => !(membership.userId === profile.id && membership.roomId === roomId),
      );
      emit();
      return { ok: true };
    },
    postChatter(input) {
      const profile = me();
      if (!profile) return { ok: false, error: "Set up your alias first." };
      if (!roomById(input.roomId)) return { ok: false, error: "That room isn't here." };
      if (!isMember(profile.id, input.roomId)) return { ok: false, error: "Join the room before you post." };
      const blastIds = [...new Set(input.blastFriendIds ?? [])].filter(
        (friendId) => isFriend(profile.id, friendId) && !isBlocked(profile.id, friendId),
      );
      const composed = composeMessage({
        body: input.body,
        news: input.news,
        attachment: input.attachment,
        max: TAKE_MAX,
        lengthError: "Keep it to 280 characters.",
        emptyError: "Write something, attach a file, or share a link.",
        copies: 1 + blastIds.length,
        channelId: input.roomId,
        actorId: profile.id,
        stamp: input.stamp,
      });
      if (!composed.ok) return composed;
      const moderation = composed.pii_redacted
        ? { pii_redacted: true, redacted_types: composed.redacted_types }
        : undefined;
      const chatter: Chatter = {
        id: uid("cht"),
        authorId: profile.id,
        roomId: input.roomId,
        body: composed.body,
        news: composed.news,
        attachment: composed.attachment,
        createdAt: now(),
        moderation,
      };
      state.chatters.push(chatter);
      trimChannel(input.roomId);
      for (const friendId of blastIds) {
        const thread = ensureThread(profile.id, friendId, "direct");
        engage(thread, profile.id);
        addDirect({
          thread,
          senderId: profile.id,
          body: composed.body || composed.news?.title || (composed.attachment ? attachmentPreview(composed.attachment) : ""),
          kind: "blast",
          news: composed.news,
          attachment: composed.attachment,
          notify: false,
          flash: false,
          moderation,
        });
      }
      emit();
      return {
        ok: true,
        id: chatter.id,
        pii_redacted: composed.pii_redacted,
        redacted_types: composed.redacted_types,
        notice: composed.notice,
      };
    },
    sendMessage(threadId, raw, extras) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      const thread = state.threads.find((item) => item.id === threadId);
      if (!thread || (thread.a !== profile.id && thread.b !== profile.id)) {
        return { ok: false, error: "That conversation is gone." };
      }
      const peerId = thread.a === profile.id ? thread.b : thread.a;
      if (isBlocked(profile.id, peerId)) return { ok: false, error: "Unblock this alias before you message them." };
      engage(thread, profile.id);
      const composed = composeMessage({
        body: raw,
        news: extras?.news,
        attachment: extras?.attachment,
        max: DM_MAX,
        lengthError: "Keep the message under 600 characters.",
        emptyError: "Write something, attach a file, or share a link.",
        channelId: threadId,
        actorId: profile.id,
        stamp: extras?.stamp,
      });
      if (!composed.ok) return composed;
      const moderation = composed.pii_redacted
        ? { pii_redacted: true, redacted_types: composed.redacted_types }
        : undefined;
      addDirect({
        thread,
        senderId: profile.id,
        body: composed.body,
        kind: "text",
        news: composed.news,
        attachment: composed.attachment,
        notify: false,
        flash: false,
        moderation,
      });
      queueReply(thread.id, peerId, composed.body);
      emit();
      return {
        ok: true,
        pii_redacted: composed.pii_redacted,
        redacted_types: composed.redacted_types,
        notice: composed.notice,
      };
    },
    blastThreads(threadIds, raw, extras) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      const ids = [...new Set(threadIds)];
      if (ids.length === 0) return { ok: false, error: "Select at least one chat." };
      const threads: ThreadRec[] = [];
      for (const id of ids) {
        const thread = state.threads.find((item) => item.id === id);
        if (!thread || (thread.a !== profile.id && thread.b !== profile.id)) {
          return { ok: false, error: "One of those chats is gone." };
        }
        const peerId = thread.a === profile.id ? thread.b : thread.a;
        if (isBlocked(profile.id, peerId)) return { ok: false, error: "Unblock every selected alias before you blast." };
        threads.push(thread);
      }
      const composed = composeMessage({
        body: raw,
        max: DM_MAX,
        lengthError: "Keep the message under 600 characters.",
        emptyError: "Write a blast first.",
        copies: threads.length,
        channelId: ids[0] ?? "blast",
        actorId: profile.id,
        stamp: extras?.stamp,
      });
      if (!composed.ok) return composed;
      const moderation = composed.pii_redacted
        ? { pii_redacted: true, redacted_types: composed.redacted_types }
        : undefined;
      for (const thread of threads) {
        engage(thread, profile.id);
        addDirect({ thread, senderId: profile.id, body: composed.body, kind: "blast", notify: false, flash: false, moderation });
      }
      emit();
      return {
        ok: true,
        sent: threads.length,
        pii_redacted: composed.pii_redacted,
        redacted_types: composed.redacted_types,
        notice: composed.notice,
      };
    },
    setAvatar(avatar: MouseAvatar | null) {
      const account = sessionAccount();
      if (!account?.profile) return { ok: false, error: "Set up your alias first." };
      if (avatar == null) {
        account.profile = { ...account.profile, avatar: null };
        emit();
        return { ok: true };
      }
      const parsed = parseAvatar(avatar);
      if (!parsed.ok) return parsed;
      account.profile = { ...account.profile, avatar: parsed.avatar };
      emit();
      return { ok: true };
    },
    openThread(peerId) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      if (peerId === profile.id) return { ok: false, error: "You can't message yourself." };
      const peer = profileById(peerId);
      if (!peer) return { ok: false, error: "That alias isn't here." };
      if (isBlocked(profile.id, peerId)) return { ok: false, error: "Unblock this alias before you message them." };
      const thread = ensureThread(profile.id, peerId, "direct");
      engage(thread, profile.id);
      if (!threadIsListed(thread, profile.id)) thread.updatedAt = now();
      emit();
      return { ok: true, threadId: thread.id };
    },
    burnThread(threadId) {
      const result = closePrivateThread(threadId);
      if (result.ok) emit();
    },
    endChat(threadId) {
      const result = closePrivateThread(threadId);
      if (result.ok) emit();
      return result;
    },
    setThreadPermanent(threadId, permanent) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      const thread = state.threads.find((item) => item.id === threadId);
      if (!thread || (thread.a !== profile.id && thread.b !== profile.id)) {
        return { ok: false, error: "That conversation is gone." };
      }
      const kept = new Set(thread.keptBy);
      if (permanent) {
        kept.add(profile.id);
        engage(thread, profile.id);
      } else kept.delete(profile.id);
      thread.keptBy = [...kept];
      emit();
      return { ok: true };
    },
    endMatch(threadId) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      const thread = state.threads.find((item) => item.id === threadId);
      if (!thread || (thread.a !== profile.id && thread.b !== profile.id)) {
        return { ok: false, error: "That conversation is gone." };
      }
      if (thread.origin !== "match") return { ok: false, error: "This chat didn't start from a tap." };
      const peerId = thread.a === profile.id ? thread.b : thread.a;
      finishMatchPair(profile.id, peerId);
      dropThread(threadId);
      emit();
      return { ok: true };
    },
    addFriend(userId) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      if (userId === profile.id) return { ok: false, error: "You can't add yourself." };
      if (!profileById(userId)) return { ok: false, error: "That alias isn't here." };
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
      for (const tap of state.taps) {
        if (tap.status === "pending" && pairMatches(tap, profile.id, userId)) {
          tap.status = "declined";
          tap.resolvedAt = now();
        }
        if (tap.status === "accepted" && pairMatches(tap, profile.id, userId)) {
          tap.status = "ended";
          tap.resolvedAt = now();
        }
      }
      exclude(profile.id, userId);
      removeFromBatch(profile.id, userId);
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
    refreshMatch() {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      const previous = new Set(state.batches.find((batch) => batch.userId === profile.id)?.peerIds ?? []);
      drawBatch(profile.id, previous);
      emit();
      return { ok: true };
    },
    ensureMatch() {
      const profile = me();
      if (!profile) return;
      if (state.batches.some((batch) => batch.userId === profile.id)) return;
      drawBatch(profile.id, new Set());
      emit();
    },
    sweepTaps() {
      if (!expirePending()) return;
      emit();
    },
    tapUser(userId) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      if (userId === profile.id) return { ok: false, error: "You can't tap yourself." };
      if (!profileById(userId)) return { ok: false, error: "That alias isn't here." };
      if (isBlocked(profile.id, userId) || isBlocked(userId, profile.id)) {
        return { ok: false, error: "Unblock this alias first." };
      }
      if (hasOpenTap(profile.id, userId)) return { ok: false, error: "There's already a tap between you." };
      if (isExcluded(profile.id, userId)) return { ok: false, error: "They're out of Match for a while." };
      const day = ensureDay(profile.id);
      if (day.used >= TAP_LIMIT) return { ok: false, error: `No taps left today. You get ${TAP_LIMIT} a day.` };
      day.used += 1;
      const tappedAt = now();
      const tap: TapRec = {
        id: uid("tap"),
        fromId: profile.id,
        toId: userId,
        status: "pending",
        createdAt: tappedAt,
        expiresAt: tappedAt + TAP_WINDOW_MS,
      };
      state.taps.push(tap);
      removeFromBatch(profile.id, userId);
      emit();
      return { ok: true };
    },
    acceptTap(tapId) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      const tap = state.taps.find((item) => item.id === tapId && item.toId === profile.id && item.status === "pending");
      if (!tap) return { ok: false, error: "That tap is no longer waiting." };
      if (isBlocked(profile.id, tap.fromId)) return { ok: false, error: "Unblock this alias first." };
      const opened = openMatchThread(tap, false);
      tap.status = "accepted";
      tap.resolvedAt = now();
      tap.threadId = opened.threadId;
      const threadId = opened.threadId;
      removeFromBatch(profile.id, tap.fromId);
      emit();
      return { ok: true, threadId };
    },
    declineTap(tapId) {
      const profile = me();
      if (!profile) return { ok: false, error: "Sign in first." };
      const tap = state.taps.find((item) => item.id === tapId && item.toId === profile.id && item.status === "pending");
      if (!tap) return { ok: false, error: "That tap is no longer waiting." };
      tap.status = "declined";
      tap.resolvedAt = now();
      exclude(profile.id, tap.fromId);
      removeFromBatch(profile.id, tap.fromId);
      emit();
      return { ok: true };
    },
    resetFloor() {
      state = seedState();
      flashes = [];
      announcement = "";
      pendingOtp = null;
      presence = { threadId: null };
      lastIncomingAt = 0;
      emit();
    },
    startLive() {
      if (cancelLive) return;
      const loop = () => {
        runLive();
        emit();
        const delay = 8000 + Math.floor(random() * 7000);
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
