const { store } = require('../lib/store');
const { layout } = require('../lib/layout');
const { escapeHtml, todayIso } = require('../lib/render');
const { readFormBody, redirect } = require('../lib/http');

const STATUSES = ['not_started', 'in_progress', 'done'];
const STATUS_LABELS = { not_started: 'Not started', in_progress: 'In progress', done: 'Done' };

function stageBadge(stage) {
  const today = todayIso();
  if (stage.status === 'done') {
    const late = stage.actual_end && stage.planned_end && stage.actual_end > stage.planned_end;
    return late
      ? '<span class="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">Done (late)</span>'
      : '<span class="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Done</span>';
  }
  if (stage.planned_end && today > stage.planned_end) {
    return '<span class="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Overdue</span>';
  }
  if (stage.status === 'in_progress') {
    return '<span class="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">In progress</span>';
  }
  return '<span class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">Not started</span>';
}

async function handleSchedulePage(req, res, { sendHtml }, flash) {
  const stages = await store.listAll('schedule_stages', { orderBy: 'sort_order' });

  const rows = stages
    .map((s) => {
      const statusOptions = STATUSES.map(
        (st) => `<option value="${st}" ${st === s.status ? 'selected' : ''}>${STATUS_LABELS[st]}</option>`
      ).join('');

      return `<form method="post" action="/schedule/update" class="bg-white rounded-lg border border-slate-200 p-4 mb-3">
        <input type="hidden" name="stage_id" value="${s.id}" />
        <div class="flex items-center justify-between mb-3">
          <span class="font-semibold">${escapeHtml(s.name)}</span>
          ${stageBadge(s)}
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <div>
            <label class="block text-xs text-slate-500 mb-1">Planned start</label>
            <input type="date" name="planned_start" value="${s.planned_start || ''}"
              class="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Planned end</label>
            <input type="date" name="planned_end" value="${s.planned_end || ''}"
              class="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Actual start</label>
            <input type="date" name="actual_start" value="${s.actual_start || ''}"
              class="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Actual end</label>
            <input type="date" name="actual_end" value="${s.actual_end || ''}"
              class="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Status</label>
            <select name="status" class="w-full rounded border border-slate-300 px-2 py-1 text-sm">
              ${statusOptions}
            </select>
          </div>
        </div>
        <div class="mt-3">
          <input type="text" name="notes" value="${escapeHtml(s.notes || '')}" placeholder="Notes (optional)"
            class="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
        </div>
        <div class="mt-3">
          <button class="text-sm bg-[#9b1b15] transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] text-white px-3 py-1 rounded hover:bg-[#7a1611]">Save</button>
        </div>
      </form>`;
    })
    .join('\n');

  const body = `
    <h1 class="text-2xl font-bold mb-2">Schedule</h1>
    <p class="text-sm text-slate-600 mb-6">Planned vs. actual dates per stage. "Overdue" means today is past the planned end date and the stage isn't marked done yet.</p>
    ${rows}
  `;

  sendHtml(res, layout({ title: 'Schedule', activePath: '/schedule', body, flash }));
}

async function handleScheduleUpdate(req, res) {
  const form = await readFormBody(req);
  const status = STATUSES.includes(form.status) ? form.status : 'not_started';
  await store.update('schedule_stages', Number(form.stage_id), {
    planned_start: form.planned_start || null,
    planned_end: form.planned_end || null,
    actual_start: form.actual_start || null,
    actual_end: form.actual_end || null,
    status,
    notes: form.notes || null,
  });
  redirect(res, '/schedule?flash=' + encodeURIComponent('Schedule updated.'));
}

module.exports = { handleSchedulePage, handleScheduleUpdate };
