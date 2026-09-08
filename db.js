// Local file storage location for uploaded documents/receipts. This stays
// local to whichever machine runs the app regardless of which data backend
// (sqlite or Supabase) is active — see lib/store.js for the data layer, and
// the README for why file storage wasn't also moved to Supabase Storage yet.

const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.join(__dirname, 'data');
const DOCS_DIR = path.join(DATA_DIR, 'documents');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

module.exports = { DOCS_DIR };
