const { escapeHtml } = require('./render');
const { IRONCOVE_LOGO_DATA_URI } = require('./branding');
const { COLORS } = require('./theme');

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
      ? `text-white bg-[${COLORS.brandBlue}]`
      : `text-slate-600 hover:bg-[${COLORS.brandBlue}] hover:text-white`;
    return `<a href="${item.href}" class="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${cls}">${escapeHtml(
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
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&family=Roboto+Slab:wght@700;900&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Lato', ui-sans-serif, system-ui, sans-serif; }
    /* Matches the slab-serif lettering in Iron Cove's own logo. */
    .brand-mark { font-family: 'Roboto Slab', serif; }
    @media (prefers-reduced-motion: reduce) {
      #bg-particles { display: none; }
    }
  </style>
</head>
<body class="bg-[#f9f9f9] text-[${COLORS.bodyText}] min-h-screen">
  <canvas id="bg-particles" aria-hidden="true" class="fixed inset-0 -z-10 pointer-events-none"></canvas>
  <nav class="bg-white border-b border-slate-200">
    <div class="max-w-5xl mx-auto px-4">
      <div class="flex items-center justify-between h-20 gap-4">
        <div class="flex items-center">
          <span class="brand-mark font-black text-2xl uppercase tracking-wide text-[${COLORS.brandBlue}]">CS Build</span>
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
  <script>
    (function () {
      // Ambient background texture: three depth layers of soft grey dots,
      // drifting slowly, with each layer shifting a different amount as you
      // scroll (a small parallax). Modelled on the 3-tier violet particle
      // shader in Liam's Camille_website project, just done in plain
      // canvas 2D with greys instead of a WebGL shader, since this app
      // stays zero-dependency. Purely decorative — sits behind the white
      // content cards, never over them.
      var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var canvas = document.getElementById('bg-particles');
      if (!canvas || reduceMotion) return;
      var ctx = canvas.getContext('2d');
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resize() {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
      }
      resize();
      window.addEventListener('resize', resize);

      // Far -> near: smaller/slower/fainter to larger/faster/slightly stronger.
      var LAYERS = [
        { count: 14, minR: 1,   maxR: 2,   drift: 0.010, parallax: 0.02, color: 'rgba(148,155,163,0.10)' },
        { count: 10, minR: 2,   maxR: 3.5, drift: 0.018, parallax: 0.05, color: 'rgba(126,134,143,0.10)' },
        { count: 6,  minR: 3,   maxR: 5,   drift: 0.028, parallax: 0.09, color: 'rgba(105,114,124,0.09)' },
      ];
      var layers = LAYERS.map(function (def) {
        var points = [];
        for (var i = 0; i < def.count; i++) {
          points.push({ x: Math.random(), y: Math.random(), wobble: Math.random() * Math.PI * 2 });
        }
        return { def: def, points: points };
      });

      var scrollY = window.scrollY || 0;
      window.addEventListener(
        'scroll',
        function () {
          scrollY = window.scrollY || 0;
        },
        { passive: true }
      );

      var start = null;
      function frame(ts) {
        if (!start) start = ts;
        var t = (ts - start) * 0.001;
        var w = canvas.width;
        var h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        layers.forEach(function (layer) {
          ctx.fillStyle = layer.def.color;
          layer.points.forEach(function (p) {
            var yDrift = (p.y - t * layer.def.drift - (scrollY * layer.def.parallax) / h) % 1;
            if (yDrift < 0) yDrift += 1;
            var xDrift = p.x + Math.sin(t * 0.15 + p.wobble) * 0.01;
            var r = (layer.def.minR + (layer.def.maxR - layer.def.minR) * p.wobble / (Math.PI * 2)) * dpr;
            ctx.beginPath();
            ctx.arc(xDrift * w, yDrift * h, r, 0, Math.PI * 2);
            ctx.fill();
          });
        });
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    })();
  </script>
</body>
</html>`;
}

module.exports = { layout };
