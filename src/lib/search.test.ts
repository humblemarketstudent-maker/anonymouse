import { describe, expect, it } from "vitest";
import { searchRooms } from "@/lib/search";

const rooms = [
  {
    name: "Reading Room",
    blurb: "Books, films, and the line you underlined twice.",
    hashtags: ["books", "writing", "film"],
  },
  {
    name: "Open Call",
    blurb: "The auction, the open, and whatever just printed.",
    hashtags: ["markets", "macro", "trading"],
  },
  {
    name: "Late Shift",
    blurb: "For the hours when the group chat is honest.",
    hashtags: ["night-owl", "writing", "remote"],
  },
];

describe("searchRooms", () => {
  it("matches a room name by words", () => {
    expect(searchRooms(rooms, "reading").map((room) => room.name)).toEqual(["Reading Room"]);
    expect(searchRooms(rooms, "open call").map((room) => room.name)).toEqual(["Open Call"]);
  });

  it("matches a hashtag with or without a hash", () => {
    expect(searchRooms(rooms, "#books").map((room) => room.name)).toEqual(["Reading Room"]);
    expect(searchRooms(rooms, "night-owl").map((room) => room.name)).toEqual(["Late Shift"]);
    expect(searchRooms(rooms, "#night").map((room) => room.name)).toEqual(["Late Shift"]);
  });

  it("does not treat a hashtag query as a name search", () => {
    expect(searchRooms(rooms, "#reading")).toEqual([]);
  });

  it("requires every word to hit", () => {
    expect(searchRooms(rooms, "reading markets")).toEqual([]);
    expect(searchRooms(rooms, "open auction").map((room) => room.name)).toEqual(["Open Call"]);
  });
});
