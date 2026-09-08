// Data-access abstraction. Two backends, same shape:
//
//  - sqlite (default): node:sqlite, local file, zero setup.
//  - supabase: Postgres via Supabase's REST API (PostgREST), reached with
//    plain fetch — no `pg` driver, no npm install. Turned on by setting
//    SUPABASE_URL and SUPABASE_KEY in .env.
//
// Routes call this generic interface (listAll/getById/getWhere/insert/update)
// instead of writing SQL directly, so the same route code works against
// either backend. Joins and aggregation that used to be SQL now happen in
// plain JS in the route files — simple enough at this scale, and it keeps
// both backends honest implementations of the same handful of operations.

const USE_SUPABASE = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

// node:sqlite refuses to bind raw JS booleans — normalize to 0/1 so route
// code can pass real booleans either way (Supabase accepts them natively).
function toSqliteValue(v) {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

function buildSqliteStore() {
  const { db } = require('../sqlite-db');

  function listAll(table, { orderBy } = {}) {
    const sql = orderBy ? `SELECT * FROM ${table} ORDER BY ${orderBy}` : `SELECT * FROM ${table}`;
    return Promise.resolve(db.prepare(sql).all());
  }

  function getById(table, id) {
    return Promise.resolve(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) || null);
  }

  function getWhere(table, filters = {}, { orderBy } = {}) {
    const keys = Object.keys(filters);
    const where = keys.length ? 'WHERE ' + keys.map((k) => `${k} = ?`).join(' AND ') : '';
    const orderClause = orderBy ? ` ORDER BY ${orderBy}` : '';
    const sql = `SELECT * FROM ${table} ${where}${orderClause}`;
    return Promise.resolve(db.prepare(sql).all(...keys.map((k) => toSqliteValue(filters[k]))));
  }

  function insert(table, data) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = db.prepare(sql).run(...keys.map((k) => toSqliteValue(data[k])));
    if (data.id !== undefined) {
      return getById(table, data.id);
    }
    return getById(table, result.lastInsertRowid);
  }

  function update(table, id, data) {
    const keys = Object.keys(data);
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(
      ...keys.map((k) => toSqliteValue(data[k])),
      id
    );
    return getById(table, id);
  }

  function count(table, filters = {}) {
    const keys = Object.keys(filters);
    const where = keys.length ? 'WHERE ' + keys.map((k) => `${k} = ?`).join(' AND ') : '';
    const row = db
      .prepare(`SELECT COUNT(*) AS n FROM ${table} ${where}`)
      .get(...keys.map((k) => filters[k]));
    return Promise.resolve(row.n);
  }

  async function getSetting(key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  }

  async function setSetting(key, value) {
    db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key, value);
  }

  return { backend: 'sqlite', listAll, getById, getWhere, insert, update, count, getSetting, setSetting };
}

// Converts our "column" / "column desc" convention (same string used for
// the sqlite backend's raw SQL) into PostgREST's "column.asc" / "column.desc".
function toPostgrestOrder(orderBy) {
  const parts = orderBy.trim().split(/\s+/);
  const column = parts[0];
  const direction = (parts[1] || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  return `${column}.${direction}`;
}

function buildSupabaseStore() {
  const BASE = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;
  const headers = {
    apikey: process.env.SUPABASE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
    'content-type': 'application/json',
  };

  async function request(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...options.headers } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Supabase REST error ${res.status} on ${path}: ${text.slice(0, 300)}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  function listAll(table, { orderBy } = {}) {
    const order = orderBy ? `&order=${encodeURIComponent(toPostgrestOrder(orderBy))}` : '';
    return request(`/${table}?select=*${order}`);
  }

  async function getById(table, id) {
    const rows = await request(`/${table}?select=*&id=eq.${encodeURIComponent(id)}`);
    return rows[0] || null;
  }

  function getWhere(table, filters = {}, { orderBy } = {}) {
    const filterParams = Object.entries(filters)
      .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
      .join('&');
    const order = orderBy ? `&order=${encodeURIComponent(toPostgrestOrder(orderBy))}` : '';
    const qs = [filterParams, order.replace(/^&/, '')].filter(Boolean).join('&');
    return request(`/${table}?select=*${qs ? '&' + qs : ''}`);
  }

  async function insert(table, data) {
    const rows = await request(`/${table}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(data),
    });
    return rows[0];
  }

  async function update(table, id, data) {
    const rows = await request(`/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(data),
    });
    return rows[0];
  }

  async function count(table, filters = {}) {
    const rows = await getWhere(table, filters);
    return rows.length;
  }

  async function getSetting(key) {
    const rows = await request(`/settings?select=value&key=eq.${encodeURIComponent(key)}`);
    return rows[0] ? rows[0].value : null;
  }

  async function setSetting(key, value) {
    await request('/settings', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key, value }),
    });
  }

  return { backend: 'supabase', listAll, getById, getWhere, insert, update, count, getSetting, setSetting };
}

const store = USE_SUPABASE ? buildSupabaseStore() : buildSqliteStore();

module.exports = { store };
