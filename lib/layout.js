const { escapeHtml } = require('./render');

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/budget', label: 'Budget' },
  { href: '/materials', label: 'Materials' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/trades', label: 'Trades' },
  { href: '/compliance', label: 'Compliance' },
  { href: '/documents', label: 'Documents' },
  { href: '/diary', label: 'Site diary' },
  { href: '/settings', label: 'Settings' },
];

function layout({ title, activePath, body, flash }) {
  const navHtml = NAV_ITEMS.map((item) => {
    const isActive = item.href === activePath;
    const cls = isActive
      ? 'text-white bg-slate-800'
      : 'text-slate-200 hover:bg-slate-800 hover:text-white';
    return `<a href="${item.href}" class="px-3 py-2 rounded-md text-sm font-medium ${cls}">${escapeHtml(
      item.label
    )}</a>`;
  }).join('\n');

  const flashHtml = flash
    ? `<div class="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 text-sm">${escapeHtml(
        flash
      )}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — House Cooper Build Tool</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <nav class="bg-slate-900">
    <div class="max-w-5xl mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-2">
          <span class="text-white font-semibold text-lg">🏗️ House Cooper</span>
        </div>
        <div class="flex gap-1 flex-wrap justify-end">
          ${navHtml}
        </div>
      </div>
    </div>
  </nav>
  <main class="max-w-5xl mx-auto px-4 py-8">
    ${flashHtml}
    ${body}
  </main>
  <footer class="max-w-5xl mx-auto px-4 pb-10 text-xs text-slate-400">
    Phase 1 build tracker — not a substitute for your quantity surveyor, structural engineer, accountant, or certifier.
  </footer>
</body>
</html>`;
}

module.exports = { layout };
