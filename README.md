# House Cooper Build Tool — Phase 1 + Phase 2

An owner-build tracker for the House Cooper project (253 Coopers Shoot Road), built from `house-cooper-build-tool-spec.md`. Phase 1 (budget ledger, AI receipt parsing, documents vault, site diary) and Phase 2 (materials/BOQ, schedule, trades directory, compliance checklists) are both built.

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

1. Copy `.env.example` to `.env`.
2. Get an API key at https://console.anthropic.com and set `ANTHROPIC_API_KEY=...` in `.env`.
3. Restart the server.

Without a key, the "Add receipt" screen still files the upload into the documents vault — you just fill in the transaction details yourself instead of having them read automatically.

**Every AI-extracted receipt is shown to you before it's saved as a transaction.** Nothing is written to the budget automatically — check the "AI-extracted from your receipt" banner and the confidence rating on the confirm screen before hitting save.

## Where your data lives

Everything is stored locally in `data/`:

- `data/app.db` — the SQLite database (budget, transactions, diary entries, document metadata).
- `data/documents/` — the actual uploaded files (receipts, DA approvals, contracts, etc.).

This whole folder is gitignored. **Back it up** — copy `data/` somewhere safe periodically (Time Machine, a synced folder, whatever you already use). There's no cloud sync in Phase 1.

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

Not built yet (see `house-cooper-build-tool-spec.md` for the full plan — this is Phase 3):
- AI materials takeoff from the plan set (draft quantities read straight off the drawings).
- Voice diary entries and natural-language budget/schedule Q&A.
- Hosting this somewhere other than your own machine (so it works from a phone on site without your laptop running) — likely a move to Postgres/Supabase at that point.

## Troubleshooting: "disk I/O error" from SQLite

If `node server.js` fails on startup with `Error: disk I/O error` / `ERR_SQLITE_ERROR`, it's almost always because the project folder sits somewhere that doesn't give SQLite proper file locking — a cloud-synced folder (iCloud Drive's "Desktop & Documents" sync is the common culprit on a Mac), a network share, or a bridged/virtual mount. SQLite needs a real local disk under it.

Fix: move the whole `house-cooper-build-tool` folder somewhere plain and local — e.g. `~/Dev/house-cooper-build-tool` — and run it from there instead of Desktop. This has nothing to do with the code; it's purely about where the `data/app.db` file physically lives.
