import { describe, expect, it } from "vitest";
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
} from "@/data/floor";
import { CONTACT_BLOCKED, contactViolation } from "@/lib/contact";

const ORDINARY = [
  "The dollar is the tell. Everything else is narrating it.",
  "Still short. Smaller than I sound.",
  "The version of this you'd say at noon is worse. Say this one.",
  "Clients want 8% and no red days.",
  "Policy is a group chat with worse fonts.",
  "look at the dot com bubble",
  "read it at reuters.com",
  "meet at 5",
  "the print was 4.2",
  "I have 20 taps left",
  "2024 was loud",
  "call it a day",
  "2024-11-25 is a date, not a number to dial",
  "version 1.2.3.4.5.6.7.8 shipped",
  "the host is 10.0.0.1 on the lab net",
  "https://www.bloomberg.com/news/articles/mega-cap-buybacks-slow-rate-path",
  "Auction feels heavy. Real money is selling the open, not buying the story.",
];

const BLOCKED: Array<[string, string]> = [
  ["text me at 212-555-0199", "phone"],
  ["+1 (212) 555-0148", "phone"],
  ["+44 20 7946 0958", "phone"],
  ["212.555.0199", "phone"],
  ["212 555 0148", "phone"],
  ["1 212 555 0148", "phone"],
  ["00 44 20 7946 0958", "phone"],
  ["call 2125550148", "phone"],
  ["2 1 2 5 5 5 0 1 4 8", "phone"],
  ["tel:+12125550148", "phone"],
  ["020 7946 0958", "phone"],
  ["ping jane.doe@gmail.com", "email"],
  ["jane @ gmail.com", "email"],
  ["jane at gmail dot com", "email"],
  ["jane at gmail.com", "email"],
  ["jane(at)gmail(dot)com", "email"],
  ["jane[at]gmail[dot]com", "email"],
  ["trader@bloomberg.net", "bloomberg"],
  ["trader at bloomberg dot net", "email"],
  ["see bloomberg.net/profile", "bloomberg"],
  ["uuid 12345678-1234-1234-1234-123456789abc", "bloomberg"],
  ["my bbg id is 8f3a9c21", "bloomberg"],
  ["bbg uuid: 1234abcd", "bloomberg"],
  ["@nightowl_desk", "telegram"],
  ["find me on t.me/nightowl", "telegram"],
  ["https://t.me/nightowl", "telegram"],
  ["https://telegram.me/nightowl", "telegram"],
  ["tg://resolve?domain=nightowl", "telegram"],
  ["t dot me / nightowl", "telegram"],
  ["telegram dot me/nightowl", "telegram"],
  ["wechat: night_owl", "wechat"],
  ["wxid_ab12cd", "wechat"],
  ["weixin id trader_7", "wechat"],
  ["telegram at night_owl", "telegram"],
];

describe("contactViolation", () => {
  it("leaves ordinary conversation alone, including the seeded floor", () => {
    for (const line of ORDINARY) expect(contactViolation(line), line).toBeNull();
    for (const user of MOCK_USERS) expect(contactViolation(user.bioQuote), user.alias).toBeNull();
    for (const room of SEED_ROOMS) {
      expect(contactViolation(room.name), room.name).toBeNull();
      expect(contactViolation(room.blurb), room.name).toBeNull();
    }
    for (const line of SEED_CHATTERS) expect(contactViolation(line.body), line.body).toBeNull();
    for (const line of LIVE_ROOMS) expect(contactViolation(line.body), line.body).toBeNull();
    for (const line of [...REPLIES, ...QUESTION_REPLIES, ...BLAST_LINES, ...MATCH_GREETINGS]) {
      expect(contactViolation(line), line).toBeNull();
    }
    for (const thread of SEAT_THREADS) {
      for (const line of thread.lines) expect(contactViolation(line.body), line.body).toBeNull();
    }
    for (const item of NEWS_ITEMS) {
      expect(contactViolation(item.url), item.url).toBeNull();
      expect(contactViolation(item.title), item.title).toBeNull();
      expect(contactViolation(item.summary), item.summary).toBeNull();
    }
  });

  it("catches phones, emails, Bloomberg IDs, and Telegram handles", () => {
    for (const [line, kind] of BLOCKED) {
      expect(contactViolation(line), line).toBe(kind);
    }
    expect(CONTACT_BLOCKED).toMatch(/aren't allowed/i);
    expect(CONTACT_BLOCKED).toMatch(/Phone numbers/);
    expect(CONTACT_BLOCKED).toMatch(/Telegram/);
  });
});
