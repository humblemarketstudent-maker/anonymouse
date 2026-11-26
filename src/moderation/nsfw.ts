/**
 * Text heuristics for adult content and for sexual content that appears to
 * involve minors. Matches are masked in previews. Minor hits are withheld
 * entirely so logs never keep that text.
 */

const ADULT: RegExp[] = [
  /\bporn(?:ography|ographic)?\b/i,
  /\bnudes?\b/i,
  /\bnaked\b/i,
  /\bxxx\b/i,
  /\bonly\s*fans\b/i,
  /\bnsfw\b/i,
  /\bsex\s*tape\b/i,
  /\bblow\s*jobs?\b/i,
  /\bhand\s*jobs?\b/i,
  /\bdick\s*pics?\b/i,
  /\bhorny\b/i,
  /\borgasms?\b/i,
  /\bmasturbat(?:e|ion|ing)\b/i,
  /\berotic\b/i,
  /\bhentai\b/i,
  /\bcam\s*girls?\b/i,
  /\bfetish\b/i,
  /\bexplicit\s+(?:sex|content|photo|photos|video|videos)\b/i,
];

const MINOR_CONTEXT: RegExp[] = [
  /\bunderage\b/i,
  /\bpre[\s-]?teens?\b/i,
  /\bloli(?:ta|con)?\b/i,
  /\b(?:child|children|minor|minors|kid|kids)\b/i,
  /\b(?:1[0-7]|[0-9])\s*(?:years?\s*old|yo|y\/o)\b/i,
  /\bunder\s*18\b/i,
];

const MINOR_DIRECT: RegExp[] = [
  /\b(?:child|children|underage|minor|pre[\s-]?teen|kid|kids)\s*(?:porn|sex|nude|nudes|xxx)\b/i,
  /\b(?:porn|sex|nude|nudes|xxx)\s*(?:of|with|involving)\s*(?:a\s+)?(?:child|children|minor|minors|kid|kids|underage)\b/i,
  /\bcsam\b/i,
  /\bchild\s*sexual\b/i,
];

export function hasAdultText(text: string): boolean {
  return ADULT.some((pattern) => pattern.test(text));
}

export function hasMinorSexualText(text: string): boolean {
  if (MINOR_DIRECT.some((pattern) => pattern.test(text))) return true;
  return hasAdultText(text) && MINOR_CONTEXT.some((pattern) => pattern.test(text));
}

export function maskAdultText(text: string): string {
  let out = text;
  for (const pattern of ADULT) {
    out = out.replace(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`), "****");
  }
  return out;
}
