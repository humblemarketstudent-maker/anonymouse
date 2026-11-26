# Moderation agent

Anonymouse is a static React app. Messages live in `localStorage` on each device. The moderation agent is a small Node service that inspects text and attachments before they are stored. API keys, the webhook URL, and the admin token stay in server environment variables.

The same policy module also runs in the browser. If the agent is down, that local layer still masks personal details, blocks confidential leaks and explicit text, and quarantines attachments it cannot clear. It does not call a model.

## What runs where

```text
composer / MSG / blast
        │
        ▼
reviewForSend()                         src/lib/review-send.ts
        │
        ├─ POST /api/moderation/inspect     only when the agent answers
        │         │
        │         ▼
        │   server/app.ts
        │         ├─ evaluate()             regex and MIME heuristics
        │         ├─ optional LLM / vision  skipped when keys are empty
        │         ├─ audit log + webhook    sanitized preview only
        │         └─ admin API              bearer token
        │
        └─ evaluate()                       if the agent is unreachable
        │
        ▼
backend.postChatter / sendMessage / blastThreads
        │
        └─ enforceSync()                    runs again before localStorage
```

Personal details are replaced with `****`. The stored message keeps the surrounding words and a stamp: `pii_redacted: true` and `redacted_types`. The sender sees “Personal details were masked.”

Confidential leaks and explicit sexual content are not stored. The user sees a short refusal. Admins get an alert whose preview has already been masked. Sexual content that appears to involve a minor is refused without keeping the text, a preview, or the file bytes.

If an attachment scanner times out or throws, the file is quarantined. It is not posted. A clean file that the deterministic checks can read still goes through when no vision model is configured. A vision timeout does not fall back to auto-approve.

## Run it locally

Terminal 1:

```bash
cp .env.example .env
# set MODERATION_ADMIN_TOKEN
npm install
npm run moderation
```

The agent listens on `0.0.0.0:$PORT` (default `8787`).

Terminal 2:

```bash
npm run dev
```

Vite proxies `/api/moderation` to `MODERATION_ORIGIN` (default `http://127.0.0.1:8787`). That value is read by the Vite process only. It is not a `VITE_` variable and it is not compiled into the browser bundle.

Open the app, sign in with any email and `000000`, then use a room or MSG. Admin is at [/admin](http://127.0.0.1:43123/admin). Paste the admin token. Alerts, the audit log, and quarantined files show session hashes and masked previews. Allow and Remove append a new audit row. They do not edit older rows, and they do not put the file back into a chat.

`npm test` covers masking, leak alerts, explicit text and files, scanner-timeout quarantine, and the HTTP agent.

## Environment

See `.env.example` for every key and the default thresholds. None of them belong in the client.

| Key | Role |
| --- | --- |
| `MODERATION_ADMIN_TOKEN` | Bearer token for `/admin` |
| `MODERATION_ALERT_WEBHOOK_URL` | Optional alert destination |
| `MODERATION_LLM_*` | Optional text classifier |
| `MODERATION_VISION_MODEL` | Optional image classifier |
| `MODERATION_AUDIT_PATH` | Optional append-only JSONL file |
| `MODERATION_RATE_*` / `MODERATION_STRIKE_*` / `MODERATION_COOLDOWN_MS` | Spam and repeat-block hooks |
| `MODERATION_PUBLIC_INSPECT` | Set `false` to disable the public inspect route |

Leave the LLM and vision keys empty to run on heuristics only.

## Render

`render.yaml` keeps the existing static site and adds a second web service, `anonymouse-moderation`. The static site is unchanged: build `npm ci && npm run build`, publish `dist`. The agent starts with `npm run moderation` and binds to `PORT`.

The static site cannot see the agent's env vars. On the deployed static host, `/api/moderation` is absent, so the in-browser layer enforces the deterministic rules. To put the agent on the same origin later, proxy `/api/moderation` at the edge, or have the future API call `enforce()` in process and set `MODERATION_PUBLIC_INSPECT=false`.

The audit file is optional. Render's disk is ephemeral unless a persistent disk is attached. The in-memory log is enough for a first deploy. Do not commit the JSONL file.

This repo does not deploy the agent on its own. Syncing the Blueprint is a separate step.

## A future shared backend

UI code already talks to the `Backend` interface in `src/backend/types.ts`. A real adapter should call the same module before it writes a message or fans it out over a socket:

```ts
import { enforce } from "./moderation/pipeline";

const decision = await enforce(
  {
    parts: { body, url: news?.url, title: news?.title, summary: news?.summary, source: news?.source },
    attachment,
    channelId: roomId ?? threadId,
    actorId: sessionHashInput,
  },
  { journal, rate, salt: process.env.MODERATION_ACTOR_SALT },
);

if (decision.action !== "allow" && decision.action !== "redact") {
  return { ok: false, error: decision.notice };
}
await save({
  body: decision.parts.body,
  news: decision.parts.url ? { ...news, url: decision.parts.url } : undefined,
  attachment: decision.attachmentAllowed ? attachment : undefined,
  moderation: decision.pii_redacted
    ? { pii_redacted: true, redacted_types: decision.redacted_types }
    : undefined,
});
```

Do that on the server that receives the message, not in the browser, once a shared backend exists. Keep storing the redacted body. Keep the audit row free of raw secrets, phone numbers, and real names. Session hashes and aliases are the only identities that belong in the log.

Room lines, MSG, and blasts should all use that one call. The browser `reviewForSend()` helper can stay as a fast check, with the server decision as the one that counts.
