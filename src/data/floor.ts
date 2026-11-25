import type { NewsLink } from "@/backend/types";

export interface SeedUser {
  id: string;
  alias: string;
  bioQuote: string;
  hashtags: string[];
}

export interface SeedRoom {
  id: string;
  name: string;
  blurb: string;
  hashtags: string[];
  listeners: number;
  createdBy: string;
}

export const MOCK_USERS: SeedUser[] = [
  { id: "usr_macro", alias: "MacroMouse", bioQuote: "Long volatility, short sleep", hashtags: ["markets", "macro", "nyc"] },
  { id: "usr_yield", alias: "YieldHunter", bioQuote: "Coupons over stories", hashtags: ["rates", "wealth", "london"] },
  { id: "usr_spread", alias: "SpreadSurgeon", bioQuote: "The model is a suggestion. The fee is not.", hashtags: ["deals", "markets", "nyc"] },
  { id: "usr_basis", alias: "BasisBandit", bioQuote: "If it's arb, it's already gone", hashtags: ["quant", "markets", "data"] },
  { id: "usr_powder", alias: "DryPowder", bioQuote: "Multiple expansion is a fairy tale", hashtags: ["deals", "founder", "nyc"] },
  { id: "usr_term", alias: "TermSheet", bioQuote: "We pass, but keep us posted", hashtags: ["venture", "startup", "sf"] },
  { id: "usr_token", alias: "TokenTreasurer", bioQuote: "On-chain or it didn't clear", hashtags: ["crypto", "engineering", "night-owl"] },
  { id: "usr_flow", alias: "FlowDesk", bioQuote: "Payments are a commodity. Float isn't.", hashtags: ["fintech", "product", "remote"] },
  { id: "usr_retail", alias: "RetailRadar", bioQuote: "Buying the dip with rent money, unfortunately", hashtags: ["markets", "student", "memes"] },
  { id: "usr_qe", alias: "QualityOfEarn", bioQuote: "Adjustments are where the truth hides", hashtags: ["deals", "data", "chicago"] },
  { id: "usr_gamma", alias: "GammaGarden", bioQuote: "Short gamma, long coffee", hashtags: ["quant", "markets", "coffee"] },
  { id: "usr_lbo", alias: "LBOLunch", bioQuote: "Debt is a feature", hashtags: ["deals", "nyc", "cooking"] },
  { id: "usr_alpha", alias: "AlphaWidow", bioQuote: "The factor is crowded. I'm still in it.", hashtags: ["markets", "macro", "london"] },
  { id: "usr_mint", alias: "MintedLP", bioQuote: "Reserve the follow, skip the party", hashtags: ["venture", "startup", "sf"] },
  { id: "usr_warden", alias: "WealthWarden", bioQuote: "Clients want 8% and no red days", hashtags: ["wealth", "rates", "quiet"] },
  { id: "usr_stable", alias: "StableSally", bioQuote: "If the peg sneezes, I leave", hashtags: ["crypto", "night-owl", "remote"] },
  { id: "usr_left", alias: "LeftLead", bioQuote: "Left lead, right regrets", hashtags: ["deals", "nyc", "writing"] },
  { id: "usr_vol", alias: "VolSmile", bioQuote: "The skew is telling on you", hashtags: ["quant", "markets", "night-owl"] },
  { id: "usr_ink", alias: "InkMargin", bioQuote: "I edit the sentence until it tells the truth", hashtags: ["writing", "journalism", "books"] },
  { id: "usr_grid", alias: "GridMouse", bioQuote: "Cities are just schedules with better lighting", hashtags: ["design", "nyc", "architecture"] },
  { id: "usr_lane", alias: "LaneChange", bioQuote: "I run before the day can run me", hashtags: ["running", "health", "london"] },
  { id: "usr_moss", alias: "MossIndex", bioQuote: "Plant the slow thing. Check it in ten years.", hashtags: ["climate", "energy", "remote"] },
  { id: "usr_byte", alias: "ByteBaker", bioQuote: "Ship the patch, then the pastry", hashtags: ["engineering", "cooking", "open-source"] },
  { id: "usr_nova", alias: "NovaChart", bioQuote: "A good chart ends an argument", hashtags: ["data", "product", "remote"] },
  { id: "usr_keel", alias: "KeelSong", bioQuote: "Three chords and a quiet room", hashtags: ["music", "night-owl", "berlin"] },
  { id: "usr_folio", alias: "FolioFox", bioQuote: "I reread the paragraph that made me stay", hashtags: ["books", "writing", "film"] },
  { id: "usr_ward", alias: "WardNote", bioQuote: "Night shift teaches you who actually calls back", hashtags: ["healthcare", "medicine", "night-owl"] },
  { id: "usr_civic", alias: "CivicMouse", bioQuote: "Policy is a group chat with worse fonts", hashtags: ["policy", "journalism", "dc"] },
  { id: "usr_loom", alias: "LoomLight", bioQuote: "I design the empty space and call it the product", hashtags: ["design", "product", "tokyo"] },
  { id: "usr_harbor", alias: "HarborKid", bioQuote: "New city, same morning, fewer people who know the alias", hashtags: ["student", "travel", "singapore"] },
  { id: "usr_pine", alias: "PineSignal", bioQuote: "The forest doesn't have a ticker and I like that", hashtags: ["climate", "running", "remote"] },
  { id: "usr_alloy", alias: "AlloyHours", bioQuote: "Hardware is software that can hurt you", hashtags: ["engineering", "startup", "austin"] },
  { id: "usr_reel", alias: "ReelQuiet", bioQuote: "I watch the cut with the sound off first", hashtags: ["film", "music", "la"] },
  { id: "usr_oath", alias: "OathDraft", bioQuote: "The clause is the plot", hashtags: ["law", "writing", "nyc"] },
  { id: "usr_spark", alias: "SparkShift", bioQuote: "Teaching is just debugging a room", hashtags: ["teaching", "ai", "remote"] },
  { id: "usr_kiln", alias: "KilnMouse", bioQuote: "Clay doesn't care about your roadmap", hashtags: ["design", "craft", "lisbon"] },
];

export const SEEDED_FRIENDS = ["usr_macro", "usr_folio", "usr_byte", "usr_lane"];
export const SEEDED_ROOMS = ["room_market", "room_library", "room_night"];
export const SEEDED_INCOMING = "usr_keel";

export const SEED_ROOMS: SeedRoom[] = [
  { id: "room_market", name: "Market Open", blurb: "The auction, the open, and whatever just printed.", hashtags: ["markets", "macro", "trading"], listeners: 186, createdBy: "usr_macro" },
  { id: "room_deals", name: "Deal Flow", blurb: "Live processes, quiet passes, and books that might cover.", hashtags: ["deals", "venture", "finance"], listeners: 94, createdBy: "usr_spread" },
  { id: "room_rates", name: "Quiet Rates", blurb: "Curves, cuts, and the parts of the tape that don't trend.", hashtags: ["rates", "macro", "wealth"], listeners: 77, createdBy: "usr_yield" },
  { id: "room_after", name: "After Hours", blurb: "Prints and the moves after everyone claims they logged off.", hashtags: ["markets", "night-owl", "trading"], listeners: 63, createdBy: "usr_vol" },
  { id: "room_builders", name: "Builders", blurb: "Shipping notes from people who would rather demo than pitch.", hashtags: ["startup", "engineering", "product"], listeners: 128, createdBy: "usr_alloy" },
  { id: "room_night", name: "Night Desk", blurb: "For the hours when the group chat is honest.", hashtags: ["night-owl", "writing", "remote"], listeners: 84, createdBy: "usr_keel" },
  { id: "room_city", name: "City Mice", blurb: "Neighborhoods, commutes, and which city still lets you think.", hashtags: ["nyc", "london", "travel"], listeners: 71, createdBy: "usr_grid" },
  { id: "room_source", name: "Open Source", blurb: "Patches, maintainers, and the issue that will not die.", hashtags: ["open-source", "engineering", "builder"], listeners: 58, createdBy: "usr_byte" },
  { id: "room_charts", name: "Care and Charts", blurb: "Data with a bedside manner. No patient stories, no names.", hashtags: ["healthcare", "data", "research"], listeners: 46, createdBy: "usr_ward" },
  { id: "room_climate", name: "Slow Green", blurb: "Climate, energy, and the timelines that don't fit a quarter.", hashtags: ["climate", "energy", "policy"], listeners: 69, createdBy: "usr_moss" },
  { id: "room_founders", name: "Founder Notes", blurb: "What you'd tell a friend before you'd tell an investor.", hashtags: ["founder", "startup", "venture"], listeners: 112, createdBy: "usr_term" },
  { id: "room_library", name: "The Library", blurb: "Books, films, and the line you underlined twice.", hashtags: ["books", "writing", "film"], listeners: 53, createdBy: "usr_folio" },
  { id: "room_kitchen", name: "Kitchen Shift", blurb: "What you're cooking when the rest of the day was loud.", hashtags: ["cooking", "night-owl", "craft"], listeners: 41, createdBy: "usr_byte" },
  { id: "room_design", name: "Design Crit", blurb: "Type, space, and the screen you wish you could unship.", hashtags: ["design", "product", "nyc"], listeners: 88, createdBy: "usr_loom" },
  { id: "room_quant", name: "Quant Corner", blurb: "Models, mistakes, and the backtest that lied politely.", hashtags: ["quant", "data", "markets"], listeners: 74, createdBy: "usr_basis" },
  { id: "room_crypto", name: "Crypto Floor", blurb: "On-chain, off-narrative. Leave the price targets outside.", hashtags: ["crypto", "engineering", "night-owl"], listeners: 101, createdBy: "usr_token" },
  { id: "room_new", name: "New In Town", blurb: "First months, new cities, and the alias you answer to now.", hashtags: ["student", "travel", "remote"], listeners: 57, createdBy: "usr_harbor" },
  { id: "room_policy", name: "Policy Mice", blurb: "Rules, hearings, and the footnote that moved the outcome.", hashtags: ["policy", "journalism", "law"], listeners: 49, createdBy: "usr_civic" },
  { id: "room_music", name: "Low Volume", blurb: "Records, rooms, and the song you won't put in a bio.", hashtags: ["music", "film", "night-owl"], listeners: 66, createdBy: "usr_reel" },
  { id: "room_ai", name: "Model Room", blurb: "Tools, teaching, and what the model still gets confidently wrong.", hashtags: ["ai", "teaching", "engineering"], listeners: 143, createdBy: "usr_spark" },
];

export const NEWS_ITEMS: NewsLink[] = [
  {
    url: "https://www.reuters.com/markets/us/fed-officials-signal-patience-core-inflation",
    source: "Reuters",
    title: "Fed officials signal patience as core inflation stalls",
    summary: "Several voters pushed a March cut off the table without closing the door on summer.",
  },
  {
    url: "https://www.bloomberg.com/news/articles/mega-cap-buybacks-slow-rate-path",
    source: "Bloomberg",
    title: "Mega-cap buybacks slow as boards wait on the rate path",
    summary: "Authorizations are still large. The actual prints are getting pickier.",
  },
  {
    url: "https://www.ft.com/content/european-banks-lbo-syndication-thins",
    source: "Financial Times",
    title: "European banks pitch a bumper LBO into a thinner book",
    summary: "The staple looks familiar. The buyer list does not.",
  },
  {
    url: "https://www.wsj.com/finance/private-credit-spreads-sponsor-deals",
    source: "WSJ",
    title: "Private credit funds raise spreads on sponsor deals",
    summary: "The bid is still there. It is no longer priced like 2021.",
  },
  {
    url: "https://www.theinformation.com/articles/secondary-clears-quieter-valuation",
    source: "The Information",
    title: "A marquee secondary clears at a quieter valuation",
    summary: "Existing holders sold. The new mark is the story, not the round.",
  },
  {
    url: "https://www.cnbc.com/2026/11/23/crude-jumps-as-tanker-traffic-slows.html",
    source: "CNBC",
    title: "Crude jumps as tanker traffic slows through a key lane",
    summary: "A one-day scare, unless someone was already short energy gamma.",
  },
];

export interface SeedChatter {
  alias: string;
  minutesAgo: number;
  body: string;
  roomId: string;
  newsIndex?: number;
}

export const SEED_CHATTERS: SeedChatter[] = [
  { alias: "BasisBandit", minutesAgo: 4, roomId: "room_market", body: "Auction feels heavy. Real money is selling the open, not buying the story." },
  { alias: "VolSmile", minutesAgo: 12, roomId: "room_market", body: "Implied is asleep. Realized will not be." },
  { alias: "MacroMouse", minutesAgo: 35, roomId: "room_market", body: "The dollar is the tell. Everything else is narrating it.", newsIndex: 0 },
  { alias: "SpreadSurgeon", minutesAgo: 8, roomId: "room_deals", body: "The book is covered the way a winter coat is covered: technically." },
  { alias: "DryPowder", minutesAgo: 2000, roomId: "room_deals", body: "We're through the memo. The memo is optimistic. The data room is the product." },
  { alias: "YieldHunter", minutesAgo: 21, roomId: "room_rates", body: "Someone asked for uncorrelated yield again. I sent bills and a glass of water.", newsIndex: 1 },
  { alias: "WealthWarden", minutesAgo: 40, roomId: "room_rates", body: "Nobody wants the long bond until the day they all want it." },
  { alias: "AlphaWidow", minutesAgo: 18, roomId: "room_after", body: "Print beat, price faded. That's the only tell I needed." },
  { alias: "RetailRadar", minutesAgo: 55, roomId: "room_after", body: "Everyone is a long-term thinker until the after-hours candle." },
  { alias: "AlloyHours", minutesAgo: 9, roomId: "room_builders", body: "Shipped the ugly version. The pretty one was a meeting." },
  { alias: "FlowDesk", minutesAgo: 26, roomId: "room_builders", body: "The take rate is the hero slide. The failure cost is an appendix." },
  { alias: "KeelSong", minutesAgo: 1800, roomId: "room_night", body: "If you're here, the honest version of the day is still available." },
  { alias: "InkMargin", minutesAgo: 2200, roomId: "room_night", body: "Cut the first sentence. It was warming up. The second one is the note." },
  { alias: "GridMouse", minutesAgo: 14, roomId: "room_city", body: "The good block is the one that doesn't ask you to perform your job." },
  { alias: "HarborKid", minutesAgo: 48, roomId: "room_city", body: "Three weeks in and I still pick the cafe by how quiet the wifi is." },
  { alias: "ByteBaker", minutesAgo: 11, roomId: "room_source", body: "The issue is older than the intern who just offered to fix it. Let them." },
  { alias: "SparkShift", minutesAgo: 40, roomId: "room_source", body: "Documentation is a kind of hospitality. Most repos skip it." },
  { alias: "WardNote", minutesAgo: 17, roomId: "room_charts", body: "A chart that needs a paragraph is a chart that isn't done." },
  { alias: "NovaChart", minutesAgo: 46, roomId: "room_charts", body: "We argued for an hour. The histogram ended it in a glance." },
  { alias: "MossIndex", minutesAgo: 13, roomId: "room_climate", body: "The timeline that matters doesn't fit in a quarter, so people pretend it isn't real." },
  { alias: "PineSignal", minutesAgo: 50, roomId: "room_climate", body: "I went outside instead of refreshing. The forecast was worse. The walk was better." },
  { alias: "TermSheet", minutesAgo: 15, roomId: "room_founders", body: "Founder wants last cycle's multiple on this cycle's growth. We wished them a very nice process." },
  { alias: "MintedLP", minutesAgo: 42, roomId: "room_founders", body: "We're tracking closely, which is how this room says no." },
  { alias: "FolioFox", minutesAgo: 1900, roomId: "room_library", body: "The paragraph I underlined isn't the famous one. That's usually the sign." },
  { alias: "ReelQuiet", minutesAgo: 2500, roomId: "room_library", body: "Watched it silent. The cut still worked. The dialogue was doing too much." },
  { alias: "LBOLunch", minutesAgo: 2000, roomId: "room_kitchen", body: "Onions, late, and no opinions. This is the best meeting of the day." },
  { alias: "ByteBaker", minutesAgo: 2600, roomId: "room_kitchen", body: "The tart is the only deploy I trust on a Friday." },
  { alias: "LoomLight", minutesAgo: 8, roomId: "room_design", body: "If the empty space is nervous, the type is too loud. Pull both back." },
  { alias: "KilnMouse", minutesAgo: 29, roomId: "room_design", body: "Made a cup badly on purpose. The screen I shipped this morning was worse." },
  { alias: "GammaGarden", minutesAgo: 12, roomId: "room_quant", body: "Short gamma into a number is a personality. I'm flat, which is how I stay here." },
  { alias: "BasisBandit", minutesAgo: 44, roomId: "room_quant", body: "If you can explain the edge in one sentence, it is probably gone." },
  { alias: "TokenTreasurer", minutesAgo: 9, roomId: "room_crypto", body: "Funding flipped. Every tourist in the book is about to learn what a basis is." },
  { alias: "StableSally", minutesAgo: 27, roomId: "room_crypto", body: "If the peg sneezes I am already gone. The yield is not worth the group chat." },
  { alias: "HarborKid", minutesAgo: 16, roomId: "room_new", body: "Does anyone know a quiet room that isn't a coworking ad?" },
  { alias: "LaneChange", minutesAgo: 39, roomId: "room_new", body: "Run the new city before you judge it. Maps lie. Hills don't." },
  { alias: "CivicMouse", minutesAgo: 1700, roomId: "room_policy", body: "The footnote moved more money than the press release. Read the footnote." },
  { alias: "OathDraft", minutesAgo: 2300, roomId: "room_policy", body: "The clause everyone skipped is the one that will matter in June." },
  { alias: "KeelSong", minutesAgo: 1600, roomId: "room_music", body: "Played it twice. The second time I stopped checking who else was in the room." },
  { alias: "ReelQuiet", minutesAgo: 2100, roomId: "room_music", body: "The bridge is the only honest part. Everything before it is introduction." },
  { alias: "SparkShift", minutesAgo: 6, roomId: "room_ai", body: "The model was confident and wrong in a way a junior would be embarrassed by." },
  { alias: "NovaChart", minutesAgo: 22, roomId: "room_ai", body: "Useful as a draft. Dangerous as a witness. I keep it in the first role." },
];

/** Extra recent lines so the room list shows more than one heat level. */
export const HEAT_FILL: { roomId: string; bodies: string[] }[] = [
  {
    roomId: "room_market",
    bodies: [
      "The second print didn't change the read.",
      "Breadth is still the quiet part of the open.",
      "I'm flat the names everyone is narrating.",
      "Realized is awake. Implied is late.",
      "That's the fifth check. Same tape.",
    ],
  },
  {
    roomId: "room_ai",
    bodies: [
      "Asked for the counterargument. Got a compliment.",
      "The draft is useful. The citation is not.",
      "I kept the paragraph and deleted the confidence.",
    ],
  },
  {
    roomId: "room_builders",
    bodies: ["Shipped the smaller one. The meeting can have the rest."],
  },
];

export interface LiveLine {
  roomId: string;
  body: string;
  newsIndex?: number;
}

export const LIVE_ROOMS: LiveLine[] = [
  { roomId: "room_market", body: "Opening drive is fading. Don't confuse a squeeze with sponsorship." },
  { roomId: "room_market", body: "Breadth is worse than the headline. The headline is four names and a story." },
  { roomId: "room_deals", body: "The presentation ran long, which is how you hide a soft quarter." },
  { roomId: "room_builders", body: "Deleted a slide. The demo got shorter and somehow truer." },
  { roomId: "room_night", body: "The version of this you'd say at noon is worse. Say this one." },
  { roomId: "room_library", body: "Finished the chapter. It did not resolve, which is why I'll trust it." },
  { roomId: "room_design", body: "The button is begging. Buttons shouldn't beg." },
  { roomId: "room_crypto", body: "On-chain volume is loud. The bid under it is not.", newsIndex: 5 },
  { roomId: "room_climate", body: "Another roadmap measured in press hits. The electrons did not get the memo." },
  { roomId: "room_ai", body: "I asked it to disagree with me. It apologized and then agreed harder." },
  { roomId: "room_city", body: "Rain, and suddenly the block is a room. I like it better." },
  { roomId: "room_music", body: "Left it on repeat. Not because it's perfect. Because the room got quiet." },
  { roomId: "room_quant", body: "The backtest is polite in a way live fills are not." },
  { roomId: "room_founders", body: "A no, said early, is kinder than a maybe that eats a month." },
  { roomId: "room_kitchen", body: "Salt later than you think. Same rule as opinions." },
  { roomId: "room_policy", body: "The hearing is theater. The staff memo is the plot." },
];

export const REPLIES = [
  "Same read. I'm just not sized for it.",
  "Disagree, and I don't need you to come with me.",
  "Say the plain version.",
  "That's a tomorrow problem. Today I'm quiet.",
  "If it's in the model, it isn't in the price.",
  "Noted. I'm not adding.",
  "You're early. Early is expensive.",
  "I can live with that.",
  "The only clean version is smaller.",
  "Say it again after you've slept. I'll still be here.",
];

export const QUESTION_REPLIES = [
  "Depends which room you're in. Mine says not yet.",
  "Yes, and I don't love that I agree.",
  "No. I looked twice.",
  "Only if you can leave. I can't, so I'm not.",
  "Ask me after dark. The answer changes.",
];

export const BLAST_LINES = [
  "Sending this before a meeting rewrites it.",
  "You should see this before your group chat does.",
  "Not advice. Also not nothing.",
  "Hot enough to forward. Not hot enough for the room.",
];

export const MATCH_GREETINGS = [
  "You tapped. I'm here.",
  "Alright. Say it plain.",
  "Accepted. Keep it between aliases.",
  "Fine. What's the actual question?",
  "I'm in. Don't send a pitch.",
];

export const SEAT_THREADS: {
  peerId: string;
  unread: number;
  lines: { from: "peer" | "me"; minutesAgo: number; body: string; newsIndex?: number; blast?: boolean }[];
}[] = [
  {
    peerId: "usr_macro",
    unread: 1,
    lines: [
      { from: "peer", minutesAgo: 140, body: "You still short the front end, or did someone talk you out of it?" },
      { from: "me", minutesAgo: 100, body: "Still short. Smaller than I sound." },
      { from: "peer", minutesAgo: 8, body: "Respect. The loud version of that trade is the one that gets hurt." },
    ],
  },
  {
    peerId: "usr_folio",
    unread: 1,
    lines: [
      { from: "peer", minutesAgo: 80, body: "Read anything this week that wasn't a memo?" },
      { from: "me", minutesAgo: 50, body: "A novel where nobody wins cleanly. I recommend it and I won't say why." },
      { from: "peer", minutesAgo: 12, body: "That's the only kind I trust. Send the title if you feel like breaking anonymity with a book." },
    ],
  },
];
