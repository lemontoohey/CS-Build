# House Cooper Build Tool

An owner-build tracker for the House Cooper project (253 Coopers Shoot Road), built from `house-cooper-build-tool-spec.md`. Phase 1 (budget ledger, AI receipt parsing, documents vault, site diary), Phase 2 (materials/BOQ, schedule, trades directory, compliance checklists), and Phase 3 (choice of where data lives, and AI/provider settings that don't require editing files) are all built.

## Why this has zero npm dependencies

Everything here runs on what's built into Node.js 22+: the `node:sqlite` database, the global `fetch` for calling the Claude API, and a hand-rolled HTTP router instead of a framework. That means:

- `npm install` — **not needed**. There's nothing to install.
- No version drift, no `node_modules`, no supply-chain surface to worry about.
- Styling comes from the Tailwind CDN script tag loaded in the browser, not a build step.

This was a deliberate choice for Phase 1, not a limitation — it makes the tool trivial to run and hand off. If it ever needs a real framework (React, Postgres/Supabase, etc.) for Phase 2/3, that's a rewrite of specific files, not a rethink of the whole approach.

## Running it

Requires Node.js 22.5 or newer (check with `node -v`).

```bash
cd house-cooper-build-tool
node server.js
```

Then open http://localhost:3000

For auto-restart on file changes during development:

```bash
node --watch server.js
```

## Turning on AI receipt parsing

Easiest way: open the app, go to **Settings**, pick a provider (Anthropic or OpenAI), and paste in your own API key. It works immediately — no restart, no file editing.

(You can also set `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` in `.env` instead if you prefer — see `.env.example` — but the Settings page is simpler for most people.)

Without a key, the "Add receipt" screen still files the upload into the documents vault — you just fill in the transaction details yourself instead of having them read automatically.

**Every AI-extracted receipt is shown to you before it's saved as a transaction.** Nothing is written to the budget automatically — check the "AI-extracted from your receipt" banner and the confidence rating on the confirm screen before hitting save.

## Where your data lives

Go to **Settings** in the app to choose. There are three options, and you can switch between them at any point without losing anything:

- **This computer only** — the default. No setup. Everything lives in a file on this computer (`data/app.db`). Nothing to connect, nothing that can leak, but it doesn't back up anywhere by itself.
- **Google Drive** — click "Connect Google Drive," sign in with your own Google account, done. Your data is saved as one file in your own Drive. This app can only ever see that one file — nothing else in your Drive. The trade-off: if you open the app on two computers at the same time, the second one to save wins (there's no merge) — fine for one person editing from one place at a time, not built for simultaneous multi-device editing.
- **Supabase (advanced)** — a real shared Postgres database, for anyone comfortable creating a Supabase project. See `supabase/schema.sql`.

Whichever you pick, uploaded files (receipts, DA approvals, contracts, etc.) always stay in `data/documents/` on whichever computer you uploaded them from — that part isn't affected by this choice yet.

`data/` is gitignored regardless of backend. If you're using "This computer only," **back it up yourself** — copy `data/` somewhere safe periodically (Time Machine, a synced folder, whatever you already use).

### Turning on the Google Drive option

The "Connect Google Drive" button only appears once whoever's running this app (that's you, not your friend) has done this once, in a free Google Cloud account:

1. Go to https://console.cloud.google.com, create a project (any name).
2. **APIs & Services → Enabled APIs** → enable the "Google Drive API".
3. **APIs & Services → OAuth consent screen** → choose "External," fill in an app name and your email, and add yourself as a test user (this keeps it out of Google's review process — fine for a personal tool).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → application type "Web application" → under "Authorized redirect URIs" add `http://localhost:3000/oauth/google/callback`.
5. Copy the Client ID and Client Secret it gives you into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then restart the server once.

After that one-time setup, anyone using the app (including your friend) just clicks "Connect Google Drive" and signs in — no keys, no console, no technical steps on their end.

## What's here vs. what's next

Built now:
- Budget ledger — 24 starting categories seeded from the actual project scope, budgeted vs. spent per category, editable.
- Receipt upload with AI parsing (Claude vision) that pre-fills a transaction for you to confirm.
- Documents vault with category tags (DA, BASIX, bushfire, contract, insurance, certificates, warranties, etc.).
- Site diary — dated entries with trades, work done, and an issues/delays field.
- **Materials & quantities (BOQ)** — line items by category, order status (not ordered → ordered → delivered → installed), and per-item supplier quote comparison so you can see who's cheapest at a glance.
- **Schedule** — the standard 14-stage build sequence (site establishment through final inspections), with planned vs. actual dates per stage. Anything past its planned end date and not marked done shows as "Overdue"; anything finished after its planned end shows as "Done (late)".
- **Trades & suppliers directory** — contact details, licence numbers, and insurance expiry, auto-flagged amber inside 30 days and red once lapsed. Trades with insurance issues also surface as a warning banner on the dashboard.
- **Compliance checklist** — seeded from what's actually on this plan set (the BASIX Commitments table, DA conditions including the REV B wall moves, the bushfire water/BAL requirement, the pool safety certificate, and AWTS septic commissioning), not a generic template. Click to check off; add your own items under any regime.
- Dashboard now also shows the next unstarted schedule stage and a count of outstanding compliance items.
- **Settings page** — pick your AI provider and paste in your own API key (not tied to any one account); choose where your data lives (this computer, your own Google Drive, or Supabase) and switch between them without losing anything, all without editing a single file.
- **Works fully with no AI key at all.** Nothing in this app requires AI — it's an optional convenience for reading receipts, not a dependency:
  - **Materials calculators** — plasterboard/cladding sheets, roof sheeting, tiles, paint, concrete volume, and timber studs/fence post counts, from plain measurements (no AI plan-reading needed). Each gives a one-click "add to materials list" so a result becomes a real BOQ line straight away.
  - **Quick answers** on the dashboard — total spent, categories over budget, biggest spend category, build progress, compliance remaining, materials not yet ordered — the handful of things people actually ask about a budget/schedule, computed directly from your data instead of asked to an AI.
  - Receipts without AI just get filed in the documents vault for you to enter manually — always been true, still true.

Not built yet (see `house-cooper-build-tool-spec.md` for the full plan):
- AI materials takeoff read straight off the plan drawings (the calculators above cover the "I know the measurements, what do I need" case; reading quantities off a PDF plan set is a different, AI-only capability, not yet built).
- Voice diary entries.
- Uploaded documents/receipts moving with you to Google Drive/Supabase too — right now those still stay on whichever computer uploaded them, only the budget/schedule/etc. data follows your backend choice.

## Troubleshooting: "disk I/O error" from SQLite

If `node server.js` fails on startup with `Error: disk I/O error` / `ERR_SQLITE_ERROR`, it's almost always because the project folder sits somewhere that doesn't give SQLite proper file locking — a cloud-synced folder (iCloud Drive's "Desktop & Documents" sync is the common culprit on a Mac), a network share, or a bridged/virtual mount. SQLite needs a real local disk under it.

Fix: move the whole `house-cooper-build-tool` folder somewhere plain and local — e.g. `~/Dev/house-cooper-build-tool` — and run it from there instead of Desktop. This has nothing to do with the code; it's purely about where the `data/app.db` file physically lives.
