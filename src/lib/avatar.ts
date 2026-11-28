/**
 * Optional layered mouse avatar. Required layers always have a value.
 * Optional layers may be "None". Tail, ears, and snout paint from the skin tone.
 */

export const BACKGROUNDS = [
  "Pastel Cream",
  "Pastel Mint",
  "Pastel Lavender",
  "Sunset Gradient",
  "Parisian Kitchen",
  "Cozy Library",
  "Cyberpunk Alley",
  "Swiss Cheese Pattern",
] as const;

export const TAILS = [
  "Classic Smooth",
  "Fluffy Bushy",
  "Braided",
  "Curled Heart",
  "Lightning Bolt",
  "Cybernetic Metal",
] as const;

export const TAIL_ACCESSORIES = [
  "None",
  "Silk Ribbon Bow",
  "Tiny Brass Bell",
  "Bandage Wrap",
  "Spiked Cuff",
] as const;

export const BUILDS = ["Standard", "Chonky", "Sleek", "Scruffy"] as const;

export const FURS = [
  "Albino White",
  "Agouti Brown",
  "Slate Gray",
  "Charcoal Black",
  "Champagne Cream",
  "Pastel Lilac",
  "Cyber Blue",
] as const;

export const SKINS = ["Soft Pink", "Dark Slate", "Warm Tan", "Ruby Tint"] as const;

export const MARKINGS = [
  "None",
  "Hooded Stripe",
  "Berkshire Belly",
  "Siamese Points",
  "Dalmatian Spots",
  "Forehead Blaze",
] as const;

export const OUTFITS = [
  "None",
  "Knitted Sweater",
  "Oversized Hoodie",
  "Detective Trench Coat",
  "Chef Jacket",
  "Wizard Robe",
  "Medieval Plate Armor",
] as const;

export const NECKWEAR = [
  "None",
  "Red Bandana",
  "Bow Tie",
  "Silk Scarf",
  "Studded Collar",
  "Pearl Necklace",
  "Gold Chain",
] as const;

export const EARS = ["Standard Top", "Round Dumbo", "Folded Floppy", "Notched Scarred"] as const;

export const EAR_ACCESSORIES = ["None", "Gold Hoop", "Safety Pin", "Daisy Flower", "Mini Headphones"] as const;

export const EYES = [
  "Glossy Boba",
  "Ruby Red",
  "Sleepy Half-Lidded",
  "Anime Sparkle",
  "Spiral Dizzy",
  "Heterochromia",
  "Glowing Neon",
] as const;

export const EYEWEAR = [
  "None",
  "Wire-Rim Glasses",
  "Pixel Sunglasses",
  "Gold Monocle",
  "Steampunk Goggles",
  "Pirate Eyepatch",
] as const;

export const SNOUTS = ["Twitchy Pink Nose", "Buck Teeth", "Cheeky Smirk", "Tiny Fangs", "Nose Bandage"] as const;

export const WHISKERS = [
  "Neat Straight",
  "Long Droopy",
  "Curly Rex",
  "Scruffy Jagged",
  "Handlebar",
  "Cheese Crumb Stuck",
] as const;

export const HATS = [
  "None",
  "Beanie",
  "Chef's Toque",
  "Wizard Hat",
  "Royal Crown",
  "Pirate Tricorn",
  "Propeller Cap",
  "Hollowed Cheese Wedge",
] as const;

export const PROPS = [
  "None",
  "Swiss Cheese Wedge",
  "Mini Baguette",
  "Rolled Newspaper",
  "Wrench",
  "Magic Wand",
  "Teacup",
  "Briefcase",
] as const;

/** Chance an optional layer lands on None while randomizing. */
export const NONE_CHANCE = {
  tailAccessory: 0.65,
  markings: 0.45,
  outfit: 0.4,
  neckwear: 0.55,
  earAccessory: 0.65,
  eyewear: 0.6,
  headwear: 0.5,
  prop: 0.55,
} as const;

export type Background = (typeof BACKGROUNDS)[number];
export type Tail = (typeof TAILS)[number];
export type TailAccessory = (typeof TAIL_ACCESSORIES)[number];
export type Build = (typeof BUILDS)[number];
export type Fur = (typeof FURS)[number];
export type Skin = (typeof SKINS)[number];
export type Marking = (typeof MARKINGS)[number];
export type Outfit = (typeof OUTFITS)[number];
export type Neckwear = (typeof NECKWEAR)[number];
export type Ears = (typeof EARS)[number];
export type EarAccessory = (typeof EAR_ACCESSORIES)[number];
export type Eyes = (typeof EYES)[number];
export type Eyewear = (typeof EYEWEAR)[number];
export type Snout = (typeof SNOUTS)[number];
export type Whiskers = (typeof WHISKERS)[number];
export type Hat = (typeof HATS)[number];
export type Prop = (typeof PROPS)[number];

export interface MouseAvatar {
  background: Background;
  tail: Tail;
  tailAccessory: TailAccessory;
  build: Build;
  fur: Fur;
  skin: Skin;
  markings: Marking;
  outfit: Outfit;
  neckwear: Neckwear;
  ears: Ears;
  earAccessory: EarAccessory;
  eyes: Eyes;
  eyewear: Eyewear;
  snout: Snout;
  whiskers: Whiskers;
  headwear: Hat;
  prop: Prop;
}

export interface SkinPaint {
  main: string;
  deep: string;
  lite: string;
}

/** Shared by the tail, the inner ears, and the snout so those layers stay linked. */
export const SKIN_PAINT: Record<Skin, SkinPaint> = {
  "Soft Pink": { main: "#f2b4ae", deep: "#d48984", lite: "#ffd9d4" },
  "Dark Slate": { main: "#5e6976", deep: "#3c4550", lite: "#8d97a4" },
  "Warm Tan": { main: "#e0b07a", deep: "#c48b4e", lite: "#f6d7b0" },
  "Ruby Tint": { main: "#d15d6e", deep: "#a33d4e", lite: "#f3a8b3" },
};

export interface FurPaint {
  main: string;
  deep: string;
  lite: string;
}

export const FUR_PAINT: Record<Fur, FurPaint> = {
  "Albino White": { main: "#f7f4ee", deep: "#e0d9cc", lite: "#ffffff" },
  "Agouti Brown": { main: "#8d5a34", deep: "#69401f", lite: "#c4a27a" },
  "Slate Gray": { main: "#7b8694", deep: "#56606c", lite: "#c5ced8" },
  "Charcoal Black": { main: "#2e333a", deep: "#1a1e24", lite: "#8b939e" },
  "Champagne Cream": { main: "#ead7b4", deep: "#d2b48a", lite: "#fff6e6" },
  "Pastel Lilac": { main: "#cbb6dc", deep: "#a890bc", lite: "#f3e9f8" },
  "Cyber Blue": { main: "#3f86b0", deep: "#2a6284", lite: "#b7ddf0" },
};

export function defaultAvatar(): MouseAvatar {
  return {
    background: "Pastel Cream",
    tail: "Classic Smooth",
    tailAccessory: "None",
    build: "Standard",
    fur: "Agouti Brown",
    skin: "Soft Pink",
    markings: "None",
    outfit: "None",
    neckwear: "None",
    ears: "Standard Top",
    earAccessory: "None",
    eyes: "Glossy Boba",
    eyewear: "None",
    snout: "Twitchy Pink Nose",
    whiskers: "Neat Straight",
    headwear: "None",
    prop: "None",
  };
}

/** Colors the renderer uses for the three skin-linked layers. */
export function linkedPaint(avatar: Pick<MouseAvatar, "skin">): { tail: string; ears: string; snout: string; nose: string } {
  const skin = SKIN_PAINT[avatar.skin];
  return { tail: skin.main, ears: skin.main, snout: skin.lite, nose: skin.deep };
}

function pick<T>(rng: () => number, options: readonly T[]): T {
  const index = Math.min(options.length - 1, Math.max(0, Math.floor(rng() * options.length)));
  return options[index]!;
}

function pickOptional<T extends string>(rng: () => number, noneChance: number, options: readonly T[]): T | "None" {
  if (rng() < noneChance) return "None";
  return pick(rng, options);
}

function withoutNone<T extends string>(options: readonly T[]): T[] {
  return options.filter((option) => option !== "None");
}

export function randomAvatar(rng: () => number = Math.random): MouseAvatar {
  const avatar: MouseAvatar = {
    ...defaultAvatar(),
    background: pick(rng, BACKGROUNDS),
    tail: pick(rng, TAILS),
    tailAccessory: pickOptional(rng, NONE_CHANCE.tailAccessory, withoutNone(TAIL_ACCESSORIES)),
    build: pick(rng, BUILDS),
    fur: pick(rng, FURS),
    skin: pick(rng, SKINS),
    markings: pickOptional(rng, NONE_CHANCE.markings, withoutNone(MARKINGS)),
    outfit: pickOptional(rng, NONE_CHANCE.outfit, withoutNone(OUTFITS)),
    neckwear: pickOptional(rng, NONE_CHANCE.neckwear, withoutNone(NECKWEAR)),
    ears: pick(rng, EARS),
    earAccessory: pickOptional(rng, NONE_CHANCE.earAccessory, withoutNone(EAR_ACCESSORIES)),
    eyes: pick(rng, EYES),
    eyewear: pickOptional(rng, NONE_CHANCE.eyewear, withoutNone(EYEWEAR)),
    snout: pick(rng, SNOUTS),
    whiskers: pick(rng, WHISKERS),
    headwear: pickOptional(rng, NONE_CHANCE.headwear, withoutNone(HATS)),
    prop: pickOptional(rng, NONE_CHANCE.prop, withoutNone(PROPS)),
  };
  return avatar;
}

function isOne<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

export function parseAvatar(value: unknown): { ok: true; avatar: MouseAvatar } | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "That mouse isn't valid." };
  const raw = value as Partial<Omit<MouseAvatar, "tailAccessory">> & { tailAccessory?: string };
  const tailAccessory = raw.tailAccessory === "Mini Flag Tip" ? "None" : raw.tailAccessory;
  if (!isOne(BACKGROUNDS, raw.background)) return { ok: false, error: "Pick a background." };
  if (!isOne(TAILS, raw.tail)) return { ok: false, error: "Pick a tail." };
  if (!isOne(TAIL_ACCESSORIES, tailAccessory)) return { ok: false, error: "Pick a tail accessory." };
  if (!isOne(BUILDS, raw.build)) return { ok: false, error: "Pick a build." };
  if (!isOne(FURS, raw.fur)) return { ok: false, error: "Pick a fur color." };
  if (!isOne(SKINS, raw.skin)) return { ok: false, error: "Pick a skin tone." };
  if (!isOne(MARKINGS, raw.markings)) return { ok: false, error: "Pick fur markings." };
  if (!isOne(OUTFITS, raw.outfit)) return { ok: false, error: "Pick an outfit." };
  if (!isOne(NECKWEAR, raw.neckwear)) return { ok: false, error: "Pick neckwear." };
  if (!isOne(EARS, raw.ears)) return { ok: false, error: "Pick ears." };
  if (!isOne(EAR_ACCESSORIES, raw.earAccessory)) return { ok: false, error: "Pick an ear accessory." };
  if (!isOne(EYES, raw.eyes)) return { ok: false, error: "Pick eyes." };
  if (!isOne(EYEWEAR, raw.eyewear)) return { ok: false, error: "Pick eyewear." };
  if (!isOne(SNOUTS, raw.snout)) return { ok: false, error: "Pick a snout." };
  if (!isOne(WHISKERS, raw.whiskers)) return { ok: false, error: "Pick whiskers." };
  if (!isOne(HATS, raw.headwear)) return { ok: false, error: "Pick a hat." };
  if (!isOne(PROPS, raw.prop)) return { ok: false, error: "Pick a prop." };
  return {
    ok: true,
    avatar: {
      background: raw.background,
      tail: raw.tail,
      tailAccessory,
      build: raw.build,
      fur: raw.fur,
      skin: raw.skin,
      markings: raw.markings,
      outfit: raw.outfit,
      neckwear: raw.neckwear,
      ears: raw.ears,
      earAccessory: raw.earAccessory,
      eyes: raw.eyes,
      eyewear: raw.eyewear,
      snout: raw.snout,
      whiskers: raw.whiskers,
      headwear: raw.headwear,
      prop: raw.prop,
    },
  };
}

export function coerceAvatar(value: unknown): MouseAvatar | null {
  const parsed = parseAvatar(value);
  return parsed.ok ? parsed.avatar : null;
}
