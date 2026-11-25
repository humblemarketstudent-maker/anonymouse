import { describe, expect, it } from "vitest";
import { countRecent, heatBars, HEAT_WINDOW_MS } from "@/lib/heat";

describe("heatBars", () => {
  it("maps the last 24 hours of messages onto five bars", () => {
    expect(heatBars(0)).toBe(0);
    expect(heatBars(1)).toBe(1);
    expect(heatBars(2)).toBe(2);
    expect(heatBars(3)).toBe(3);
    expect(heatBars(4)).toBe(3);
    expect(heatBars(5)).toBe(4);
    expect(heatBars(7)).toBe(4);
    expect(heatBars(8)).toBe(5);
    expect(heatBars(40)).toBe(5);
  });
});

describe("countRecent", () => {
  it("counts only timestamps inside the window", () => {
    const now = 1_700_000_000_000;
    const stamps = [now - 60_000, now - HEAT_WINDOW_MS, now - HEAT_WINDOW_MS - 1, now + 1];
    expect(countRecent(stamps, now)).toBe(2);
  });
});
