const { store } = require('../lib/store');
const { layout } = require('../lib/layout');
const { escapeHtml, todayIso } = require('../lib/render');
const { readFormBody, redirect } = require('../lib/http');

async function handleDiaryPage(req, res, { sendHtml }, flash) {
  const allEntries = await store.listAll('diary_entries');
  const entries = [...allEntries].sort((a, b) => {
    if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  });

  const entryCards = entries
    .map(
      (e) => `<div class="bg-white rounded-lg border border-slate-200 p-4 mb-3">
        <div class="flex items-center justify-between mb-1">
          <span class="font-semibold">${escapeHtml(e.entry_date)}</span>
          ${e.weather ? `<span class="text-xs text-slate-500">${escapeHtml(e.weather)}</span>` : ''}
        </div>
        ${
          e.trades_present
            ? `<div class="text-sm text-slate-600 mb-1"><strong>Trades:</strong> ${escapeHtml(e.trades_present)}</div>`
            : ''
        }
        ${e.work_done ? `<div class="text-sm mb-1">${escapeHtml(e.work_done)}</div>` : ''}
        ${
          e.issues
            ? `<div class="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mt-2">⚠ ${escapeHtml(
                e.issues
              )}</div>`
            : ''
        }
      </div>`
    )
    .join('\n');

  const body = `
    <h1 class="text-2xl font-bold mb-6">Site diary</h1>

    <h2 class="text-lg font-semibold mb-3">New entry</h2>
    <form method="post" action="/diary" class="bg-white rounded-lg border border-slate-200 p-6 max-w-lg space-y-4 mb-10">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Date</label>
          <input type="date" name="entry_date" value="${todayIso()}" required
            class="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Weather</label>
          <input type="text" name="weather" placeholder="e.g. Fine, 24°C"
            class="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Trades on site</label>
        <input type="text" name="trades_present" placeholder="e.g. Framer, electrician rough-in"
          class="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Work done today</label>
        <textarea name="work_done" rows="3" class="w-full rounded border border-slate-300 px-3 py-2 text-sm"></textarea>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Issues / delays (leave blank if none)</label>
        <textarea name="issues" rows="2" class="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="e.g. Concrete pour delayed a day — truck no-show"></textarea>
      </div>
      <button class="bg-[#4f6070] text-white px-4 py-2 rounded text-sm hover:bg-[#3d4c5a]">Save entry</button>
    </form>

    <h2 class="text-lg font-semibold mb-3">History</h2>
    ${entryCards || '<p class="text-sm text-slate-500">No entries yet.</p>'}
  `;

  sendHtml(res, layout({ title: 'Site diary', activePath: '/diary', body, flash }));
}

async function handleDiaryCreate(req, res) {
  const form = await readFormBody(req);
  await store.insert('diary_entries', {
    entry_date: form.entry_date,
    weather: form.weather || null,
    trades_present: form.trades_present || null,
    work_done: form.work_done || null,
    issues: form.issues || null,
    created_at: new Date().toISOString(),
  });
  redirect(res, '/diary?flash=' + encodeURIComponent('Diary entry saved.'));
}

module.exports = { handleDiaryPage, handleDiaryCreate };
