(function () {
  var boot = window.PLAN_MEASURE_BOOT;
  if (!boot) return;

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  var canvas = document.getElementById('planCanvas');
  var ctx = canvas.getContext('2d');
  var hint = document.getElementById('measureHint');
  var listEl = document.getElementById('measureList');
  var totalsEl = document.getElementById('measureTotals');
  var scaleLabelEl = document.getElementById('scaleLabel');

  var state = {
    tool: 'pan',
    color: '#9b1b15',
    depthM: 0.3,
    zoom: 1,
    pan: { x: 20, y: 20 },
    page: 1,
    pageCount: 1,
    ppm: boot.sheet && boot.sheet.pixels_per_metre ? Number(boot.sheet.pixels_per_metre) : 0,
    scaleLabel: (boot.sheet && boot.sheet.scale_label) || '',
    measurements: boot.measurements || [],
    draft: [],
    dragging: false,
    last: null,
    bitmap: null,
    natural: { w: 0, h: 0 },
    selectedId: null,
    calibrating: false,
  };

  function resize() {
    var parent = canvas.parentElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    canvas.style.width = parent.clientWidth + 'px';
    canvas.style.height = parent.clientHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function toWorld(ev) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left - state.pan.x) / state.zoom,
      y: (ev.clientY - rect.top - state.pan.y) / state.zoom,
    };
  }

  function dist(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function pathLength(pts) {
    var n = 0;
    for (var i = 1; i < pts.length; i++) n += dist(pts[i - 1], pts[i]);
    return n;
  }

  function polygonArea(pts) {
    var a = 0;
    for (var i = 0; i < pts.length; i++) {
      var j = (i + 1) % pts.length;
      a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(a) / 2;
  }

  function metres(px) {
    return state.ppm ? px / state.ppm : 0;
  }

  function areaM2(px2) {
    return state.ppm ? px2 / (state.ppm * state.ppm) : 0;
  }

  function round3(n) {
    return Math.round(n * 1000) / 1000;
  }

  function parsePoints(m) {
    if (Array.isArray(m.points)) return m.points;
    try {
      return JSON.parse(m.points_json || '[]');
    } catch (e) {
      return [];
    }
  }

  function setHint() {
    if (!state.ppm) {
      hint.textContent = 'Set a common scale, or click Calibrate and draw a line over a known dimension on the plan.';
      return;
    }
    var msgs = {
      pan: 'Drag to pan. Wheel zooms.',
      line: 'Click along a run. Double-click or Enter to finish the length.',
      rect: 'Click two opposite corners of a rectangle.',
      polygon: 'Click around an area. Double-click or Enter to close.',
      volume: 'Trace the plan area (like Area), then depth (right) is multiplied to get m³.',
      count: 'Click each item to count.',
      deduct: 'Trace an opening (door, window, stair void) to subtract area.',
    };
    if (state.calibrating) {
      hint.textContent = 'Click two points on a known dimension, then enter its real length in metres.';
      return;
    }
    hint.textContent = msgs[state.tool] || '';
  }

  function updateScaleLabel() {
    scaleLabelEl.textContent = state.ppm
      ? (state.scaleLabel || 'Calibrated') + '  ·  ' + round3(state.ppm) + ' px/m'
      : 'Not scaled';
  }

  function drawMeasurement(m, preview) {
    var pts = parsePoints(m);
    if (!pts.length) return;
    ctx.strokeStyle = m.color || '#9b1b15';
    ctx.fillStyle = m.color || '#9b1b15';
    ctx.lineWidth = 2 / state.zoom;
    ctx.globalAlpha = preview ? 0.85 : 0.95;
    var kind = m.kind;
    if (kind === 'count') {
      pts.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 / state.zoom, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (kind === 'line') {
      ctx.beginPath();
      pts.forEach(function (p, i) {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    } else {
      ctx.beginPath();
      pts.forEach(function (p, i) {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      if (kind !== 'line' && pts.length > 2) ctx.closePath();
      ctx.globalAlpha = 0.18;
      ctx.fill();
      ctx.globalAlpha = preview ? 0.85 : 0.95;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    var last = pts[pts.length - 1];
    if (last && m.quantity != null) {
      ctx.save();
      ctx.font = 12 / state.zoom + 'px Lato, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(round3(m.quantity) + ' ' + (m.unit || ''), last.x + 8 / state.zoom, last.y - 8 / state.zoom);
      ctx.restore();
    }
  }

  function draw() {
    var cssW = canvas.clientWidth;
    var cssH = canvas.clientHeight;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var dpr = canvas.width / cssW;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.translate(state.pan.x, state.pan.y);
    ctx.scale(state.zoom, state.zoom);
    if (state.bitmap) ctx.drawImage(state.bitmap, 0, 0);
    state.measurements.forEach(function (m) {
      drawMeasurement(m, false);
    });
    if (state.draft.length) {
      drawMeasurement(
        { kind: state.calibrating ? 'line' : state.tool === 'count' ? 'count' : state.tool === 'line' ? 'line' : 'polygon', color: state.color, points: state.draft, quantity: null, unit: '' },
        true
      );
    }
    ctx.restore();
  }

  function renderList() {
    if (!state.measurements.length) {
      listEl.innerHTML = '<p class="text-xs text-slate-500">Nothing measured yet.</p>';
      totalsEl.textContent = '';
      return;
    }
    listEl.innerHTML = state.measurements
      .map(function (m) {
        var sel = String(m.id) === String(state.selectedId) ? ' ring-2 ring-slate-400' : '';
        return (
          '<div class="rounded border border-slate-200 p-2 cursor-pointer' +
          sel +
          '" data-id="' +
          m.id +
          '">' +
          '<div class="flex justify-between gap-2">' +
          '<span class="font-medium">' +
          escapeHtml(m.label) +
          '</span>' +
          '<span>' +
          round3(m.quantity) +
          ' ' +
          escapeHtml(m.unit) +
          '</span></div>' +
          '<div class="text-[11px] text-slate-500 mt-1">' +
          escapeHtml(m.kind) +
          (m.boq_item_id ? ' · in materials' : '') +
          '</div>' +
          '<button type="button" data-del="' +
          m.id +
          '" class="text-[11px] text-red-700 mt-1">Remove</button>' +
          '</div>'
        );
      })
      .join('');
    var totals = {};
    state.measurements.forEach(function (m) {
      totals[m.unit] = (totals[m.unit] || 0) + Number(m.quantity);
    });
    totalsEl.textContent = Object.keys(totals)
      .map(function (u) {
        return round3(totals[u]) + ' ' + u;
      })
      .join('  ·  ');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function saveMeasurement(payload) {
    var res = await fetch('/api/plan-measure/measurements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.assign({ document_id: boot.documentId, page_number: state.page }, payload)),
    });
    var data = await res.json();
    if (data.ok) {
      state.measurements.push(data.measurement);
      state.draft = [];
      renderList();
      draw();
    } else {
      hint.textContent = data.error || 'Could not save measurement.';
    }
  }

  function finishDraft() {
    if (state.calibrating) {
      if (state.draft.length < 2) return;
      var px = dist(state.draft[0], state.draft[1]);
      var real = parseFloat(window.prompt('Real-world length of that line, in metres?', '10'));
      if (!real || real <= 0) {
        state.calibrating = false;
        state.draft = [];
        setHint();
        draw();
        return;
      }
      state.ppm = px / real;
      state.scaleLabel = 'Calibrated (' + real + ' m)';
      state.calibrating = false;
      state.draft = [];
      fetch('/api/plan-measure/scale', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          document_id: boot.documentId,
          page_number: state.page,
          scale_label: state.scaleLabel,
          pixels_per_metre: state.ppm,
        }),
      });
      updateScaleLabel();
      setHint();
      draw();
      return;
    }

    if (!state.ppm && state.tool !== 'count' && state.tool !== 'pan') {
      hint.textContent = 'Scale the plan first — Calibrate is the accurate option.';
      return;
    }

    var pts = state.draft.slice();
    var kind = state.tool;
    var label = kind;
    var quantity = 0;
    var unit = '';
    var depth = parseFloat(document.getElementById('depthInput').value) || state.depthM;

    if (kind === 'line') {
      if (pts.length < 2) return;
      quantity = round3(metres(pathLength(pts)));
      unit = 'lm';
      label = 'Length';
    } else if (kind === 'rect') {
      if (pts.length < 2) return;
      var a = pts[0];
      var b = pts[1];
      pts = [
        { x: a.x, y: a.y },
        { x: b.x, y: a.y },
        { x: b.x, y: b.y },
        { x: a.x, y: b.y },
      ];
      quantity = round3(areaM2(polygonArea(pts)));
      unit = 'm2';
      label = 'Area';
      kind = 'rect';
    } else if (kind === 'polygon' || kind === 'deduct') {
      if (pts.length < 3) return;
      quantity = round3(areaM2(polygonArea(pts)));
      if (kind === 'deduct') quantity = -quantity;
      unit = 'm2';
      label = kind === 'deduct' ? 'Deduction' : 'Area';
    } else if (kind === 'volume') {
      if (pts.length < 3) return;
      quantity = round3(areaM2(polygonArea(pts)) * depth);
      unit = 'm3';
      label = 'Volume';
    } else if (kind === 'count') {
      if (!pts.length) return;
      quantity = pts.length;
      unit = 'ea';
      label = 'Count';
    } else {
      return;
    }

    var typed = window.prompt('Label this measurement', label);
    if (typed === null) {
      state.draft = [];
      draw();
      return;
    }
    saveMeasurement({
      kind: kind,
      label: typed || label,
      quantity: quantity,
      unit: unit,
      color: state.color,
      depth_m: kind === 'volume' ? depth : null,
      points: pts,
      category_id: document.getElementById('categorySelect').value,
    });
  }

  canvas.addEventListener('mousedown', function (ev) {
    var w = toWorld(ev);
    if (state.tool === 'pan' && !state.calibrating) {
      state.dragging = true;
      state.last = { x: ev.clientX, y: ev.clientY };
      return;
    }
    if (state.calibrating) {
      state.draft.push(w);
      if (state.draft.length >= 2) finishDraft();
      else draw();
      return;
    }
    if (state.tool === 'count') {
      state.draft.push(w);
      finishDraft();
      return;
    }
    if (state.tool === 'rect') {
      state.draft.push(w);
      if (state.draft.length >= 2) finishDraft();
      else draw();
      return;
    }
    state.draft.push(w);
    draw();
  });

  canvas.addEventListener('mousemove', function (ev) {
    if (state.dragging && state.last) {
      state.pan.x += ev.clientX - state.last.x;
      state.pan.y += ev.clientY - state.last.y;
      state.last = { x: ev.clientX, y: ev.clientY };
      draw();
    }
  });

  window.addEventListener('mouseup', function () {
    state.dragging = false;
    state.last = null;
  });

  canvas.addEventListener(
    'wheel',
    function (ev) {
      ev.preventDefault();
      var w = toWorld(ev);
      var factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
      var next = Math.min(8, Math.max(0.2, state.zoom * factor));
      state.pan.x = ev.clientX - canvas.getBoundingClientRect().left - w.x * next;
      state.pan.y = ev.clientY - canvas.getBoundingClientRect().top - w.y * next;
      state.zoom = next;
      draw();
    },
    { passive: false }
  );

  canvas.addEventListener('dblclick', function (ev) {
    ev.preventDefault();
    finishDraft();
  });

  window.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') finishDraft();
    if (ev.key === 'Escape') {
      state.draft = [];
      state.calibrating = false;
      setHint();
      draw();
    }
  });

  document.getElementById('undoBtn').addEventListener('click', function () {
    state.draft.pop();
    draw();
  });

  document.getElementById('calibrateBtn').addEventListener('click', function () {
    state.calibrating = true;
    state.draft = [];
    setHint();
  });

  document.getElementById('commonScale').addEventListener('change', function (ev) {
    var n = parseFloat(ev.target.value);
    if (!n) return;
    // Assume the PDF/image is a full-size print. PDFs are rendered at 2× (144 px/in).
    var dpi = state.renderDpi || 72;
    state.ppm = dpi / (n * 0.0254);
    state.scaleLabel = '1:' + n + ' (72 dpi print)';
    fetch('/api/plan-measure/scale', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        document_id: boot.documentId,
        page_number: state.page,
        scale_label: state.scaleLabel,
        pixels_per_metre: state.ppm,
      }),
    });
    updateScaleLabel();
    setHint();
  });

  document.getElementById('colorInput').addEventListener('input', function (ev) {
    state.color = ev.target.value;
  });

  document.querySelectorAll('.tool-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.tool = btn.getAttribute('data-tool');
      state.draft = [];
      document.querySelectorAll('.tool-btn').forEach(function (b) {
        b.classList.remove('bg-[#4f6070]', 'text-white');
        b.classList.add('bg-white');
      });
      btn.classList.add('bg-[#4f6070]', 'text-white');
      btn.classList.remove('bg-white');
      canvas.style.cursor = state.tool === 'pan' ? 'grab' : 'crosshair';
      setHint();
      draw();
    });
  });
  var firstTool = document.querySelector('.tool-btn[data-tool="pan"]');
  if (firstTool) firstTool.click();

  listEl.addEventListener('click', async function (ev) {
    var del = ev.target.getAttribute('data-del');
    if (del) {
      await fetch('/api/plan-measure/measurements/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: Number(del) || del }),
      });
      state.measurements = state.measurements.filter(function (m) {
        return String(m.id) !== String(del);
      });
      renderList();
      draw();
      return;
    }
    var row = ev.target.closest('[data-id]');
    if (row) {
      state.selectedId = row.getAttribute('data-id');
      renderList();
    }
  });

  document.getElementById('sendAllBtn').addEventListener('click', async function () {
    var ids = state.measurements.map(function (m) {
      return m.id;
    });
    if (!ids.length) return;
    var res = await fetch('/api/plan-measure/send-to-materials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: ids, category_id: document.getElementById('categorySelect').value }),
    });
    var data = await res.json();
    if (data.ok) window.location.href = '/materials?flash=' + encodeURIComponent(data.count + ' measurements added to Materials.');
  });

  document.getElementById('toFormulateBtn').addEventListener('click', function () {
    var recipe = document.getElementById('recipeSelect').value;
    var selected = state.measurements.find(function (m) {
      return String(m.id) === String(state.selectedId);
    }) || state.measurements[0];
    if (!selected) {
      hint.textContent = 'Measure something first, then send its quantity into a recipe.';
      return;
    }
    var params = new URLSearchParams({ recipe: recipe, qty: String(selected.quantity), unit: selected.unit || '' });
    if ((selected.unit || '') === 'lm' || (selected.unit || '') === 'm') params.set('beam', String(selected.quantity));
    if ((selected.unit || '') === 'm2') params.set('area', String(selected.quantity));
    window.location.href = '/formulate?' + params.toString();
  });

  async function loadPlan() {
    var mime = (boot.mime || '').toLowerCase();
    if (mime.includes('pdf') && window.pdfjsLib) {
      var pdf = await pdfjsLib.getDocument(boot.fileUrl).promise;
      state.pageCount = pdf.numPages;
      var page = await pdf.getPage(state.page);
      var viewport = page.getViewport({ scale: 2 });
      var off = document.createElement('canvas');
      off.width = viewport.width;
      off.height = viewport.height;
      await page.render({ canvasContext: off.getContext('2d'), viewport: viewport }).promise;
      state.bitmap = off;
      state.natural = { w: off.width, h: off.height };
      state.renderDpi = 144;
    } else {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise(function (resolve, reject) {
        img.onload = resolve;
        img.onerror = reject;
        img.src = boot.fileUrl;
      });
      state.bitmap = img;
      state.natural = { w: img.naturalWidth, h: img.naturalHeight };
      state.renderDpi = 72;
    }
    var parent = canvas.parentElement;
    if (state.natural.w) {
      state.zoom = Math.min(parent.clientWidth / state.natural.w, parent.clientHeight / state.natural.h, 1.2);
    }
    resize();
  }

  window.addEventListener('resize', resize);
  updateScaleLabel();
  setHint();
  renderList();
  loadPlan().catch(function (err) {
    hint.textContent = 'Could not load that plan: ' + err.message;
  });
})();
