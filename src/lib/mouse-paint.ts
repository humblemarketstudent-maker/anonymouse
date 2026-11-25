/**
 * Recolor the illustrated mouse cutout. Fur, belly, and ear leather take the
 * fur palette. Nose, inner ears, and paw pads take the skin tone, which the
 * tail also uses.
 */

import type { Fur, Skin } from "@/lib/avatar";
import { FUR_PAINT, SKIN_PAINT } from "@/lib/avatar";
import { MOUSE_CUTOUT_HEIGHT, MOUSE_CUTOUT_WIDTH, REGION } from "@/lib/mouse-regions";

export interface PaintSpec {
  fur: Fur;
  skin: Skin;
  hideEyes: boolean;
  hideWhiskers: boolean;
  hideEars: boolean;
  hideMouth: boolean;
  siamese: boolean;
}

type Rgb = [number, number, number];
type Rgba = [number, number, number, number];

export function paintKey(spec: PaintSpec): string {
  return [
    spec.fur,
    spec.skin,
    spec.hideEyes ? "1" : "0",
    spec.hideWhiskers ? "1" : "0",
    spec.hideEars ? "1" : "0",
    spec.hideMouth ? "1" : "0",
    spec.siamese ? "1" : "0",
  ].join("|");
}

function hex(value: string): Rgb {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] * (1 - clamped) + b[0] * clamped),
    Math.round(a[1] * (1 - clamped) + b[1] * clamped),
    Math.round(a[2] * (1 - clamped) + b[2] * clamped),
  ];
}

function furColor(r: number, g: number, b: number, spec: PaintSpec, darken: boolean): Rgb {
  const paint = FUR_PAINT[spec.fur];
  const deep = hex(paint.deep);
  const main = hex(paint.main);
  const lite = hex(paint.lite);
  const light = (r + g + b) / 3 / 255;
  const t = Math.max(0, Math.min(1, (light - 0.42) / 0.42));
  let col = mix(deep, main, t);
  if (light > 0.8) col = mix(col, lite, (light - 0.8) / 0.2);
  if (darken) col = mix(col, deep, 0.45);
  return col;
}

function skinColor(r: number, g: number, b: number, spec: PaintSpec, darken: boolean): Rgb {
  const paint = SKIN_PAINT[spec.skin];
  const deep = hex(paint.deep);
  const main = hex(paint.main);
  const lite = hex(paint.lite);
  const light = (r + g + b) / 3 / 255;
  let col = light < 0.62 ? mix(deep, main, light / 0.62) : mix(main, lite, (light - 0.62) / 0.38);
  if (darken) col = mix(col, deep, 0.4);
  return col;
}

function whiskerSitsOnFur(regions: Uint8Array, width: number, x: number, y: number): boolean {
  const height = Math.floor(regions.length / width);
  const around = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  for (const [dx, dy] of around) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const region = regions[ny * width + nx];
    if (region === REGION.fur || region === REGION.belly || region === REGION.skin || region === REGION.ear) return true;
  }
  return false;
}

/** One source pixel, in cutout space, painted for this spec. Alpha 0 drops it. */
export function paintPixel(
  region: number,
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  spec: PaintSpec,
  regions?: Uint8Array,
  width = MOUSE_CUTOUT_WIDTH,
): Rgba {
  if (region === REGION.empty) return [0, 0, 0, 0];
  if (spec.hideEars && (region === REGION.ear || (region === REGION.skin && y < 60))) return [0, 0, 0, 0];
  if (spec.hideWhiskers && region === REGION.whisker) {
    if (regions && !whiskerSitsOnFur(regions, width, x, y)) return [0, 0, 0, 0];
    return [...furColor(r, g, b, spec, false), 255];
  }
  if (spec.hideEyes && region === REGION.eye) return [...furColor(206, 175, 150, spec, false), 255];
  if (spec.hideMouth && (region === REGION.mouth || region === REGION.teeth)) {
    return [...furColor(206, 175, 150, spec, false), 255];
  }
  if (region === REGION.outline || region === REGION.eye || region === REGION.mouth || region === REGION.whisker) {
    return [22, 18, 16, 255];
  }
  if (region === REGION.teeth) return [248, 244, 236, 255];
  if (region === REGION.skin || (region === REGION.ear && r - g > 40)) {
    return [...skinColor(r, g, b, spec, spec.siamese), 255];
  }
  if (region === REGION.ear) return [...furColor(r, g, b, spec, spec.siamese), 255];
  if (region === REGION.belly) {
    const paint = FUR_PAINT[spec.fur];
    return [...mix(hex(paint.main), hex(paint.lite), 0.78), 255];
  }
  return [...furColor(r, g, b, spec, spec.siamese && y < 72), 255];
}

export function paintPixels(data: Uint8ClampedArray, regions: Uint8Array, width: number, height: number, spec: PaintSpec) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const pixel = index * 4;
      const [nr, ng, nb, na] = paintPixel(regionAt(regions, index), data[pixel] ?? 0, data[pixel + 1] ?? 0, data[pixel + 2] ?? 0, x, y, spec, regions, width);
      data[pixel] = nr;
      data[pixel + 1] = ng;
      data[pixel + 2] = nb;
      data[pixel + 3] = na;
    }
  }
}

function regionAt(regions: Uint8Array, index: number) {
  return regions[index] ?? REGION.empty;
}

export function cutoutMatchesRegions(width: number, height: number, regions: Uint8Array) {
  return width === MOUSE_CUTOUT_WIDTH && height === MOUSE_CUTOUT_HEIGHT && regions.length === width * height;
}
