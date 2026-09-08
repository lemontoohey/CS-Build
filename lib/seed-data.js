// Shared seed data for a brand-new data store — the same starting point
// regardless of which backend someone picks. sqlite-db.js and
// supabase/schema.sql each carry their own copy of this (needed at their
// respective creation time, before this file existed), kept identical by
// hand; the Google Drive backend (lib/store.js) uses this copy directly
// since it builds its "database" as a plain JS object, not SQL.

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

// Builds a brand-new, empty-except-for-seed-data store state — the shape
// the Google Drive backend keeps as one JSON blob. Mirrors what a fresh
// sqlite-db.js / supabase/schema.sql gives you.
function buildInitialState() {
  const tables = {
    budget_categories: DEFAULT_CATEGORIES.map((name, i) => ({
      id: i + 1,
      name,
      budgeted_cents: 0,
      sort_order: i,
    })),
    documents: [],
    transactions: [],
    diary_entries: [],
    boq_items: [],
    quotes: [],
    trades: [],
    schedule_stages: DEFAULT_STAGES.map((name, i) => ({
      id: i + 1,
      name,
      sort_order: i,
      planned_start: null,
      planned_end: null,
      actual_start: null,
      actual_end: null,
      status: 'not_started',
      notes: null,
    })),
    compliance_items: DEFAULT_COMPLIANCE.map(([regime, item], i) => ({
      id: i + 1,
      regime,
      item,
      status: 'pending',
      due_date: null,
      document_id: null,
      notes: null,
      sort_order: i,
    })),
    settings: [],
    plan_sheets: [],
    plan_measurements: [],
    suppliers: [],
    price_book_items: [],
    formulate_recipes: [],
    formulate_lines: [],
  };

  const { buildEstimatingTables } = require('./estimating-seed');
  const estimating = buildEstimatingTables();
  tables.suppliers = estimating.suppliers;
  tables.price_book_items = estimating.price_book_items;
  tables.formulate_recipes = estimating.formulate_recipes;
  tables.formulate_lines = estimating.formulate_lines;

  const nextIds = {
    budget_categories: DEFAULT_CATEGORIES.length + 1,
    documents: 1,
    transactions: 1,
    diary_entries: 1,
    boq_items: 1,
    quotes: 1,
    trades: 1,
    schedule_stages: DEFAULT_STAGES.length + 1,
    compliance_items: DEFAULT_COMPLIANCE.length + 1,
    settings: 1,
    plan_sheets: 1,
    plan_measurements: 1,
    suppliers: estimating.nextIds.suppliers,
    price_book_items: estimating.nextIds.price_book_items,
    formulate_recipes: estimating.nextIds.formulate_recipes,
    formulate_lines: estimating.nextIds.formulate_lines,
  };

  return { tables, nextIds };
}

function ensureEstimatingState(state) {
  if (!state.tables) state.tables = {};
  if (!state.nextIds) state.nextIds = {};
  const needed = [
    'plan_sheets',
    'plan_measurements',
    'suppliers',
    'price_book_items',
    'formulate_recipes',
    'formulate_lines',
  ];
  for (const table of needed) {
    if (!state.tables[table]) state.tables[table] = [];
    if (state.nextIds[table] === undefined) state.nextIds[table] = 1;
  }
  if (state.tables.suppliers.length === 0) {
    const { buildEstimatingTables } = require('./estimating-seed');
    const estimating = buildEstimatingTables({
      startIds: {
        suppliers: state.nextIds.suppliers || 1,
        price_book_items: state.nextIds.price_book_items || 1,
        formulate_recipes: state.nextIds.formulate_recipes || 1,
        formulate_lines: state.nextIds.formulate_lines || 1,
      },
    });
    state.tables.suppliers = estimating.suppliers;
    state.tables.price_book_items = estimating.price_book_items;
    state.tables.formulate_recipes = estimating.formulate_recipes;
    state.tables.formulate_lines = estimating.formulate_lines;
    Object.assign(state.nextIds, estimating.nextIds);
  }
  return state;
}

module.exports = {
  DEFAULT_CATEGORIES,
  DEFAULT_STAGES,
  DEFAULT_COMPLIANCE,
  buildInitialState,
  ensureEstimatingState,
};
