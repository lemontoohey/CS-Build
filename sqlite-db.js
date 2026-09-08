// The local SQLite backend — built on node:sqlite (built into Node 22.5+),
// so there's nothing to `npm install`. This is the default data backend;
// lib/store.js switches to the Supabase backend instead when SUPABASE_URL
// and SUPABASE_KEY are set in .env. Both backends implement the same
// interface, so this file is only ever required from lib/store.js.

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS budget_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    budgeted_cents INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    mime_type TEXT,
    category TEXT NOT NULL DEFAULT 'Other',
    file_path TEXT NOT NULL,
    uploaded_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES budget_categories(id),
    txn_date TEXT NOT NULL,
    supplier TEXT,
    description TEXT,
    amount_cents INTEGER NOT NULL,
    gst_cents INTEGER NOT NULL DEFAULT 0,
    document_id TEXT REFERENCES documents(id),
    note TEXT,
    ai_generated INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date TEXT NOT NULL,
    weather TEXT,
    trades_present TEXT,
    work_done TEXT,
    issues TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS boq_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES budget_categories(id),
    description TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    unit_cost_cents INTEGER,
    supplier TEXT,
    status TEXT NOT NULL DEFAULT 'not_ordered',
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boq_item_id INTEGER NOT NULL REFERENCES boq_items(id),
    supplier TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    quote_date TEXT,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    trade_type TEXT,
    phone TEXT,
    email TEXT,
    licence_number TEXT,
    insurance_expiry TEXT,
    scope_notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schedule_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    planned_start TEXT,
    planned_end TEXT,
    actual_start TEXT,
    actual_end TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS compliance_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    regime TEXT NOT NULL,
    item TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    due_date TEXT,
    document_id TEXT REFERENCES documents(id),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed the Phase 1 budget categories, drawn from the House Cooper build spec
// (site services, structure, and finishes actually scoped on this project),
// only if the table is empty — so re-running the server never duplicates
// them or clobbers amounts someone has already entered.
const DEFAULT_CATEGORIES = [
  'Site establishment & earthworks',
  'Retaining & cut-fill',
  'Septic/AWTS system & ETA beds',
  'Water tanks (drinking, BASIX, bushfire)',
  'Footings & slab',
  'Structural frame (steel & timber)',
  'Roofing (Colorbond) & solar',
  'External cladding & stonework',
  'Windows & doors',
  'Waterproofing',
  'Plumbing rough-in & fixout',
  'Electrical rough-in & fixout',
  'Insulation',
  'Plasterboard & internal linings',
  'Painting',
  'Kitchen & joinery',
  'Flooring & tiling',
  'Bathroom fixtures',
  'Pool & fencing',
  'Driveway & external works',
  'Landscaping',
  'Fencing (property & pool safety)',
  'Council/certifier fees',
  'Contingency',
];

// Standard owner-build stage sequence (spec §3.4).
const DEFAULT_STAGES = [
  'Site establishment',
  'Earthworks & retaining',
  'Footings',
  'Slab',
  'Structural frame',
  'Roof',
  'Lock-up (windows & doors)',
  'Rough-in (plumbing, electrical, AWTS)',
  'Insulation & plasterboard',
  'Fix-out (carpentry, joinery)',
  'Flooring & tiling',
  'Painting',
  'External works (driveway, pool, landscaping)',
  'Final inspections & occupation certificate',
];

// Compliance checklist seeded from what's actually on this plan set: the
// BASIX Commitments table, the DA conditions, the bushfire water supply
// requirement, the pool, and the AWTS septic system — not a generic template.
const DEFAULT_COMPLIANCE = [
  ['DA / Council', 'Footings inspection booked & passed'],
  ['DA / Council', 'Slab inspection booked & passed'],
  ['DA / Council', 'Frame inspection booked & passed'],
  ['DA / Council', 'Waterproofing inspection booked & passed'],
  ['DA / Council', 'Final inspection booked & passed'],
  ['DA / Council', 'As-built walls checked against DA-approved outline (esp. the REV B wall moves)'],

  ['BASIX', 'Showerheads — minimum 4 star'],
  ['BASIX', 'Toilets — minimum 3 star'],
  ['BASIX', 'Dishwasher — minimum 4 star'],
  ['BASIX', 'Kitchen & bathroom taps — minimum 4 star'],
  ['BASIX', 'Rainwater tank (44,000L min) plumbed to toilets, laundry cold tap, outdoor tap'],
  ['BASIX', 'Stormwater tank (90,000L min) installed'],
  ['BASIX', 'Ceiling insulation R3.5 (or better) installed'],
  ['BASIX', 'Wall insulation R2.5 (bulk) installed'],
  ['BASIX', 'Gas instantaneous hot water — 5 star'],
  ['BASIX', 'Individual ducted exhaust fans to bathrooms/laundry/kitchen'],
  ['BASIX', 'LED lighting throughout'],
  ['BASIX', 'External operable blinds/eaves shading installed as specified'],
  ['BASIX', 'Pool/spa heat pump with timer installed'],
  ['BASIX', 'Clothes line installed'],

  ['Bushfire (BAL)', 'Assessed BAL rating confirmed with certifier'],
  ['Bushfire (BAL)', 'Bushfire water supply + Storz valve fitting installed & accessible'],
  ['Bushfire (BAL)', 'Construction materials meet BAL rating (windows, decking, external walls)'],
  ['Bushfire (BAL)', 'Asset Protection Zone (APZ) landscaping maintained'],

  ['Pool', 'Pool safety fencing to AS1926.1 installed'],
  ['Pool', 'Pool safety certificate obtained'],
  ['Pool', 'Pool registered with council/state register'],

  ['Septic / AWTS', 'AWTS5000 system installed & commissioned'],
  ['Septic / AWTS', 'ETA beds installed per design (4× 20m×1.4m)'],
  ['Septic / AWTS', 'Council on-site wastewater (health) approval obtained'],
  ['Septic / AWTS', 'Service contract set up for ongoing AWTS maintenance'],
];

function seed() {
  const catCount = db.prepare('SELECT COUNT(*) AS n FROM budget_categories').get();
  if (catCount.n === 0) {
    const insertCat = db.prepare(
      'INSERT INTO budget_categories (name, budgeted_cents, sort_order) VALUES (?, 0, ?)'
    );
    DEFAULT_CATEGORIES.forEach((name, i) => insertCat.run(name, i));
  }

  const stageCount = db.prepare('SELECT COUNT(*) AS n FROM schedule_stages').get();
  if (stageCount.n === 0) {
    const insertStage = db.prepare(
      'INSERT INTO schedule_stages (name, sort_order, status) VALUES (?, ?, \'not_started\')'
    );
    DEFAULT_STAGES.forEach((name, i) => insertStage.run(name, i));
  }

  const complianceCount = db.prepare('SELECT COUNT(*) AS n FROM compliance_items').get();
  if (complianceCount.n === 0) {
    const insertItem = db.prepare(
      "INSERT INTO compliance_items (regime, item, status, sort_order) VALUES (?, ?, 'pending', ?)"
    );
    DEFAULT_COMPLIANCE.forEach(([regime, item], i) => insertItem.run(regime, item, i));
  }
}

seed();

module.exports = { db };
