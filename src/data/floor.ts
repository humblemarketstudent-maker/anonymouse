import type { NewsLink, PublicUser, Sector } from "@/backend/types";

export interface RoomDef {
  id: string;
  name: string;
  blurb: string;
  listeners: number;
}

export const ROOMS: RoomDef[] = [
  {
    id: "room_market",
    name: "Market-Open",
    blurb: "The auction, the open, and whatever just printed.",
    listeners: 186,
  },
  {
    id: "room_deals",
    name: "Deal-Flow",
    blurb: "Live processes, quiet passes, and books that might actually cover.",
    listeners: 94,
  },
  {
    id: "room_ma",
    name: "M&A-Rumors",
    blurb: "Whispers only. Nothing in here is a filing.",
    listeners: 141,
  },
  {
    id: "room_rates",
    name: "Rates-Desk",
    blurb: "Curves, cuts, and the parts of the tape that don't trend.",
    listeners: 77,
  },
  {
    id: "room_after",
    name: "After-Hours",
    blurb: "Prints, guides, and the moves after the cash session.",
    listeners: 63,
  },
];

export function roomById(id: string): RoomDef | undefined {
  return ROOMS.find((room) => room.id === id);
}

type SeedUser = Omit<PublicUser, "joinedAt">;

export const MOCK_USERS: SeedUser[] = [
  { id: "usr_macro", alias: "MacroMouse", sector: "Hedge Fund", bioQuote: "Long volatility, short sleep" },
  { id: "usr_yield", alias: "YieldHunter", sector: "Wealth Management", bioQuote: "Coupons over stories" },
  { id: "usr_spread", alias: "SpreadSurgeon", sector: "Investment Banking", bioQuote: "The model is a suggestion. The fee is not." },
  { id: "usr_basis", alias: "BasisBandit", sector: "Quant/Trading", bioQuote: "If it's arb, it's already gone" },
  { id: "usr_powder", alias: "DryPowder", sector: "Private Equity", bioQuote: "Multiple expansion is a fairy tale" },
  { id: "usr_term", alias: "TermSheet", sector: "Venture Capital", bioQuote: "We pass, but keep us posted" },
  { id: "usr_token", alias: "TokenTreasurer", sector: "Crypto/DeFi", bioQuote: "On-chain or it didn't clear" },
  { id: "usr_flow", alias: "FlowDesk", sector: "FinTech", bioQuote: "Payments are a commodity. Float isn't." },
  { id: "usr_retail", alias: "RetailRadar", sector: "Retail/Other", bioQuote: "Buying the dip with rent money, unfortunately" },
  { id: "usr_qe", alias: "QualityOfEarn", sector: "Investment Banking", bioQuote: "Adjustments are where the truth hides" },
  { id: "usr_gamma", alias: "GammaGarden", sector: "Quant/Trading", bioQuote: "Short gamma, long coffee" },
  { id: "usr_lbo", alias: "LBOLunch", sector: "Private Equity", bioQuote: "Debt is a feature" },
  { id: "usr_alpha", alias: "AlphaWidow", sector: "Hedge Fund", bioQuote: "The factor is crowded. I'm still in it." },
  { id: "usr_mint", alias: "MintedLP", sector: "Venture Capital", bioQuote: "Reserve the follow, skip the party" },
  { id: "usr_warden", alias: "WealthWarden", sector: "Wealth Management", bioQuote: "Clients want 8% and no red days" },
  { id: "usr_stable", alias: "StableSally", sector: "Crypto/DeFi", bioQuote: "If the peg sneezes, I leave" },
  { id: "usr_left", alias: "LeftLead", sector: "Investment Banking", bioQuote: "Left lead, right regrets" },
  { id: "usr_vol", alias: "VolSmile", sector: "Quant/Trading", bioQuote: "The skew is telling on you" },
];

export const SEEDED_FRIENDS = ["usr_macro", "usr_term", "usr_powder", "usr_yield", "usr_basis"];

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
    summary: "A one-day scare, unless the desk is already short gamma in energy.",
  },
];

export interface SeedChatter {
  alias: string;
  minutesAgo: number;
  body: string;
  roomId?: string;
  newsIndex?: number;
}

export const SEED_CHATTERS: SeedChatter[] = [
  {
    alias: "MacroMouse",
    minutesAgo: 6,
    body: "The curve is pricing a cut the Fed has not agreed to. I'm short the front end, and annoyed about how large that sounds out loud.",
    newsIndex: 0,
  },
  {
    alias: "SpreadSurgeon",
    minutesAgo: 18,
    body: "Book is 'covered' the way a winter coat is covered: technically, and nobody is warm. Still in the market on the BB tranche.",
  },
  {
    alias: "DryPowder",
    minutesAgo: 27,
    body: "If the LBO only works with 75 bps of cuts and a 7.5x exit, it doesn't work. Send a different deck.",
  },
  {
    alias: "TermSheet",
    minutesAgo: 41,
    body: "Founder wants a 2021 multiple on a 2024 growth rate. We wished them a very nice process.",
  },
  {
    alias: "BasisBandit",
    minutesAgo: 55,
    body: "Listed versus OTC vol is wide enough to drive a compliance team through. It will not be there at the close.",
  },
  {
    alias: "YieldHunter",
    minutesAgo: 74,
    body: "Client asked for uncorrelated yield again. I sent T-bills and a glass of water.",
    newsIndex: 1,
  },
  {
    alias: "TokenTreasurer",
    minutesAgo: 96,
    body: "Funding just flipped. Every macro tourist in the book is about to discover what a basis is.",
  },
  {
    alias: "FlowDesk",
    minutesAgo: 120,
    body: "Payments are a commodity. The float on the settlement account is the actual company. Models keep missing it.",
  },
  {
    alias: "RetailRadar",
    minutesAgo: 150,
    body: "Someone in my group chat is buying 0DTE calls with the car payment. I said nothing. I am not their advisor.",
  },
  {
    alias: "GammaGarden",
    minutesAgo: 190,
    body: "Short gamma into CPI is a personality trait. I'm flat, which is how I stay employed.",
  },
  {
    alias: "LBOLunch",
    minutesAgo: 230,
    body: "Addbacks include a 'non-recurring' restructuring for the fourth year. Non-recurring is doing a lot of work.",
    newsIndex: 2,
  },
  {
    alias: "AlphaWidow",
    minutesAgo: 280,
    body: "The factor is crowded and I'm still in it. Crowded is not the same as wrong. It is the same as violent.",
  },
  {
    alias: "WealthWarden",
    minutesAgo: 340,
    body: "A family office wants private credit for the yield, and also no defaults. I am smiling in a professional way.",
    newsIndex: 3,
  },
  {
    alias: "StableSally",
    minutesAgo: 390,
    body: "If the peg sneezes I am already gone. The yield is not worth the group chat.",
  },
  {
    alias: "LeftLead",
    minutesAgo: 450,
    body: "Left lead on a name the sponsor has already walked through three other banks. Prestige is not a fee.",
  },
  {
    alias: "MintedLP",
    minutesAgo: 520,
    body: "We will 'track closely,' which means no, and also send the next one.",
  },
  {
    alias: "QualityOfEarn",
    minutesAgo: 600,
    body: "QoE came back. The working-capital peg is the whole argument. Everything else is theater.",
  },
  {
    alias: "VolSmile",
    minutesAgo: 680,
    body: "Skew is bid for puts and nobody wants to say the quiet word out loud. The surface already did.",
  },
  { alias: "BasisBandit", minutesAgo: 4, roomId: "room_market", body: "Auction feels heavy. Real money is selling the open, not buying the story." },
  { alias: "VolSmile", minutesAgo: 12, roomId: "room_market", body: "SPX implied is asleep. Realized will not be." },
  { alias: "AlphaWidow", minutesAgo: 22, roomId: "room_market", body: "I'm not adding. The first hour is a trap with good lighting." },
  { alias: "MacroMouse", minutesAgo: 35, roomId: "room_market", body: "The dollar is the tell. Equities are just narrating it." },
  { alias: "RetailRadar", minutesAgo: 48, roomId: "room_market", body: "My timeline is all green-day jokes. That's usually when I get cautious." },
  { alias: "GammaGarden", minutesAgo: 70, roomId: "room_market", body: "Dealers are long gamma above spot. The pin is doing what pins do." },
  { alias: "SpreadSurgeon", minutesAgo: 8, roomId: "room_deals", body: "Sponsor wants a staple on a business that hasn't had a clean quarter since the cheap-money era." },
  { alias: "QualityOfEarn", minutesAgo: 19, roomId: "room_deals", body: "Management addback number six is consulting paid to the founder's other company." },
  { alias: "DryPowder", minutesAgo: 33, roomId: "room_deals", body: "We're through the CIM. The CIM is optimistic. The data room is the product." },
  { alias: "TermSheet", minutesAgo: 50, roomId: "room_deals", body: "This growth round is a down round with better lighting and a new board observer." },
  { alias: "LeftLead", minutesAgo: 80, roomId: "room_deals", body: "If you're not in the first turn, you're the financing plan's plan B." },
  { alias: "LBOLunch", minutesAgo: 110, roomId: "room_deals", body: "Debt terms came in wider than the teaser. The teaser has left the chat." },
  { alias: "LeftLead", minutesAgo: 9, roomId: "room_ma", body: "Two strategics and one sponsor still in the industrial. One strategic is just there to read the deck." },
  { alias: "DryPowder", minutesAgo: 16, roomId: "room_ma", body: "Take-private chatter on a software name that already trades like the deal is done. It isn't." },
  {
    alias: "SpreadSurgeon",
    minutesAgo: 28,
    roomId: "room_ma",
    body: "The leak was too clean. Either the banker wanted it out, or the buyer is trying to shake the price.",
    newsIndex: 4,
  },
  { alias: "QualityOfEarn", minutesAgo: 44, roomId: "room_ma", body: "A merger of equals where one CEO keeps the job is not a merger of equals." },
  { alias: "MintedLP", minutesAgo: 90, roomId: "room_ma", body: "A big-tech 'partnership' that looks a lot like a call option on the whole company." },
  { alias: "LBOLunch", minutesAgo: 130, roomId: "room_ma", body: "Antitrust counsel is in the room. That's either theater or the end of the process." },
  { alias: "MacroMouse", minutesAgo: 7, roomId: "room_rates", body: "The front end is pricing a cut the dots will not sign. I've been wrong before. Not this week." },
  { alias: "YieldHunter", minutesAgo: 21, roomId: "room_rates", body: "Extending duration for clients who asked for it, then flinched at a 10 bp backup." },
  { alias: "WealthWarden", minutesAgo: 40, roomId: "room_rates", body: "Nobody wants the long bond until the day they all want it. We own a little and we don't talk about it." },
  { alias: "VolSmile", minutesAgo: 60, roomId: "room_rates", body: "The move in real yields is the whole cross-asset story. The rest is commentary." },
  { alias: "BasisBandit", minutesAgo: 95, roomId: "room_rates", body: "Swap spreads are doing something ugly and quiet. Not a trade for people who need to explain it." },
  { alias: "GammaGarden", minutesAgo: 140, roomId: "room_rates", body: "If CPI is hot, this room gets very honest very fast." },
  { alias: "FlowDesk", minutesAgo: 11, roomId: "room_after", body: "Guide was fine. The call was not. The CFO discovered a new way to say visibility." },
  { alias: "TokenTreasurer", minutesAgo: 24, roomId: "room_after", body: "After hours in the miners is not a market. It's a mood." },
  { alias: "AlphaWidow", minutesAgo: 38, roomId: "room_after", body: "Print beat, stock faded. That's the only tell I needed." },
  { alias: "StableSally", minutesAgo: 55, roomId: "room_after", body: "The Asia open will decide if this was a print or a problem." },
  { alias: "RetailRadar", minutesAgo: 75, roomId: "room_after", body: "Everyone is a long-term investor until the after-hours candle." },
  { alias: "MintedLP", minutesAgo: 100, roomId: "room_after", body: "The secondary cleared. Quieter price than the last round. The last round was the product.", newsIndex: 4 },
];

export interface LiveTake {
  body: string;
  sector?: Sector;
  newsIndex?: number;
  roomId?: string;
}

export const LIVE_FEED: LiveTake[] = [
  { body: "Real money just lifted the offer and then pretended it was a probe. It was not a probe.", sector: "Hedge Fund" },
  { body: "The syndicate email says 'quality book' again. I have read that sentence through worse books.", sector: "Investment Banking" },
  { body: "Passing on the industrial. The moat is a slide, and the customer concentration is a footnote.", sector: "Private Equity" },
  { body: "Partner meeting in an hour. My note is three lines. The deck is forty. We will discuss the deck.", sector: "Venture Capital" },
  { body: "The basis closed half the gap while I was getting coffee. Of course it did.", sector: "Quant/Trading" },
  { body: "Moved a hesitant client into bills. They thanked me like I had done something clever.", sector: "Wealth Management" },
  { body: "Another payments deck where the take rate is the hero and the fraud cost is an appendix.", sector: "FinTech" },
  { body: "On-chain volume is loud. The actual bid under it is not.", sector: "Crypto/DeFi", newsIndex: 5 },
  { body: "Group chat wants to know if this is 'the bottom.' I sent a shrugging emoji and closed the app.", sector: "Retail/Other" },
  { body: "I'm not short the print. I'm short the people who are certain about the print.", sector: "Hedge Fund" },
  { body: "Fee talk started before the model was done. That is the most honest part of the process.", sector: "Investment Banking" },
  { body: "Hold period in the memo says five years. The associates know it is seven if the exit window sulks.", sector: "Private Equity", newsIndex: 2 },
  { body: "Reserve the follow. The seed was the easy part and they are already spending it like a Series B.", sector: "Venture Capital" },
  { body: "If you can explain the edge in one sentence, it is probably gone.", sector: "Quant/Trading" },
  { body: "Private credit 'for ballast' is this quarter's phrase. Ballast sinks when you overfill it.", sector: "Wealth Management", newsIndex: 3 },
  { body: "The peg is fine until the group chat decides it isn't. I am not waiting for the group chat.", sector: "Crypto/DeFi" },
];

export const LIVE_ROOMS: LiveTake[] = [
  { roomId: "room_market", body: "Opening drive is fading. Don't confuse a squeeze with sponsorship.", sector: "Quant/Trading" },
  { roomId: "room_market", body: "Breadth is worse than the index. The index is four stocks and a story.", sector: "Hedge Fund" },
  { roomId: "room_deals", body: "Management presentation ran long, which is how you hide a soft quarter.", sector: "Investment Banking" },
  { roomId: "room_deals", body: "We're out. The earnout is doing the work the purchase price wouldn't.", sector: "Private Equity" },
  { roomId: "room_ma", body: "Counsel is suddenly 'reviewing.' That's the polite version of a leak they didn't plan.", sector: "Investment Banking" },
  { roomId: "room_ma", body: "Strategic walked. Sponsor is still kicking the tires and calling it conviction.", sector: "Private Equity" },
  { roomId: "room_rates", body: "Real yields backed up and every equity story got quieter. Good.", sector: "Hedge Fund" },
  { roomId: "room_rates", body: "Bills still do the job. I keep having to say that out loud.", sector: "Wealth Management" },
  { roomId: "room_after", body: "The guide was the beat. The quarter was just a vehicle for the guide.", sector: "Hedge Fund" },
  { roomId: "room_after", body: "After-hours volume is a rumor with a price. Wait for the cash open.", sector: "Quant/Trading" },
];

export const REPLIES = [
  "Same read. I'm just not sized for it.",
  "Disagree. The tape is paying you to wait.",
  "Send the level, not the adjective.",
  "That's a Thursday problem. Today I'm flat.",
  "If it's in the model, it isn't in the price.",
  "Noted. I'm not adding, and I'm not covering.",
  "You're early. Early is expensive on this desk.",
  "Call me when the book is actually covered.",
  "Clients will hate this and then ask for more of it.",
  "The only clean expression is smaller.",
  "I can support that if we both pretend it's a hedge.",
  "Say it again after the print. I'll still be here.",
];

export const QUESTION_REPLIES = [
  "Depends which book you're in. Mine says not yet.",
  "Yes, and I don't love that I agree.",
  "No. And I looked twice.",
  "Only if you can get out. I can't, so I'm not.",
  "Ask me after the cash close. The answer changes.",
];

export const BLAST_LINES = [
  "Sending this before the morning meeting rewrites it.",
  "You should see this before your PM does.",
  "Not advice. Also not nothing.",
  "Hot enough to forward. Not hot enough for the open floor.",
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
      { from: "peer", minutesAgo: 140, body: "You still short the front end into the print, or did someone finally read your book?" },
      { from: "me", minutesAgo: 100, body: "Still short. Smaller than my mouth." },
      { from: "peer", minutesAgo: 8, body: "Respect. The 2s10s is a trap and everyone knows it, which is why it still works." },
    ],
  },
  {
    peerId: "usr_term",
    unread: 1,
    lines: [
      { from: "peer", minutesAgo: 60 * 26, body: "That vertical AI seed is a feature list with a Delaware charter." },
      { from: "me", minutesAgo: 60 * 20, body: "So you're leading it." },
      { from: "peer", minutesAgo: 20, body: "We're tracking closely, which is how this desk says no." },
    ],
  },
  {
    peerId: "usr_powder",
    unread: 1,
    lines: [
      {
        from: "peer",
        minutesAgo: 15,
        blast: true,
        newsIndex: 2,
        body: "Sponsor group is shopping this as a quality compounder. The addbacks say otherwise.",
      },
    ],
  },
];
