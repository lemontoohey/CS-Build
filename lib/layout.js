const { escapeHtml } = require('./render');
const { IRONCOVE_LOGO_DATA_URI } = require('./branding');

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/budget', label: 'Budget' },
  { href: '/materials', label: 'Materials' },
  { href: '/calculators', label: 'Calculators' },
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
      ? 'text-white bg-[#4f6070]'
      : 'text-slate-600 hover:bg-[#4f6070] hover:text-white';
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
  <title>${escapeHtml(title)} — CS Build</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Lato', ui-sans-serif, system-ui, sans-serif; }
  </style>
</head>
<body class="bg-[#f9f9f9] text-[#3d4c5a] min-h-screen">
  <nav class="bg-white border-b border-slate-200">
    <div class="max-w-5xl mx-auto px-4">
      <div class="flex items-center justify-between h-20 gap-4">
        <div class="flex flex-col justify-center leading-tight">
          <span class="font-black text-xl tracking-wide text-[#3d4c5a]">CS Build</span>
          <span class="text-xs font-medium text-slate-500 tracking-wide">Iron Cove Construction</span>
        </div>
        <div class="flex items-center gap-5">
          <div class="flex gap-1 flex-wrap justify-end">
            ${navHtml}
          </div>
          <img src="${IRONCOVE_LOGO_DATA_URI}" alt="Iron Cove Construction" class="h-9 w-auto hidden sm:block shrink-0" />
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
