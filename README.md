# CalSync

Self-hosted helper for Google Calendar: when you are busy on one calendar, CalSync mirrors **Busy** blocks onto the others in your sync group. OAuth refresh tokens and preferences live in `.data/store.json` on the machine that runs the app.

Clone the repo and copy **`.env.example`** to `.env.local` to configure Google OAuth and the public URL (see [Configure environment variables](#3-configure-environment-variables)).

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer (LTS recommended)
- A [Google Cloud](https://console.cloud.google.com/) project where you can enable APIs and create OAuth credentials

## Setup (step by step)

### 1. Install dependencies

From the project root:

```bash
npm install
```

### 2. Create Google OAuth credentials

1. In [Google Cloud Console](https://console.cloud.google.com/), select or create a project.
2. **APIs & Services → Library** — enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** — configure the app (type *External* is fine for personal use; add your Google account as a test user if the app stays in testing).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
5. Application type: **Web application**.
6. Under **Authorized redirect URIs**, add exactly:

   `http://localhost:3000/api/auth/callback`

   For production, add your public URL with the same path, e.g. `https://your-domain.com/api/auth/callback`.

7. Copy the **Client ID** and **Client secret**.

### 3. Configure environment variables

The repository includes **`.env.example`** as a safe template (no secrets). Copy it and fill in your values:

1. Copy the example env file:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and set at minimum:

   | Variable | Description |
   |----------|-------------|
   | `GOOGLE_CLIENT_ID` | OAuth client ID from step 2 |
   | `GOOGLE_CLIENT_SECRET` | OAuth client secret from step 2 |
   | `CALSYNC_PUBLIC_URL` | Base URL with no trailing slash. Local: `http://localhost:3000`. Production: your HTTPS origin |

3. **Production:** set `CALSYNC_SESSION_SECRET` to a long random string so dashboard sessions are signed securely. Optionally set `CALSYNC_ALLOWED_EMAILS` to a comma-separated list of Google emails allowed to sign in.

See comments in `.env.example` for optional settings (webhook token, auto-sync interval, cron secret for renewing push subscriptions).

### 4. Run the app locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to sign in; use **Continue with Google**, then connect calendars on the dashboard.

### 5. Use the dashboard

After you sign in, the dashboard uses two tabs:

- **Upcoming events** (default) — Lists events in the next 7, 30, or 90 days for calendars in your **saved** sync group only. Shows schedule, “free” transparency when Google marks the event that way, optional Meet/video links, and a link to open the event in Google Calendar.
- **Sync setup** — Manage Google accounts and the sync group:
  - **Connected Google accounts** — Add another account, remove one, or **Disconnect all**. Calendars from every linked account appear in one list; busy blocks can sync across different Google logins.
  - **Calendars in sync group** — Check at least two calendars that should both publish and receive busy mirrors. Each calendar must be writable (owner or “Make changes to events”) on at least one connected account. Use **Add calendar** to **Create** a new calendar (optionally choose which account owns it when you have several) or **Add to list** with an existing calendar ID from Google Calendar → Settings → Integrate calendar. Then **Save selection** and **Run sync now**, or rely on HTTPS push notifications and optional polling (see [Configure environment variables](#3-configure-environment-variables)).
  - After a sync, **Last sync** shows created/updated/deleted mirror counts, how many event rows Google returned, and (when relevant) why some events were skipped (e.g. “Show as available”, existing CalSync mirrors, cancelled events).

Refresh tokens and preferences are written to `.data/store.json` on this machine. Include `.data/` in backups if you move servers.

**API (optional):** Authenticated sessions can call `GET /api/events?days=30` (1–90) for JSON of the same upcoming-events window used by the dashboard. You can trigger a sync with `POST /api/sync` (same session cookie) or from automation if you expose it appropriately. To strip only CalSync mirror blocks from one calendar (not your real events), `POST /api/calendars/clear-mirrors` with JSON `{ "calendarId": "<id>" }`.

### 6. Production build (optional)

```bash
npm run build
npm run start
```

Ensure `CALSYNC_PUBLIC_URL` matches the URL users use (HTTPS for Google Calendar push notifications). For serverless deployments, configure `CALSYNC_CRON_SECRET` and call `GET /api/cron/renew-watches` daily with `Authorization: Bearer <secret>` so push channel subscriptions stay valid.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (Turbopack) |
| `npm run dev:webpack` | Development server using Webpack |
| `npm run build` | Production build (Turbopack) |
| `npm run build:webpack` | Production build using Webpack |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Changelog

### [0.1.0] — 2026-04-03

- **Core:** Next.js 16 (App Router), Google OAuth, busy-block mirroring across a chosen calendar group, local persistence in `.data/store.json`, optional push notifications and cron for watch renewal (see env docs).
- **Dashboard:** **Upcoming events** and **Sync setup** tabs; calendars merged across linked Google accounts; last-sync summary with skip reasons.
- **API:** `GET /api/events?days=…` (1–90), `POST /api/sync`, `POST /api/calendars/clear-mirrors` (session-authenticated).
- **Tooling:** `npm run dev` / `npm run build` (Turbopack); optional `npm run dev:webpack` and `npm run build:webpack`.
- **Declined invitations:** Events where your RSVP is *Declined* are omitted from the upcoming list, are not sources for mirrors, and sync skip stats can include `declinedByYou`.
- **Clear mirrors:** Per-calendar control on Sync setup (and the clear-mirrors API) deletes CalSync mirror events over a wide past range plus the normal forward window; your own non-mirror events are untouched.
- **Sync cleanup:** Duplicate CalSync mirrors on the same target (same mirror key) are deleted during sync.
- **UI:** Calendar create/add flows were removed from the home page in favor of managing the sync group and calendars in Google Calendar / settings.
- **Agenda:** The upcoming-events list hides items that have already ended (timed and all-day); the view refreshes when the next event in range ends. List-head badges use urgency colors (calm → urgent) from time until start or, for live timed events, time until end. The footer shows how many events are still on the agenda versus how many in the window already ended, with a clear empty state when everything in range is past.
- **Login:** OAuth error text from the query string is read with `useSearchParams` inside a `Suspense` boundary so static generation and ESLint stay clean.

## Tech stack

[Next.js](https://nextjs.org/) 16 (App Router), [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/) 4, and the [Google Calendar API](https://developers.google.com/calendar) via `googleapis`.
