# Anonymouse

Anonymous, fast chatter for people on the financial floor. No profile photos, no follower counts, no real names. Aliases, one-line quotes, a sector tag, a live feed, group rooms, and alias-to-alias DMs.

This preview runs entirely in the browser. Sign-in, the floor, and messages are stored in `localStorage`. A timer layer posts new chatters, room lines, and the occasional blast so the UI feels live. No Firebase, Supabase, or SMS provider is required.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints. This repo's dev server defaults to [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm ci && npm run build
```

`npm ci && npm run build` writes the static site to `dist`. `dist/index.html` is the app shell. Client routes (`/inbox`, `/rooms/room_market`, `/friends`, `/me`) are handled in the browser.

## Deploy on Render

This is a static site. Build command: `npm ci && npm run build`. Publish directory: `dist`.

`render.yaml` is a Blueprint for that static site. It sets Node 22, keeps `NODE_ENV=development` so `npm ci` installs Vite and TypeScript, and rewrites `/*` to `/index.html`. Render serves files that exist in `dist` first, so JS and CSS are unchanged. Every other path, including a refresh on `/inbox`, returns the app shell.

The Render MCP `create_static_site` call does not accept route rules. If the site is created that way, add the same rewrite in the dashboard:

- Source: `/*`
- Destination: `/index.html`
- Action: Rewrite

Also set `NODE_VERSION` to `22` and `NODE_ENV` to `development` for the build, or devDependencies will be skipped and `npm run build` will fail.

## Demo sign-in

Any phone number or email is accepted.

**The code is `000000`.**

Example: `floor@anonymouse.app`, then `000000`.

The contact is kept on this device so a refresh can restore the session. It is never shown on a chatter, in a room, in a DM, or on a profile.

After the code, the desk is three fields:

- **Alias** — display handle, e.g. `MacroMouse`
- **Bio quote** — one line, e.g. `Long volatility, short sleep`
- **Financial sector** — Investment Banking, Hedge Fund, Private Equity, Venture Capital, Quant/Trading, Wealth Management, FinTech, Crypto/DeFi, or Retail/Other

A few aliases are already on your friend list, with open lines, so Blast, inbox, and burn work immediately.

## What you can do

- Scroll the Chatter feed and filter it by sector
- Post a take, or attach a news link (Enter posts, Shift+Enter breaks a line)
- Blast that post to selected friends, or Select all
- Open `#Market-Open`, `#Deal-Flow`, `#M&A-Rumors`, `#Rates-Desk`, and `#After-Hours`
- Tap a card or alias to start an anonymous DM
- Burn a chat to wipe that thread on this device
- Report or block from a card, a room line, or a DM. Blocked aliases leave the feed and cannot be messaged
- Edit the desk, unblock, sign out, or reset the demo floor from You

News links are rich previews. Opening one stays inside the prototype.

## Swapping in a real backend

UI code talks to the `Backend` interface in `src/backend/types.ts`. The running app is `createLocalBackend()` in `src/backend/index.ts`.

To use Supabase or Firebase later, implement that same interface (auth, feed, rooms, threads, friends, blocks, reports) and change the factory in `src/backend/index.ts`. Do not import a vendor SDK from components. The public snapshot must keep omitting phone, email, and legal name.

`npm test` covers the local floor: demo OTP, session restore, blast, block, and burn.
