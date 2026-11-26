/**
 * International calling codes for phone sign-in.
 *
 * The sign-in screen picks one of these regions and a national number.
 * `toE164` joins them into `+` + calling code + national digits and that
 * string is what `requestOtp` already accepts. This module does not send
 * an SMS. The local mock still checks 000000. When the auth API is
 * configured, that service sends the text.
 */

export type CallingRegion = {
  /** ISO 3166-1 alpha-2, or a reserved code such as AC for Ascension. */
  iso: string;
  name: string;
  /** ITU-T E.164 country calling code, digits only. */
  dial: string;
  /** National significant number length, trunk prefix excluded. */
  nsn?: readonly [number, number];
  aliases?: readonly string[];
};

export type E164Number = {
  ok: true;
  e164: string;
  national: string;
  region: CallingRegion;
};

export type E164Result = E164Number | { ok: false; error: string };

/** Geographic numbers in these plans keep the trunk 0 in the international form. */
const KEEPS_TRUNK_ZERO = new Set(["IT", "VA"]);

const ALIASES: Record<string, readonly string[]> = {
  AE: ["uae"],
  CI: ["ivory coast"],
  CN: ["prc"],
  CV: ["cape verde"],
  CZ: ["czech", "czech republic"],
  GB: ["uk", "britain", "england", "great britain"],
  HK: ["hongkong"],
  KP: ["dprk"],
  KR: ["korea"],
  MM: ["burma"],
  MO: ["macau"],
  SZ: ["swaziland"],
  TR: ["turkiye"],
  US: ["usa", "america"],
  VN: ["viet nam"],
};

/** Lengths used to join a calling code and a national number. Not a carrier lookup. */
const NATIONAL_LENGTH: Record<string, readonly [number, number]> = {
  AE: [8, 9],
  AT: [7, 13],
  AU: [9, 9],
  AX: [6, 12],
  BE: [8, 9],
  BR: [10, 11],
  CC: [9, 9],
  CH: [9, 9],
  CN: [10, 11],
  CX: [9, 9],
  DE: [6, 13],
  DK: [8, 8],
  ES: [9, 9],
  FI: [6, 12],
  FR: [9, 9],
  GB: [9, 10],
  GG: [9, 10],
  GR: [10, 10],
  HK: [8, 8],
  ID: [8, 12],
  IE: [7, 9],
  IL: [8, 9],
  IM: [9, 10],
  IN: [10, 10],
  IT: [6, 11],
  JE: [9, 10],
  JP: [9, 10],
  KR: [8, 11],
  KZ: [10, 10],
  MO: [8, 8],
  MX: [10, 10],
  MY: [7, 10],
  NG: [8, 10],
  NL: [9, 9],
  NO: [8, 8],
  NZ: [8, 10],
  PH: [10, 10],
  PL: [9, 9],
  PT: [9, 9],
  RU: [10, 10],
  SA: [9, 9],
  SE: [7, 13],
  SG: [8, 8],
  TH: [8, 9],
  TR: [10, 10],
  TW: [8, 9],
  VA: [6, 11],
  VN: [9, 10],
  ZA: [9, 9],
};

const SEEDS: readonly (readonly [string, string, string])[] = [
  ["AF", "Afghanistan", "93"],
  ["AL", "Albania", "355"],
  ["DZ", "Algeria", "213"],
  ["AS", "American Samoa", "1"],
  ["AD", "Andorra", "376"],
  ["AO", "Angola", "244"],
  ["AI", "Anguilla", "1"],
  ["AG", "Antigua and Barbuda", "1"],
  ["AR", "Argentina", "54"],
  ["AM", "Armenia", "374"],
  ["AW", "Aruba", "297"],
  ["AC", "Ascension Island", "247"],
  ["AU", "Australia", "61"],
  ["AT", "Austria", "43"],
  ["AZ", "Azerbaijan", "994"],
  ["BS", "Bahamas", "1"],
  ["BH", "Bahrain", "973"],
  ["BD", "Bangladesh", "880"],
  ["BB", "Barbados", "1"],
  ["BY", "Belarus", "375"],
  ["BE", "Belgium", "32"],
  ["BZ", "Belize", "501"],
  ["BJ", "Benin", "229"],
  ["BM", "Bermuda", "1"],
  ["BT", "Bhutan", "975"],
  ["BO", "Bolivia", "591"],
  ["BA", "Bosnia and Herzegovina", "387"],
  ["BW", "Botswana", "267"],
  ["BR", "Brazil", "55"],
  ["IO", "British Indian Ocean Territory", "246"],
  ["VG", "British Virgin Islands", "1"],
  ["BN", "Brunei", "673"],
  ["BG", "Bulgaria", "359"],
  ["BF", "Burkina Faso", "226"],
  ["BI", "Burundi", "257"],
  ["KH", "Cambodia", "855"],
  ["CM", "Cameroon", "237"],
  ["CA", "Canada", "1"],
  ["CV", "Cabo Verde", "238"],
  ["BQ", "Caribbean Netherlands", "599"],
  ["KY", "Cayman Islands", "1"],
  ["CF", "Central African Republic", "236"],
  ["TD", "Chad", "235"],
  ["CL", "Chile", "56"],
  ["CN", "China", "86"],
  ["CX", "Christmas Island", "61"],
  ["CC", "Cocos Islands", "61"],
  ["CO", "Colombia", "57"],
  ["KM", "Comoros", "269"],
  ["CG", "Congo", "242"],
  ["CD", "DR Congo", "243"],
  ["CK", "Cook Islands", "682"],
  ["CR", "Costa Rica", "506"],
  ["CI", "Côte d'Ivoire", "225"],
  ["HR", "Croatia", "385"],
  ["CU", "Cuba", "53"],
  ["CW", "Curaçao", "599"],
  ["CY", "Cyprus", "357"],
  ["CZ", "Czechia", "420"],
  ["DK", "Denmark", "45"],
  ["DJ", "Djibouti", "253"],
  ["DM", "Dominica", "1"],
  ["DO", "Dominican Republic", "1"],
  ["EC", "Ecuador", "593"],
  ["EG", "Egypt", "20"],
  ["SV", "El Salvador", "503"],
  ["GQ", "Equatorial Guinea", "240"],
  ["ER", "Eritrea", "291"],
  ["EE", "Estonia", "372"],
  ["SZ", "Eswatini", "268"],
  ["ET", "Ethiopia", "251"],
  ["FK", "Falkland Islands", "500"],
  ["FO", "Faroe Islands", "298"],
  ["FJ", "Fiji", "679"],
  ["FI", "Finland", "358"],
  ["FR", "France", "33"],
  ["GF", "French Guiana", "594"],
  ["PF", "French Polynesia", "689"],
  ["GA", "Gabon", "241"],
  ["GM", "Gambia", "220"],
  ["GE", "Georgia", "995"],
  ["DE", "Germany", "49"],
  ["GH", "Ghana", "233"],
  ["GI", "Gibraltar", "350"],
  ["GR", "Greece", "30"],
  ["GL", "Greenland", "299"],
  ["GD", "Grenada", "1"],
  ["GP", "Guadeloupe", "590"],
  ["GU", "Guam", "1"],
  ["GT", "Guatemala", "502"],
  ["GG", "Guernsey", "44"],
  ["GN", "Guinea", "224"],
  ["GW", "Guinea-Bissau", "245"],
  ["GY", "Guyana", "592"],
  ["HT", "Haiti", "509"],
  ["HN", "Honduras", "504"],
  ["HK", "Hong Kong", "852"],
  ["HU", "Hungary", "36"],
  ["IS", "Iceland", "354"],
  ["IN", "India", "91"],
  ["ID", "Indonesia", "62"],
  ["IR", "Iran", "98"],
  ["IQ", "Iraq", "964"],
  ["IE", "Ireland", "353"],
  ["IM", "Isle of Man", "44"],
  ["IL", "Israel", "972"],
  ["IT", "Italy", "39"],
  ["JM", "Jamaica", "1"],
  ["JP", "Japan", "81"],
  ["JE", "Jersey", "44"],
  ["JO", "Jordan", "962"],
  ["KZ", "Kazakhstan", "7"],
  ["KE", "Kenya", "254"],
  ["KI", "Kiribati", "686"],
  ["XK", "Kosovo", "383"],
  ["KW", "Kuwait", "965"],
  ["KG", "Kyrgyzstan", "996"],
  ["LA", "Laos", "856"],
  ["LV", "Latvia", "371"],
  ["LB", "Lebanon", "961"],
  ["LS", "Lesotho", "266"],
  ["LR", "Liberia", "231"],
  ["LY", "Libya", "218"],
  ["LI", "Liechtenstein", "423"],
  ["LT", "Lithuania", "370"],
  ["LU", "Luxembourg", "352"],
  ["MO", "Macao", "853"],
  ["MG", "Madagascar", "261"],
  ["MW", "Malawi", "265"],
  ["MY", "Malaysia", "60"],
  ["MV", "Maldives", "960"],
  ["ML", "Mali", "223"],
  ["MT", "Malta", "356"],
  ["MH", "Marshall Islands", "692"],
  ["MQ", "Martinique", "596"],
  ["MR", "Mauritania", "222"],
  ["MU", "Mauritius", "230"],
  ["YT", "Mayotte", "262"],
  ["MX", "Mexico", "52"],
  ["FM", "Micronesia", "691"],
  ["MD", "Moldova", "373"],
  ["MC", "Monaco", "377"],
  ["MN", "Mongolia", "976"],
  ["ME", "Montenegro", "382"],
  ["MS", "Montserrat", "1"],
  ["MA", "Morocco", "212"],
  ["MZ", "Mozambique", "258"],
  ["MM", "Myanmar", "95"],
  ["NA", "Namibia", "264"],
  ["NR", "Nauru", "674"],
  ["NP", "Nepal", "977"],
  ["NL", "Netherlands", "31"],
  ["NC", "New Caledonia", "687"],
  ["NZ", "New Zealand", "64"],
  ["NI", "Nicaragua", "505"],
  ["NE", "Niger", "227"],
  ["NG", "Nigeria", "234"],
  ["NU", "Niue", "683"],
  ["NF", "Norfolk Island", "672"],
  ["KP", "North Korea", "850"],
  ["MK", "North Macedonia", "389"],
  ["MP", "Northern Mariana Islands", "1"],
  ["NO", "Norway", "47"],
  ["OM", "Oman", "968"],
  ["PK", "Pakistan", "92"],
  ["PW", "Palau", "680"],
  ["PS", "Palestine", "970"],
  ["PA", "Panama", "507"],
  ["PG", "Papua New Guinea", "675"],
  ["PY", "Paraguay", "595"],
  ["PE", "Peru", "51"],
  ["PH", "Philippines", "63"],
  ["PN", "Pitcairn Islands", "64"],
  ["PL", "Poland", "48"],
  ["PT", "Portugal", "351"],
  ["PR", "Puerto Rico", "1"],
  ["QA", "Qatar", "974"],
  ["RE", "Réunion", "262"],
  ["RO", "Romania", "40"],
  ["RU", "Russia", "7"],
  ["RW", "Rwanda", "250"],
  ["BL", "Saint Barthélemy", "590"],
  ["SH", "Saint Helena", "290"],
  ["KN", "Saint Kitts and Nevis", "1"],
  ["LC", "Saint Lucia", "1"],
  ["MF", "Saint Martin", "590"],
  ["PM", "Saint Pierre and Miquelon", "508"],
  ["VC", "Saint Vincent and the Grenadines", "1"],
  ["WS", "Samoa", "685"],
  ["SM", "San Marino", "378"],
  ["ST", "São Tomé and Príncipe", "239"],
  ["SA", "Saudi Arabia", "966"],
  ["SN", "Senegal", "221"],
  ["RS", "Serbia", "381"],
  ["SC", "Seychelles", "248"],
  ["SL", "Sierra Leone", "232"],
  ["SG", "Singapore", "65"],
  ["SX", "Sint Maarten", "1"],
  ["SK", "Slovakia", "421"],
  ["SI", "Slovenia", "386"],
  ["SB", "Solomon Islands", "677"],
  ["SO", "Somalia", "252"],
  ["ZA", "South Africa", "27"],
  ["KR", "South Korea", "82"],
  ["SS", "South Sudan", "211"],
  ["ES", "Spain", "34"],
  ["LK", "Sri Lanka", "94"],
  ["SD", "Sudan", "249"],
  ["SR", "Suriname", "597"],
  ["SE", "Sweden", "46"],
  ["CH", "Switzerland", "41"],
  ["SY", "Syria", "963"],
  ["TW", "Taiwan", "886"],
  ["TJ", "Tajikistan", "992"],
  ["TZ", "Tanzania", "255"],
  ["TH", "Thailand", "66"],
  ["TL", "Timor-Leste", "670"],
  ["TG", "Togo", "228"],
  ["TK", "Tokelau", "690"],
  ["TO", "Tonga", "676"],
  ["TT", "Trinidad and Tobago", "1"],
  ["TN", "Tunisia", "216"],
  ["TR", "Turkey", "90"],
  ["TM", "Turkmenistan", "993"],
  ["TC", "Turks and Caicos Islands", "1"],
  ["TV", "Tuvalu", "688"],
  ["VI", "U.S. Virgin Islands", "1"],
  ["UG", "Uganda", "256"],
  ["UA", "Ukraine", "380"],
  ["AE", "United Arab Emirates", "971"],
  ["GB", "United Kingdom", "44"],
  ["US", "United States", "1"],
  ["UY", "Uruguay", "598"],
  ["UZ", "Uzbekistan", "998"],
  ["VU", "Vanuatu", "678"],
  ["VA", "Vatican City", "39"],
  ["VE", "Venezuela", "58"],
  ["VN", "Vietnam", "84"],
  ["WF", "Wallis and Futuna", "681"],
  ["EH", "Western Sahara", "212"],
  ["YE", "Yemen", "967"],
  ["ZM", "Zambia", "260"],
  ["ZW", "Zimbabwe", "263"],
  ["AX", "Åland Islands", "358"],
];

function lengthFor(iso: string, dial: string): readonly [number, number] | undefined {
  if (NATIONAL_LENGTH[iso]) return NATIONAL_LENGTH[iso];
  if (dial === "1") return [10, 10];
  return undefined;
}

function buildRegions(): CallingRegion[] {
  return SEEDS.map(([iso, name, dial]) => {
    const region: CallingRegion = { iso, name, dial };
    const nsn = lengthFor(iso, dial);
    const aliases = ALIASES[iso];
    if (nsn) region.nsn = nsn;
    if (aliases) region.aliases = aliases;
    return region;
  }).sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export const CALLING_REGIONS: readonly CallingRegion[] = buildRegions();

const BY_ISO = new Map(CALLING_REGIONS.map((region) => [region.iso, region]));

export function callingRegionByIso(iso: string): CallingRegion | undefined {
  return BY_ISO.get(iso.toUpperCase());
}

/**
 * Match a browser language tag (`zh-HK`, `en-US`) to a calling region.
 * When nothing matches, Hong Kong is the fallback.
 */
export function defaultCallingRegion(locales?: readonly string[]): CallingRegion {
  const tags = locales ?? (typeof navigator === "undefined" ? [] : navigator.languages);
  for (const tag of tags) {
    const parts = tag.split("-");
    const regionCode = parts.length > 1 ? parts[parts.length - 1] : "";
    if (!regionCode || regionCode.length !== 2) continue;
    const match = callingRegionByIso(regionCode);
    if (match) return match;
  }
  return callingRegionByIso("HK") ?? CALLING_REGIONS[0]!;
}

export function nationalBounds(region: CallingRegion): { min: number; max: number } {
  const cap = 15 - region.dial.length;
  const min = region.nsn?.[0] ?? 4;
  const max = Math.min(region.nsn?.[1] ?? cap, cap);
  return { min: Math.min(min, max), max };
}

export function flagEmoji(iso: string): string {
  if (!/^[A-Z]{2}$/.test(iso)) return "";
  return String.fromCodePoint(...[...iso].map((char) => 127397 + char.charCodeAt(0)));
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function searchCallingRegions(query: string): CallingRegion[] {
  const folded = fold(query.trim());
  if (!folded) return [...CALLING_REGIONS];
  const dialQuery = folded.replace(/^\+/, "").replace(/[\s()-]/g, "");
  const digits = /^\d+$/.test(dialQuery);
  const scored = CALLING_REGIONS.flatMap((region) => {
    const name = fold(region.name);
    const aliases = region.aliases?.map((alias) => fold(alias)) ?? [];
    let score = 0;
    if (digits && region.dial === dialQuery) score = 100;
    else if (region.iso.toLowerCase() === folded) score = 90;
    else if (aliases.some((alias) => alias === folded)) score = 85;
    else if (name.startsWith(folded) || aliases.some((alias) => alias.startsWith(folded))) score = 70;
    else if (digits && region.dial.startsWith(dialQuery)) score = 60;
    else if (name.includes(folded) || aliases.some((alias) => alias.includes(folded))) score = 50;
    else return [];
    return [{ region, score }];
  });
  scored.sort((a, b) => b.score - a.score || a.region.name.localeCompare(b.region.name, "en"));
  return scored.map((item) => item.region);
}

function separatedDial(raw: string, dial: string): boolean {
  const body = raw.trim().replace(/^\+/, "");
  return new RegExp(`^0*${dial}[\\s().-]`).test(body);
}

function lengthError(region: CallingRegion, min: number, max: number): string {
  if (min === max) return `${region.name} numbers are ${min} digits after +${region.dial}.`;
  return `${region.name} numbers need ${min} to ${max} digits after +${region.dial}.`;
}

/**
 * Join a selected calling code and the national number into E.164.
 * Accepts spaces and punctuation, a pasted `+code`, a leading `00`,
 * and a single trunk `0` (kept for Italy and Vatican City).
 */
export function toE164(region: CallingRegion, raw: string): E164Result {
  const { min, max } = nationalBounds(region);
  const trimmed = raw.trim();
  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return { ok: false, error: "Enter your phone number. The country code is separate." };
  }

  let sawCallingCode = hadPlus;
  if (digits.startsWith("00") && digits.slice(2).startsWith(region.dial)) {
    digits = digits.slice(2);
    sawCallingCode = true;
  }

  if (sawCallingCode || separatedDial(trimmed, region.dial)) {
    if (!digits.startsWith(region.dial)) {
      return {
        ok: false,
        error: `That number uses a different country code. Choose that country, or enter only the digits after +${region.dial}.`,
      };
    }
    digits = digits.slice(region.dial.length);
  } else if (digits.startsWith(region.dial) && digits.length > max) {
    digits = digits.slice(region.dial.length);
  }

  if (!KEEPS_TRUNK_ZERO.has(region.iso) && digits.startsWith("0")) {
    const rest = digits.replace(/^0+/, "");
    if (rest.length >= min && rest.length <= max) digits = rest;
  }

  if (digits.length < min || digits.length > max) {
    return { ok: false, error: lengthError(region, min, max) };
  }
  const total = region.dial.length + digits.length;
  if (total < 8 || total > 15) {
    return { ok: false, error: "Enter a phone number, at least 8 digits. It never appears on your profile." };
  }
  return { ok: true, e164: `+${region.dial}${digits}`, national: digits, region };
}

export function formatPhoneDisplay(region: CallingRegion, national: string): string {
  return `+${region.dial} ${groupNational(region, national)}`;
}

function groupNational(region: CallingRegion, national: string): string {
  if (region.dial === "1" && national.length === 10) {
    return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }
  if (national.length === 8 && (region.dial === "852" || region.dial === "853" || region.dial === "65")) {
    return `${national.slice(0, 4)} ${national.slice(4)}`;
  }
  const parts: string[] = [];
  for (let index = 0; index < national.length; index += 3) parts.push(national.slice(index, index + 3));
  return parts.join(" ");
}
