/**
 * App-facing contract. UI code should depend on this module and on
 * `backend` from `./index`, never on localStorage or a vendor SDK.
 * A Supabase or Firebase implementation can replace the local one
 * by satisfying `Backend`.
 */

/** Demo OTP accepted by the local backend. Any phone number works with this code. */
export const DEMO_OTP = "000000";

/** Conversation requests the signed-in user can send per local day. */
export const TAP_LIMIT = 5;

/** How many aliases Match shows at once. */
export const MATCH_PAGE = 10;

/** How long a decline or an ended match stays out of Match. */
export const MATCH_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export type ThreadOrigin = "direct" | "match";

export interface PublicUser {
  id: string;
  alias: string;
  bioQuote: string;
  hashtags: string[];
  joinedAt: number;
}

export interface Room {
  id: string;
  name: string;
  blurb: string;
  hashtags: string[];
  createdBy: string;
  createdAt: number;
  listeners: number;
}

export interface HashtagCount {
  tag: string;
  count: number;
}

export interface NewsLink {
  url: string;
  source: string;
  title: string;
  summary: string;
}

export interface Chatter {
  id: string;
  authorId: string;
  roomId: string;
  body: string;
  news?: NewsLink;
  createdAt: number;
}

export interface ThreadSummary {
  id: string;
  peerId: string;
  origin: ThreadOrigin;
  updatedAt: number;
  unread: number;
  preview: string;
}

export interface DirectMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  kind: "text" | "blast";
  news?: NewsLink;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  threadId?: string;
  peerId?: string;
}

export interface Flash {
  id: string;
  title: string;
  body: string;
  threadId?: string;
  match?: boolean;
}

export interface IncomingTap {
  id: string;
  fromId: string;
  createdAt: number;
}

export interface OutgoingTap {
  id: string;
  toId: string;
  createdAt: number;
}

export interface ProfileInput {
  alias: string;
  bioQuote: string;
  hashtags: string[];
}

export interface Snapshot {
  session: { userId: string; method: "phone" } | null;
  me: PublicUser | null;
  users: PublicUser[];
  directory: PublicUser[];
  blockedUsers: PublicUser[];
  friendIds: string[];
  rooms: Room[];
  joinedRoomIds: string[];
  topHashtags: HashtagCount[];
  chatters: Chatter[];
  threads: ThreadSummary[];
  messages: DirectMessage[];
  notifications: AppNotification[];
  flashes: Flash[];
  announcement: string;
  matchPeerIds: string[];
  tapsRemaining: number;
  tapLimit: number;
  incomingTaps: IncomingTap[];
  outgoingTaps: OutgoingTap[];
}

export type Result<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export interface Backend {
  subscribe(listener: () => void): () => void;
  getSnapshot(): Snapshot;
  requestOtp(input: { contact: string }): Promise<Result>;
  verifyOtp(code: string): Promise<Result<{ needsProfile: boolean }>>;
  completeProfile(input: ProfileInput): Result;
  updateProfile(input: ProfileInput): Result;
  signOut(): void;
  createRoom(input: { name: string; blurb: string; hashtags: string[] }): Result<{ roomId: string }>;
  joinRoom(roomId: string): Result;
  leaveRoom(roomId: string): Result;
  postChatter(input: {
    body: string;
    roomId: string;
    news?: NewsLink;
    blastFriendIds?: string[];
  }): Result<{ id: string }>;
  sendMessage(threadId: string, body: string): Result;
  openThread(peerId: string): Result<{ threadId: string }>;
  burnThread(threadId: string): void;
  endMatch(threadId: string): Result;
  addFriend(userId: string): Result;
  removeFriend(userId: string): void;
  blockUser(userId: string): void;
  unblockUser(userId: string): void;
  report(input: { targetType: "user" | "chatter"; targetId: string; reason: string }): void;
  markThreadRead(threadId: string): void;
  markNotificationsRead(): void;
  ackFlash(id: string): void;
  setPresence(presence: { threadId: string | null }): void;
  refreshMatch(): Result;
  ensureMatch(): void;
  tapUser(userId: string): Result;
  acceptTap(tapId: string): Result<{ threadId: string }>;
  declineTap(tapId: string): Result;
  resetFloor(): void;
  startLive(): void;
  stopLive(): void;
}
