import { describe, expect, it } from "vitest";
import { buildTranscript } from "@/lib/transcript";
import { formatClock, formatDayLabel } from "@/lib/time";

const now = new Date(2026, 10, 25, 15, 0).getTime();
const today = new Date(2026, 10, 25, 9, 5).getTime();
const yesterday = new Date(2026, 10, 24, 22, 15).getTime();
const older = new Date(2026, 10, 2, 12, 0).getTime();
const lastYear = new Date(2025, 11, 31, 18, 0).getTime();

describe("formatDayLabel", () => {
  it("labels today, yesterday, and older dates", () => {
    expect(formatDayLabel(today, now)).toBe("Today");
    expect(formatDayLabel(yesterday, now)).toBe("Yesterday");
    expect(formatDayLabel(older, now)).toBe("Nov 2");
    expect(formatDayLabel(lastYear, now)).toBe("Dec 31, 2025");
  });

  it("treats the previous calendar day as yesterday across a month boundary", () => {
    const december = new Date(2026, 11, 1, 8, 0).getTime();
    const november = new Date(2026, 10, 30, 21, 0).getTime();
    expect(formatDayLabel(november, december)).toBe("Yesterday");
  });
});

describe("formatClock", () => {
  it("uses a short clock time", () => {
    expect(formatClock(today)).toBe("9:05 AM");
    expect(formatClock(now)).toBe("3:00 PM");
  });
});

describe("buildTranscript", () => {
  const lines = [
    { id: "a2", senderId: "alice", createdAt: yesterday + 60_000 },
    { id: "a1", senderId: "alice", createdAt: yesterday },
    { id: "me", senderId: "me", createdAt: today },
    { id: "bob", senderId: "bob", createdAt: today + 60_000 },
  ];

  it("orders messages, inserts day chips, and names only the first incoming bubble in a run", () => {
    const items = buildTranscript(lines, now, { meId: "me", showAliases: true });
    expect(items.map((item) => (item.kind === "day" ? item.label : `${item.message.id}:${item.showAlias}`))).toEqual([
      "Yesterday",
      "a1:true",
      "a2:false",
      "Today",
      "me:false",
      "bob:true",
    ]);
    const mine = items.find((item) => item.kind === "message" && item.message.id === "me");
    expect(mine?.kind === "message" && mine.showAlias).toBe(false);
  });

  it("hides aliases in a direct thread", () => {
    const items = buildTranscript(lines, now, { meId: "me", showAliases: false });
    expect(items.filter((item) => item.kind === "message").every((item) => item.kind === "message" && !item.showAlias)).toBe(
      true,
    );
  });
});
