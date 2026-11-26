import { describe, expect, it } from "vitest";
import {
  BACKGROUNDS,
  BUILDS,
  EARS,
  EYES,
  FURS,
  NONE_CHANCE,
  SKINS,
  SNOUTS,
  TAILS,
  WHISKERS,
  defaultAvatar,
  linkedPaint,
  parseAvatar,
  randomAvatar,
} from "@/lib/avatar";

function constant(value: number) {
  return () => value;
}

describe("mouse avatar", () => {
  it("starts from the named defaults", () => {
    const avatar = defaultAvatar();
    expect(avatar.background).toBe("Pastel Cream");
    expect(avatar.tail).toBe("Classic Smooth");
    expect(avatar.tailAccessory).toBe("None");
    expect(avatar.build).toBe("Standard");
    expect(avatar.fur).toBe("Agouti Brown");
    expect(avatar.skin).toBe("Soft Pink");
    expect(avatar.markings).toBe("None");
    expect(avatar.outfit).toBe("None");
    expect(avatar.neckwear).toBe("None");
    expect(avatar.ears).toBe("Standard Top");
    expect(avatar.earAccessory).toBe("None");
    expect(avatar.eyes).toBe("Glossy Boba");
    expect(avatar.eyewear).toBe("None");
    expect(avatar.snout).toBe("Twitchy Pink Nose");
    expect(avatar.whiskers).toBe("Neat Straight");
    expect(avatar.headwear).toBe("None");
    expect(avatar.prop).toBe("None");
    expect("flag" in avatar).toBe(false);
  });

  it("paints the tail, ears, and snout from the same skin tone", () => {
    const paints = SKINS.map((skin) => linkedPaint({ skin }));
    for (const paint of paints) {
      expect(paint.tail).toBe(paint.ears);
      expect(paint.snout).not.toBe(paint.tail);
      expect(paint.nose).not.toBe(paint.tail);
    }
    expect(new Set(paints.map((paint) => paint.tail)).size).toBe(SKINS.length);
  });

  it("keeps required layers and honors None chances", () => {
    const zero = randomAvatar(constant(0));
    expect(zero).toMatchObject({
      background: BACKGROUNDS[0],
      tail: TAILS[0],
      tailAccessory: "None",
      build: BUILDS[0],
      fur: FURS[0],
      skin: SKINS[0],
      markings: "None",
      outfit: "None",
      ears: EARS[0],
      eyes: EYES[0],
      snout: SNOUTS[0],
      whiskers: WHISKERS[0],
    });

    const samples = 2000;
    const counts = {
      tailAccessory: 0,
      markings: 0,
      outfit: 0,
      neckwear: 0,
      earAccessory: 0,
      eyewear: 0,
      headwear: 0,
      prop: 0,
    };
    let seed = 0x1234abcd;
    const rng = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
    for (let index = 0; index < samples; index += 1) {
      const avatar = randomAvatar(rng);
      expect(BACKGROUNDS).toContain(avatar.background);
      expect(TAILS).toContain(avatar.tail);
      expect(BUILDS).toContain(avatar.build);
      expect(FURS).toContain(avatar.fur);
      expect(SKINS).toContain(avatar.skin);
      expect(EARS).toContain(avatar.ears);
      expect(EYES).toContain(avatar.eyes);
      expect(SNOUTS).toContain(avatar.snout);
      expect(WHISKERS).toContain(avatar.whiskers);
      expect(linkedPaint(avatar).tail).toBe(linkedPaint({ skin: avatar.skin }).tail);
      for (const key of Object.keys(counts) as (keyof typeof counts)[]) {
        if (avatar[key] === "None") counts[key] += 1;
      }
    }
    for (const [key, chance] of Object.entries(NONE_CHANCE) as [keyof typeof counts, number][]) {
      const rate = counts[key] / samples;
      expect(Math.abs(rate - chance), key).toBeLessThan(0.08);
    }
  });

  it("rejects a broken config and drops a leftover flag", () => {
    expect(parseAvatar(null).ok).toBe(false);
    expect(parseAvatar({ ...defaultAvatar(), fur: "Not a fur" }).ok).toBe(false);
    const parsed = parseAvatar({
      ...defaultAvatar(),
      flag: "Country Flag Selector",
      countryCode: "JP",
      guildLabel: "mice!!desk",
      guildColor: "#112233",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.avatar).not.toHaveProperty("flag");
    expect(parsed.avatar).not.toHaveProperty("countryCode");
    expect(parsed.avatar).not.toHaveProperty("guildLabel");
    expect(parsed.avatar).not.toHaveProperty("guildColor");
    expect(parsed.avatar.fur).toBe("Agouti Brown");
    const tipped = parseAvatar({ ...defaultAvatar(), tailAccessory: "Mini Flag Tip" });
    expect(tipped.ok).toBe(true);
    if (tipped.ok) expect(tipped.avatar.tailAccessory).toBe("None");
  });
});
