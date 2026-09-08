const { layout } = require('../lib/layout');
const { escapeHtml } = require('../lib/render');
const { readFormBody, redirect } = require('../lib/http');
const { getAiConfig, saveAiConfig, PROVIDERS } = require('../lib/ai');
const { store } = require('../lib/store');

const PROVIDER_LABELS = { anthropic: 'Anthropic (Claude)', openai: 'OpenAI (GPT)' };

async function handleSettingsPage(req, res, { sendHtml }, flash) {
  const { provider, key } = await getAiConfig();
  const maskedKey = key ? `•••• ${key.slice(-4)}` : null;

  const providerOptions = PROVIDERS.map(
    (p) => `<option value="${p}" ${p === provider ? 'selected' : ''}>${PROVIDER_LABELS[p]}</option>`
  ).join('');

  const body = `
    <h1 class="text-2xl font-bold mb-2">Settings</h1>
    <p class="text-sm text-slate-600 mb-6">
      This tool doesn't come tied to any one AI account. Pick whichever provider you already use, paste in your own API key, and receipt parsing turns on immediately.
    </p>

    <div class="bg-white rounded-lg border border-slate-200 p-6 max-w-lg">
      <h2 class="font-semibold mb-4">AI provider</h2>
      <form method="post" action="/settings/ai" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Provider</label>
          <select name="provider" class="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            ${providerOptions}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">API key</label>
          <input type="password" name="key" placeholder="${
            maskedKey ? 'Currently set: ' + escapeHtml(maskedKey) + ' — paste a new key to replace it' : 'sk-... or your provider\'s key'
          }"
            class="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          <p class="text-xs text-slate-500 mt-1">
            Anthropic keys come from console.anthropic.com. OpenAI keys come from platform.openai.com.
            Stored in this tool's own database — never sent anywhere except that provider's API.
          </p>
        </div>
        <button class="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700">Save</button>
      </form>
      ${
        key
          ? `<div class="mt-4 text-sm text-emerald-700">✓ AI receipt parsing is on (${escapeHtml(
              PROVIDER_LABELS[provider]
            )}, key ending ${escapeHtml(key.slice(-4))}).</div>`
          : `<div class="mt-4 text-sm text-amber-700">AI receipt parsing is off until a key is added.</div>`
      }
    </div>

    <h2 class="text-lg font-semibold mt-8 mb-3">Data backend</h2>
    <div class="bg-white rounded-lg border border-slate-200 p-4 max-w-lg text-sm text-slate-700">
      Currently using: <strong>${store.backend === 'supabase' ? 'Supabase (cloud)' : 'Local SQLite'}</strong>.
      ${
        store.backend === 'supabase'
          ? 'Data lives in your Supabase project, so it stays in sync from any machine that runs this app.'
          : "Data lives in this machine's data/app.db file only. Set SUPABASE_URL and SUPABASE_KEY in .env to switch to Supabase."
      }
    </div>
  `;

  sendHtml(res, layout({ title: 'Settings', activePath: '/settings', body, flash }));
}

async function handleSettingsAiUpdate(req, res) {
  const form = await readFormBody(req);
  await saveAiConfig({ provider: form.provider, key: form.key ? form.key.trim() : null });
  redirect(res, '/settings?flash=' + encodeURIComponent('Settings saved.'));
}

module.exports = { handleSettingsPage, handleSettingsAiUpdate };
