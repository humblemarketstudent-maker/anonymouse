# Anonymouse

Anonymous rooms and private messages. No profile photos, no follower counts, no real names. An alias, a quote, freeform hashtags, group rooms, and direct lines.

This preview runs entirely in the browser. Sign-in, rooms, friends, taps, and messages are stored in `localStorage`. A timer posts new room lines, the occasional blast, and incoming Match taps. No Firebase, Supabase, or email provider is required for that preview.

An optional auth API in `server/auth` can email a real code through Twilio Verify. Rooms, Match, MSG, friends, taps, and profile completion stay on the local backend either way. Leave `VITE_AUTH_API_BASE` unset and the preview code stays `000000`.

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

The email OTP service is not in this Blueprint. It lives in `render.auth.yaml` so syncing the static site does not create it, and syncing the auth Blueprint does not create `anonymouse-moderation` or rewrite this site. See [Live email OTP](#live-email-otp).

## Demo sign-in

Any email address is accepted when `VITE_AUTH_API_BASE` is unset. Phone numbers are rejected. There is no country calling-code picker and no password.

**The local code is `000000`.** The sign-in screen advertises it only in that preview. It is hidden once the live auth API is configured, and the auth API rejects it unless `ALLOW_DEMO_OTP=true` on a non-production process.

Example: `tape@example.com`, then `000000`. `Tape@Example.com` restores the same on-device account.

The email is kept on this device so a refresh can restore the session. It is never shown on a profile, in a room, or in a message, and it is never copied onto `PublicUser`, `me`, `users`, or the directory. This preview does not send an email.

After the code:

- **Alias** — the only public name
- **Quote** — one line about you
- **Hashtags** — optional, freeform (interest, city, craft, role). Pick from the most-used tags or add your own

A few aliases are already friends, and three rooms are already joined. MSG starts empty. A chat shows up there when you message someone, accept a tap, or choose Keep. Leftover demo threads from an older build are dropped on the next visit unless you replied, kept the chat, or accepted the match. You do not need to clear site data.

## Tabs

- **Chats** — search rooms by words or by hashtag, browse the most-used tags, and create a room. Each room shows its name, description, how many users are in it, and a five-bar heat radar (messages in the last 24 hours). Open a room and the conversation sits beside the list.
- **Match** — 20 random aliases at a time (alias, quote, hashtags). Type a hashtag, with or without `#`, and the list shows aliases who use it. Refresh draws another set with that tag, or a new random set when the field is empty. Tap asks for a private chat. Twenty taps per local day, shown at the top and again above Refresh. A pending bar counts down for one hour. If they have not accepted by then, the tap drops and that alias stays out of the next shuffles. In this preview, mocks occasionally tap you, and you accept or decline those yourself. A decline or an ended match also stays out of the next passes.
- **My Rooms** — rooms you joined or created. Open one and you land in the conversation: incoming lines on the left, yours on the right, newest at the bottom. Room details still list the people and their latest line. A name opens their profile. Leave any time.
- **MSG** — direct messages you started and Match chats you accepted. Rooms are not listed here, and the inbox is not pre-filled. Check people and blast one note; the checks stay on after the send. Keep a chat to leave it on the list. Messages still disappear after 3 days, including in a kept chat. A chat you did not keep leaves MSG once it has been quiet for 3 days. End chat still closes the thread. Burn still wipes it. Match threads can also be ended, which keeps that alias out of Match for a while.
- **Friends** — aliases you added. This is separate from tapping someone in Match.
- **You** — edit the quote, hashtags, and mouse. The sign-in email stays on the device. Blocked aliases can be restored here.

Report, block, room posts, news links, and blast-to-friends still work inside rooms.

## Swapping in a real backend

UI code talks to the `Backend` interface in `src/backend/types.ts`. The running app is chosen in `src/backend/index.ts`.

With `VITE_AUTH_API_BASE` unset, that file uses `createLocalBackend()`. With it set, a thin hybrid sends `requestOtp` and `verifyOtp` to the auth API and then opens the same local session. Rooms, Match, MSG, friends, taps, and profile completion are unchanged.

To use Supabase or Firebase later, implement that same interface and change the factory in `src/backend/index.ts`. Do not import a vendor SDK from components. The public snapshot must keep omitting the sign-in email.

`npm test` covers the local demo code, the hybrid adapter, the auth API, session restore, room search, the daily tap limit, accept and decline, burn, and the moderation agent.

## Live email OTP

The auth service is Node, in `server/auth`. It exposes:

- `GET /api/auth/health`
- `POST /api/auth/request-otp` with `{ "contact": "tape@example.com" }`
- `POST /api/auth/verify-otp` with `{ "contact": "tape@example.com", "code": "123456" }`

Twilio Verify sends and checks the code on the email channel (`Channel=email`). This process does not store the code. A successful check returns a short-lived HMAC token that does not contain the email. The browser does not keep that token. It creates or restores the local account the same way the demo sign-in does, and the email stays on that device only. Phone sign-in is not accepted. Email Verify does not use a rented Twilio phone number.

Run it locally with placeholders, not real secrets, in the environment or in an untracked `.env`:

```bash
export AUTH_PORT=8788
export AUTH_SESSION_SECRET=replace-with-a-long-random-secret
export TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
export TWILIO_AUTH_TOKEN=replace-with-the-twilio-auth-token
export TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
export CORS_ORIGIN=https://anonymouse.lol,https://www.anonymouse.lol,https://anonymouse-eafk.onrender.com
export ALLOW_DEMO_OTP=false
npm run auth
```

`AUTH_SESSION_SECRET` must be at least 16 characters. `ALLOW_DEMO_OTP` defaults to false. Set it to `true` only when `NODE_ENV` is not `production` if you need to exercise the client without Twilio. Production ignores that flag, including on Render where `NODE_ENV` is `production`.

`npm run dev` proxies `/api/auth` to `AUTH_ORIGIN` (default `http://127.0.0.1:8788`). Point the SPA at the dev server so the browser stays same-origin:

```bash
# .env, which Vite reads. Do not commit it.
VITE_AUTH_API_BASE=http://127.0.0.1:43123
```

Restart `npm run dev` after changing that variable. The preview banner and the `000000` hint disappear. The address is normalized to lowercase before the request.

The service allows one code per email per minute, 5 per email per hour, 10 per IP per hour, and 30 per process per hour. Code checks are capped at 5 per email per 10 minutes and 30 per IP per hour. Those counters are in memory. The email is the identifier where the old limits were per phone number.

`render.auth.yaml` is a separate Blueprint for a service named `anonymouse-auth`. Syncing it does not create the static site or `anonymouse-moderation`, and it does not change DNS. Deploys from that file are off until you turn them on. The existing `render.yaml` is unchanged.

Go-live still needs all of the following, after you confirm:

- the existing Twilio Verify service with the email channel enabled (no new paid product, and no From phone number to buy)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, and `AUTH_SESSION_SECRET` set on the Render service (none of these belong in Vite or in git)
- `ALLOW_DEMO_OTP=false`
- a static-site rebuild with `VITE_AUTH_API_BASE` set to the auth service origin
- a deploy of that rebuild, and of the auth service, only when you ask for it

A Twilio trial account cannot email arbitrary addresses. It can send only to addresses verified on that trial. Nothing in this repo sends an email until those environment variables exist, the email channel is enabled, and the service is running.

The free Render instance sleeps after a quiet period, so the first code request after that can be slow.

## Moderation

Outgoing rooms, MSG, and blasts are checked before they are saved. Phone numbers, emails, Bloomberg IDs, Telegram handles, and WeChat IDs are replaced with `****`. Secrets and explicit sexual content are refused. An attachment the scanner cannot finish is held, not posted.

The checker in the browser is deterministic and has no API key. A Node agent in `server/` adds the admin log, webhooks, and an optional model. Tokens and webhook URLs stay in server env vars. See [docs/moderation.md](docs/moderation.md) and `.env.example`.

```bash
npm run moderation
```

Admin is at `/admin` while the dev server is running. The static site on Render is unchanged and keeps working if that agent is not deployed.
