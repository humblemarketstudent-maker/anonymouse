/**
 * Ids and scripted lines planted by older on-device builds.
 * Nothing here is inserted into a new store. Load uses it only to drop
 * that stock from a browser that still has it, while leaving a person's
 * own profile, rooms, friends, and threads in place.
 */

export const RETIRED_USER_IDS: readonly string[] = [
  "usr_macro",
  "usr_yield",
  "usr_spread",
  "usr_basis",
  "usr_powder",
  "usr_term",
  "usr_token",
  "usr_flow",
  "usr_retail",
  "usr_qe",
  "usr_gamma",
  "usr_lbo",
  "usr_alpha",
  "usr_mint",
  "usr_warden",
  "usr_stable",
  "usr_left",
  "usr_vol",
  "usr_ink",
  "usr_grid",
  "usr_lane",
  "usr_moss",
  "usr_byte",
  "usr_nova",
  "usr_keel",
  "usr_folio",
  "usr_ward",
  "usr_civic",
  "usr_loom",
  "usr_harbor",
  "usr_pine",
  "usr_alloy",
  "usr_reel",
  "usr_oath",
  "usr_spark",
  "usr_kiln",
];

export const RETIRED_ROOM_IDS: readonly string[] = [
  "room_market",
  "room_deals",
  "room_rates",
  "room_after",
  "room_builders",
  "room_night",
  "room_city",
  "room_source",
  "room_charts",
  "room_climate",
  "room_founders",
  "room_library",
  "room_kitchen",
  "room_design",
  "room_quant",
  "room_crypto",
  "room_new",
  "room_policy",
  "room_music",
  "room_ai",
];

/**
 * Private lines older builds could plant at sign-in, and the canned blasts
 * those builds wrote into chats the person had never opened.
 */
export const RETIRED_SEAT_THREADS: {
  peerId: string;
  lines: { from: "peer" | "me"; body: string }[];
}[] = [
  {
    peerId: "usr_macro",
    lines: [
      { from: "peer", body: "You still short the front end, or did someone talk you out of it?" },
      { from: "me", body: "Still short. Smaller than I sound." },
      { from: "peer", body: "Respect. The loud version of that trade is the one that gets hurt." },
    ],
  },
  {
    peerId: "usr_folio",
    lines: [
      { from: "peer", body: "Read anything this week that wasn't a memo?" },
      { from: "me", body: "A novel where nobody wins cleanly. I recommend it and I won't say why." },
      { from: "peer", body: "That's the only kind I trust. Send the title if you feel like breaking anonymity with a book." },
    ],
  },
];

export const RETIRED_BLAST_LINES = [
  "Sending this before a meeting rewrites it.",
  "You should see this before your group chat does.",
  "Not advice. Also not nothing.",
  "Hot enough to forward. Not hot enough for the room.",
];
