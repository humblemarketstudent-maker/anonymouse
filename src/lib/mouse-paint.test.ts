import { describe, expect, it } from "vitest";
import { REGION, MOUSE_CUTOUT_HEIGHT, MOUSE_CUTOUT_WIDTH, mouseRegions } from "@/lib/mouse-regions";
import { paintPixel, type PaintSpec } from "@/lib/mouse-paint";

function spec(partial: Partial<PaintSpec> = {}): PaintSpec {
  return {
    fur: "Agouti Brown",
    skin: "Soft Pink",
    hideEyes: false,
    hideWhiskers: false,
    hideEars: false,
    hideMouth: false,
    siamese: false,
    ...partial,
  };
}

describe("illustrated mouse paint", () => {
  it("keeps a region map aligned with the cutout", () => {
    const regions = mouseRegions();
    expect(regions.length).toBe(MOUSE_CUTOUT_WIDTH * MOUSE_CUTOUT_HEIGHT);
    const counts = new Map<number, number>();
    for (const region of regions) counts.set(region, (counts.get(region) ?? 0) + 1);
    expect(counts.get(REGION.fur) ?? 0).toBeGreaterThan(1500);
    expect(counts.get(REGION.belly) ?? 0).toBeGreaterThan(400);
    expect(counts.get(REGION.skin) ?? 0).toBeGreaterThan(200);
    expect(counts.get(REGION.ear) ?? 0).toBeGreaterThan(200);
    expect(counts.get(REGION.eye) ?? 0).toBeGreaterThan(20);
  });

  it("recasts fur and the linked skin on the same base pixel", () => {
    const brown = paintPixel(REGION.fur, 206, 175, 150, 70, 80, spec());
    const blue = paintPixel(REGION.fur, 206, 175, 150, 70, 80, spec({ fur: "Cyber Blue" }));
    const white = paintPixel(REGION.fur, 206, 175, 150, 70, 80, spec({ fur: "Albino White" }));
    expect(brown[0]).toBeGreaterThan(brown[2]);
    expect(blue[2]).toBeGreaterThan(blue[0]);
    expect(white[0]).toBeGreaterThan(brown[0]);

    const pink = paintPixel(REGION.skin, 224, 168, 155, 46, 49, spec());
    const slate = paintPixel(REGION.skin, 224, 168, 155, 46, 49, spec({ skin: "Dark Slate" }));
    const ruby = paintPixel(REGION.skin, 224, 168, 155, 46, 49, spec({ skin: "Ruby Tint" }));
    expect(pink[0]).toBeGreaterThan(slate[0]);
    expect(ruby[0]).toBeGreaterThan(slate[0]);
    expect(slate[2]).toBeGreaterThan(slate[0] - 30);

    const belly = paintPixel(REGION.belly, 232, 206, 184, 73, 110, spec({ fur: "Cyber Blue" }));
    const body = paintPixel(REGION.fur, 180, 150, 120, 70, 90, spec({ fur: "Cyber Blue" }));
    expect(belly[0] + belly[1] + belly[2]).toBeGreaterThan(body[0] + body[1] + body[2]);
  });

  it("drops replaced features and keeps the smile for the default snout", () => {
    const eye = paintPixel(REGION.eye, 30, 20, 18, 61, 69, spec({ hideEyes: true }));
    expect(eye[0]).toBeGreaterThan(80);
    const kept = paintPixel(REGION.eye, 30, 20, 18, 61, 69, spec({ hideEyes: false }));
    expect(kept).toEqual([22, 18, 16, 255]);
    const smile = paintPixel(REGION.mouth, 40, 25, 20, 72, 84, spec({ hideMouth: false }));
    expect(smile[3]).toBe(255);
    const covered = paintPixel(REGION.mouth, 40, 25, 20, 72, 84, spec({ hideMouth: true }));
    expect(covered[0]).toBeGreaterThan(smile[0]);
    const ear = paintPixel(REGION.ear, 200, 160, 130, 48, 46, spec({ hideEars: true }));
    expect(ear[3]).toBe(0);
  });
});
