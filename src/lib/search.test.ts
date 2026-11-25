import { describe, expect, it } from "vitest";
import { searchRooms } from "@/lib/search";

const rooms = [
  {
    name: "The Library",
    blurb: "Books, films, and the line you underlined twice.",
    hashtags: ["books", "writing", "film"],
  },
  {
    name: "Market Open",
    blurb: "The auction, the open, and whatever just printed.",
    hashtags: ["markets", "macro", "trading"],
  },
  {
    name: "Night Desk",
    blurb: "For the hours when the group chat is honest.",
    hashtags: ["night-owl", "writing", "remote"],
  },
];

describe("searchRooms", () => {
  it("matches a room name by words", () => {
    expect(searchRooms(rooms, "library").map((room) => room.name)).toEqual(["The Library"]);
    expect(searchRooms(rooms, "market open").map((room) => room.name)).toEqual(["Market Open"]);
  });

  it("matches a hashtag with or without a hash", () => {
    expect(searchRooms(rooms, "#books").map((room) => room.name)).toEqual(["The Library"]);
    expect(searchRooms(rooms, "night-owl").map((room) => room.name)).toEqual(["Night Desk"]);
    expect(searchRooms(rooms, "#night").map((room) => room.name)).toEqual(["Night Desk"]);
  });

  it("does not treat a hashtag query as a name search", () => {
    expect(searchRooms(rooms, "#library")).toEqual([]);
  });

  it("requires every word to hit", () => {
    expect(searchRooms(rooms, "library markets")).toEqual([]);
    expect(searchRooms(rooms, "open auction").map((room) => room.name)).toEqual(["Market Open"]);
  });
});
