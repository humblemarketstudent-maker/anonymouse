/**
 * App-facing contract. UI code should depend on this module and on
 * `backend` from `./index`, never on localStorage or a vendor SDK.
 * A Supabase or Firebase implementation can replace the local one
 * by satisfying `Backend`.
 */

export const SECTORS = [
  "Investment Banking",
  "Hedge Fund",
  "Private Equity",
  "Venture Capital",
  "Quant/Trading",
  "Wealth Management",
  "FinTech",
  "Crypto/DeFi",
  "Retail/Other",
] as const;

export type Sector = (typeof SECTORS)[number];

export const SECTOR_SHORT: Record<Sector, string> = {
  "Investment Banking": "IB",
  "Hedge Fund": "Hedge",
  "Private Equity": "PE",
  "Venture Capital": "VC",
  "Quant/Trading": "Quant",
  "Wealth Management": "Wealth",
  FinTech: "FinTech",
  "Crypto/DeFi": "Crypto",
  "Retail/Other": "Retail",
};

export type Method = "phone" | "email";

/** Demo OTP accepted by the local backend. Documented in the README and on the sign-in screen. */
export const DEMO_OTP = "000000";

export interface PublicUser {
  id: string;
  alias: string;
  bioQuote: string;
  sector: Sector;
  joinedAt: number;
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
  roomId: string | null;
  body: string;
  news?: NewsLink;
  createdAt: number;
}

export interface ThreadSummary {
  id: string;
  peerId: string;
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
}

export interface ProfileInput {
  alias: string;
  bioQuote: string;
  sector: Sector;
}

export interface Snapshot {
  session: { userId: string; method: Method } | null;
  me: PublicUser | null;
  users: PublicUser[];
  directory: PublicUser[];
  blockedUsers: PublicUser[];
  friendIds: string[];
  chatters: Chatter[];
  threads: ThreadSummary[];
  messages: DirectMessage[];
  notifications: AppNotification[];
  flashes: Flash[];
  announcement: string;
}

export type Result<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export interface Backend {
  subscribe(listener: () => void): () => void;
  getSnapshot(): Snapshot;
  requestOtp(input: { contact: string; method: Method }): Promise<Result>;
  verifyOtp(code: string): Promise<Result<{ needsProfile: boolean }>>;
  completeProfile(input: ProfileInput): Result;
  updateProfile(input: ProfileInput): Result;
  signOut(): void;
  postChatter(input: {
    body: string;
    roomId: string | null;
    news?: NewsLink;
    blastFriendIds?: string[];
  }): Result<{ id: string }>;
  sendMessage(threadId: string, body: string): Result;
  openThread(peerId: string): Result<{ threadId: string }>;
  burnThread(threadId: string): void;
  addFriend(userId: string): Result;
  removeFriend(userId: string): void;
  blockUser(userId: string): void;
  unblockUser(userId: string): void;
  report(input: { targetType: "user" | "chatter"; targetId: string; reason: string }): void;
  markThreadRead(threadId: string): void;
  markNotificationsRead(): void;
  ackFlash(id: string): void;
  setPresence(presence: { threadId: string | null }): void;
  resetFloor(): void;
  startLive(): void;
  stopLive(): void;
}
