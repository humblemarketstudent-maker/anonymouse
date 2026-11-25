# Anonymouse

Anonymous rooms and private messages. No profile photos, no follower counts, no real names. An alias, a quote, freeform hashtags, group rooms, and direct lines.

This preview runs entirely in the browser. Sign-in, rooms, friends, taps, and messages are stored in `localStorage`. A timer posts new room lines, the occasional blast, and incoming Match taps. No Firebase, Supabase, or SMS provider is required.

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

`npm ci && npm run build` writes the static site to `dist`. Client routes (`/`, `/mine`, `/match`, `/msg`, `/friends`, `/you`) are handled in the browser.

## Deploy on Render

This is a static site. Build command: `npm ci && npm run build`. Publish directory: `dist`.

`render.yaml` is a Blueprint for that static site. It sets Node 22, keeps `NODE_ENV=development` so `npm ci` installs Vite and TypeScript, and rewrites `/*` to `/index.html`. Render serves files that exist in `dist` first, so JS and CSS are unchanged. Every other path, including a refresh on `/msg`, returns the app shell.

The Render MCP `create_static_site` call does not accept route rules. If the site is created that way, add the same rewrite in the dashboard:

- Source: `/*`
- Destination: `/index.html`
- Action: Rewrite

Also set `NODE_VERSION` to `22` and `NODE_ENV` to `development` for the build, or devDependencies will be skipped and `npm run build` will fail.

## Demo sign-in

Any phone number is accepted. Email sign-in is not part of the app.

**The code is `000000`.**

Example: `+1 212 555 0148`, then `000000`.

The number is kept on this device so a refresh can restore the session. It is never shown on a profile, in a room, or in a message.

After the code:

- **Alias** — the only public name
- **Quote** — one line about you
- **Hashtags** — optional, freeform (interest, city, craft, role). Pick from the most-used tags or add your own

A few aliases are already friends, with open lines, and three rooms are already joined.

## Tabs

- **Chats** — search rooms by words or by hashtag, browse the most-used tags, and create a room. Each room shows its name, description, how many users are in it, and a five-bar heat radar (messages in the last 24 hours). Open a room and the conversation sits beside the list.
- **Match** — 20 random aliases at a time (alias, quote, hashtags). Type a hashtag, with or without `#`, and the list shows aliases who use it. Refresh draws another set with that tag, or a new random set when the field is empty. Tap asks for a private chat. Twenty taps per local day, shown at the top and again above Refresh. A pending bar counts down for one hour. If they have not accepted by then, the tap drops and that alias stays out of the next shuffles. In this preview, mocks occasionally tap you, and you accept or decline those yourself. A decline or an ended match also stays out of the next passes.
- **My Rooms** — rooms you joined or created. Open one and you land in the conversation: incoming lines on the left, yours on the right, newest at the bottom. Room details still list the people and their latest line. A name opens their profile. Leave any time.
- **MSG** — direct messages and accepted Match chats. Rooms are not listed here. Check people and blast one note; the checks stay on after the send. Keep a chat to leave it on the list. Messages still disappear after 3 days, including in a kept chat. A chat you did not keep leaves MSG once it has been quiet for 3 days. End chat still closes the thread. Burn still wipes it. Match threads can also be ended, which keeps that alias out of Match for a while.
- **Friends** — aliases you added. This is separate from tapping someone in Match.
- **You** — edit the quote, hashtags, and mouse. Phone number stays on the device. Blocked aliases can be restored here.

Report, block, room posts, news links, and blast-to-friends still work inside rooms.

## Swapping in a real backend

UI code talks to the `Backend` interface in `src/backend/types.ts`. The running app is `createLocalBackend()` in `src/backend/index.ts`.

To use Supabase or Firebase later, implement that same interface and change the factory in `src/backend/index.ts`. Do not import a vendor SDK from components. The public snapshot must keep omitting the phone number.

`npm test` covers phone OTP, session restore, room search, the daily tap limit, accept and decline, and burn.
