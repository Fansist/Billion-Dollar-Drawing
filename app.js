/* ============================================================
   The Billion Dollar Drawing — engine
   100,000,000 pixels @ $0.01 = $1,000,000 max  (0.1% of a billion)
   Sparse storage + viewport rendering so 100M cells stay fast.
   ============================================================ */
(() => {
"use strict";

/* ---------- constants ---------- */
const GRID = 10000;                 // 10,000 x 10,000 = 100,000,000 pixels
const PRICE = 0.01;                 // one cent per pixel
const TOTAL_PIXELS = GRID * GRID;   // 100,000,000
const MAX_RAISE = TOTAL_PIXELS * PRICE; // $1,000,000
const BILLION = 1_000_000_000;
const STORE_KEY = "bdd_v1";
const ART_CAP = 100;                // max W/H for hand-painting
const PALETTE = ["#f5c518","#ff5c7a","#9b5cff","#36c2ff","#7ee787",
                 "#ff7a59","#ffd95a","#ffffff","#2b2b3a","#59c2ff"];

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const fmtInt = (n) => n.toLocaleString("en-US");
const fmtMoney = (n) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function pctOfBillion(raised) {
  const pct = (raised / BILLION) * 100;
  if (pct === 0) return "0%";
  if (pct >= 0.01) return pct.toFixed(2) + "%";
  return pct.toFixed(8).replace(/0+$/, "") + "%"; // lots of adorable zeros
}
function rel(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 45) return "just now";
  if (s < 90) return "1 min ago";
  if (s < 3600) return Math.round(s / 60) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  return Math.round(s / 86400) + "d ago";
}
const intersects = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function safeUrl(u) {
  if (!u) return "";
  try {
    const url = new URL(u);
    return (url.protocol === "http:" || url.protocol === "https:") ? url.href : "";
  } catch { return ""; }
}

/* ---------- seed data (so the canvas isn't a lonely void) ---------- */
function seedRegions() {
  const now = Date.now();
  const raw = [
    [180,160,420,260,"#ff5c7a","Definitely Not A Scam Coin","To the moon (legally distinct from other moons)"],
    [1200,520,300,300,"#9b5cff","Elon's Spare Shoe","Size 11. Surprisingly sentient."],
    [2200,1500,260,180,"#4fd1c5","Your Startup Here","Pre-seed. Pre-revenue. Pre-idea."],
    [3300,400,360,360,"#f5a623","Grandma's Cookie Empire","First one's free. The rest are emotional."],
    [4200,1700,500,140,"#36c2ff","We Buy Any Pixel","Cash for squares. No questions."],
    [900,2600,220,220,"#2b2b3a","The Void (Sponsored)","Stare back. It's in the contract."],
    [5200,700,300,420,"#7ee787","Crypto Llama","Spits. Stakes. Survives."],
    [6100,2100,420,260,"#c9d1d9","Definitely The FBI","Nothing to see here, citizen."],
    [7000,600,360,360,"#ff7a59","Linktree but worse","All my links. None of them work."],
    [8000,1800,260,260,"#f5c518","Pixel Real Estate Co.","Location, location, 1 location."],
    [3000,3200,300,300,"#ff4d4d","My Other Pixel Is A Ferrari","This one is not the Ferrari."],
    [8700,3400,400,400,"#8892b0","404 Brand Not Found","The brand you're looking for moved out."],
    [1600,4200,300,200,"#ffd95a","Tiny Ad Big Dreams","Visible from approximately 4cm away."],
    [5400,4600,520,300,"#ffb3c1","Cat Tax","Payment due in cats. Daily."],
    [5,5,4,4,"#ffffff","Pixel #1 (Historic)","Where it all began. Very small. Very proud."],
    [6800,5200,520,300,"#59c2ff","Insert Brand Synergy","We leverage paradigms at scale."],
    [2600,5600,360,240,"#7ee787","Area 51 Gift Shop","Now selling: plausible deniability."],
    [4000,6400,300,300,"#f5a623","Sourdough Starter Inc","Older than your mortgage."],
  ];
  return raw.map((r, i) => ({
    id: "seed-" + i,
    x: r[0], y: r[1], w: r[2], h: r[3],
    fill: r[4], art: null,
    owner: r[5], message: r[6], url: "",
    ts: now - (i + 2) * 5400000,
  }));
}

/* ---------- state ---------- */
let regions = [];
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { regions = JSON.parse(raw); if (Array.isArray(regions)) return; }
  } catch { /* ignore */ }
  regions = seedRegions();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(regions)); }
  catch { addToast("⚠ Browser storage full — your masterpiece may not persist."); }
}

/* ---------- DOM refs ---------- */
const wrap = $("canvasWrap");
const canvas = $("canvas");
const ctx = canvas.getContext("2d");
const confetti = $("confetti");
const cctx = confetti.getContext("2d");
const minimap = $("minimap");
const mmctx = minimap.getContext("2d");
const minimapView = $("minimapView");
const coordReadout = $("coordReadout");
const zoomReadout = $("zoomReadout");
const hoverCard = $("hoverCard");

/* ---------- view ---------- */
let dpr = 1, cw = 0, ch = 0, fitScale = 0.06;
const view = { scale: 0.06, ox: 0, oy: 0 };
let userInteracted = false;
const minScale = () => fitScale * 0.85;
const MAXSCALE = 64;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  cw = rect.width; ch = rect.height;
  dpr = window.devicePixelRatio || 1;
  for (const c of [canvas, confetti]) {
    c.width = Math.round(cw * dpr);
    c.height = Math.round(ch * dpr);
  }
  fitScale = Math.min(cw, ch) / GRID;
  if (!userInteracted) fit(); else clampView();
  scheduleRender();
}
function fit() { view.scale = fitScale; clampView(); updateZoom(); }
function clampView() {
  view.scale = clamp(view.scale, minScale(), MAXSCALE);
  const gw = GRID * view.scale, gh = GRID * view.scale;
  view.ox = gw <= cw ? (cw - gw) / 2 : clamp(view.ox, cw - gw, 0);
  view.oy = gh <= ch ? (ch - gh) / 2 : clamp(view.oy, ch - gh, 0);
}
function updateZoom() {
  const z = view.scale / fitScale;
  zoomReadout.textContent = "Zoom: " + (z >= 10 ? Math.round(z) : z.toFixed(1)) + "×";
}
function zoomAt(factor, px, py) {
  const ns = clamp(view.scale * factor, minScale(), MAXSCALE);
  if (ns === view.scale) return;
  const gx = (px - view.ox) / view.scale, gy = (py - view.oy) / view.scale;
  view.scale = ns;
  view.ox = px - gx * ns; view.oy = py - gy * ns;
  clampView(); updateZoom(); scheduleRender();
}
const toCell = (sx, sy) => ({
  gx: Math.floor((sx - view.ox) / view.scale),
  gy: Math.floor((sy - view.oy) / view.scale),
});
function regionAtCell(gx, gy) {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h) return r;
  }
  return null;
}

/* ---------- rendering ---------- */
let rafPending = false;
function scheduleRender() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => { rafPending = false; render(); });
}
function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  // outside-grid backdrop
  ctx.fillStyle = "#07070b";
  ctx.fillRect(0, 0, cw, ch);
  // empty-canvas area
  const gx0px = view.ox, gy0px = view.oy, gpw = GRID * view.scale;
  ctx.fillStyle = "#0e0f17";
  ctx.fillRect(gx0px, gy0px, gpw, gpw);

  // visible cell range (cull)
  const vx0 = clamp(Math.floor((0 - view.ox) / view.scale), 0, GRID - 1);
  const vy0 = clamp(Math.floor((0 - view.oy) / view.scale), 0, GRID - 1);
  const vx1 = clamp(Math.ceil((cw - view.ox) / view.scale), 0, GRID);
  const vy1 = clamp(Math.ceil((ch - view.oy) / view.scale), 0, GRID);
  const vis = { x: vx0, y: vy0, w: vx1 - vx0, h: vy1 - vy0 };

  const showArt = view.scale >= 1.2;
  for (const r of regions) {
    if (!intersects(r, vis)) continue;
    const sx = view.ox + r.x * view.scale, sy = view.oy + r.y * view.scale;
    if (!r.art || !showArt) {
      ctx.fillStyle = r.fill;
      ctx.fillRect(sx, sy, r.w * view.scale + 0.6, r.h * view.scale + 0.6);
    } else {
      // base fill, then painted cells in view
      ctx.fillStyle = r.fill;
      ctx.fillRect(sx, sy, r.w * view.scale + 0.6, r.h * view.scale + 0.6);
      const cx0 = Math.max(r.x, vis.x), cy0 = Math.max(r.y, vis.y);
      const cx1 = Math.min(r.x + r.w, vis.x + vis.w), cy1 = Math.min(r.y + r.h, vis.y + vis.h);
      for (let cy = cy0; cy < cy1; cy++) {
        for (let cx = cx0; cx < cx1; cx++) {
          const col = r.art[(cy - r.y) * r.w + (cx - r.x)];
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(view.ox + cx * view.scale, view.oy + cy * view.scale,
                       view.scale + 0.6, view.scale + 0.6);
        }
      }
    }
  }

  // grid lines when zoomed in
  if (view.scale >= 7) {
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = vx0; gx <= vx1; gx++) {
      const x = Math.round(view.ox + gx * view.scale) + .5;
      ctx.moveTo(x, Math.max(0, gy0px)); ctx.lineTo(x, Math.min(ch, gy0px + gpw));
    }
    for (let gy = vy0; gy <= vy1; gy++) {
      const y = Math.round(view.oy + gy * view.scale) + .5;
      ctx.moveTo(Math.max(0, gx0px), y); ctx.lineTo(Math.min(cw, gx0px + gpw), y);
    }
    ctx.stroke();
  }

  // selection overlay
  if (sel) {
    const sx = view.ox + sel.x * view.scale, sy = view.oy + sel.y * view.scale;
    const sw = sel.w * view.scale, sh = sel.h * view.scale;
    ctx.fillStyle = overlapWarn ? "rgba(255,92,122,.18)" : "rgba(245,197,24,.16)";
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = overlapWarn ? "#ff5c7a" : "#f5c518";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);
  }

  renderMinimap();
}

function renderMinimap() {
  const S = 120;
  if (minimap.width !== S) { minimap.width = S; minimap.height = S; }
  mmctx.clearRect(0, 0, S, S);
  mmctx.fillStyle = "#0e0f17"; mmctx.fillRect(0, 0, S, S);
  const k = S / GRID;
  for (const r of regions) {
    mmctx.fillStyle = r.fill;
    mmctx.fillRect(r.x * k, r.y * k, Math.max(1, r.w * k), Math.max(1, r.h * k));
  }
  // viewport rect
  const vx = (-view.ox / view.scale), vy = (-view.oy / view.scale);
  const vw = (cw / view.scale), vh = (ch / view.scale);
  minimapView.style.left = clamp(vx * k, 0, S) + "px";
  minimapView.style.top = clamp(vy * k, 0, S) + "px";
  minimapView.style.width = clamp(vw * k, 2, S) + "px";
  minimapView.style.height = clamp(vh * k, 2, S) + "px";
}

/* ============================================================
   Selection + buy panel
   ============================================================ */
let sel = null;           // {x,y,w,h} in grid cells
let overlapWarn = false;
let fillColor = "#f5c518";
let activeColor = "#f5c518";
let paintTool = "paint";  // 'paint' | 'erase'
let art = null;           // array|null for current selection

const buyEmpty = $("buyEmpty");
const buyForm = $("buyForm");
const selX = $("selX"), selY = $("selY"), selW = $("selW"), selH = $("selH");
const pricePixels = $("pricePixels"), priceTotal = $("priceTotal"), buyBtnPrice = $("buyBtnPrice");
const buyBtn = $("buyBtn");
const paintBlock = $("paintBlock"), paintNote = $("paintNote");
const miniCanvas = $("miniCanvas"), mctx = miniCanvas.getContext("2d");

function openForm() {
  buyEmpty.hidden = true;
  buyForm.hidden = false;
}
function closeForm() {
  buyForm.hidden = true;
  buyEmpty.hidden = false;
  sel = null; art = null; overlapWarn = false;
  scheduleRender();
}
function setSelection(x, y, w, h, resetArt = true) {
  x = clamp(Math.round(x), 0, GRID - 1);
  y = clamp(Math.round(y), 0, GRID - 1);
  w = clamp(Math.round(w), 1, GRID - x);
  h = clamp(Math.round(h), 1, GRID - y);
  sel = { x, y, w, h };
  if (resetArt) { art = null; fillColor = activeColor; }
  refreshForm();
}
function refreshForm() {
  if (!sel) return;
  selX.value = sel.x; selY.value = sel.y; selW.value = sel.w; selH.value = sel.h;
  const px = sel.w * sel.h;
  const total = px * PRICE;
  pricePixels.textContent = fmtInt(px) + (px === 1 ? " pixel" : " pixels");
  priceTotal.textContent = fmtMoney(total);
  buyBtnPrice.textContent = fmtMoney(total);

  overlapWarn = regions.some((r) => intersects(sel, r));
  const canArt = sel.w <= ART_CAP && sel.h <= ART_CAP;
  buyBtn.disabled = overlapWarn;
  buyBtn.style.opacity = overlapWarn ? .5 : 1;
  buyBtn.style.cursor = overlapWarn ? "not-allowed" : "pointer";

  if (overlapWarn) {
    paintNote.textContent = "⚠ This area overlaps pixels someone already claimed. Move or resize it.";
  } else if (!canArt) {
    paintNote.textContent = `Selection is larger than ${ART_CAP}×${ART_CAP}, so hand-painting is off. Pick a solid fill color above.`;
  } else {
    paintNote.textContent = "Click & drag on the swatch grid to paint individual pixels.";
  }
  miniCanvas.style.display = canArt ? "block" : "none";
  if (canArt) renderMini();
  scheduleRender();
}

/* ----- mini paint canvas ----- */
function renderMini() {
  if (!sel) return;
  const maxPx = 288;
  const cell = Math.max(1, Math.floor(maxPx / Math.max(sel.w, sel.h)));
  miniCanvas.width = sel.w * cell;
  miniCanvas.height = sel.h * cell;
  mctx.fillStyle = fillColor;
  mctx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);
  if (art) {
    for (let i = 0; i < art.length; i++) {
      if (!art[i]) continue;
      mctx.fillStyle = art[i];
      mctx.fillRect((i % sel.w) * cell, Math.floor(i / sel.w) * cell, cell, cell);
    }
  }
  if (cell >= 8) {
    mctx.strokeStyle = "rgba(0,0,0,.25)"; mctx.lineWidth = 1;
    mctx.beginPath();
    for (let x = 0; x <= sel.w; x++) { mctx.moveTo(x * cell + .5, 0); mctx.lineTo(x * cell + .5, miniCanvas.height); }
    for (let y = 0; y <= sel.h; y++) { mctx.moveTo(0, y * cell + .5); mctx.lineTo(miniCanvas.width, y * cell + .5); }
    mctx.stroke();
  }
}
function paintMiniAt(clientX, clientY) {
  if (!sel || sel.w > ART_CAP || sel.h > ART_CAP) return;
  const rect = miniCanvas.getBoundingClientRect();
  const cx = Math.floor(((clientX - rect.left) / rect.width) * sel.w);
  const cy = Math.floor(((clientY - rect.top) / rect.height) * sel.h);
  if (cx < 0 || cy < 0 || cx >= sel.w || cy >= sel.h) return;
  if (!art) art = new Array(sel.w * sel.h).fill(null);
  art[cy * sel.w + cx] = paintTool === "erase" ? null : activeColor;
  renderMini();
}
let miniDrawing = false;
miniCanvas.addEventListener("pointerdown", (e) => {
  miniDrawing = true; miniCanvas.setPointerCapture(e.pointerId); paintMiniAt(e.clientX, e.clientY);
});
miniCanvas.addEventListener("pointermove", (e) => { if (miniDrawing) paintMiniAt(e.clientX, e.clientY); });
miniCanvas.addEventListener("pointerup", () => { miniDrawing = false; });
miniCanvas.addEventListener("pointercancel", () => { miniDrawing = false; });

/* ----- swatches & paint tools ----- */
const swatchWrap = $("swatches");
PALETTE.forEach((c, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "swatch" + (i === 0 ? " active" : "");
  b.style.background = c; b.title = c; b.dataset.color = c;
  b.addEventListener("click", () => selectColor(c, b));
  swatchWrap.appendChild(b);
});
function selectColor(c, btn) {
  activeColor = c; paintTool = "paint";
  $("colorPicker").value = c.length === 7 ? c : "#f5c518";
  document.querySelectorAll(".swatch").forEach((s) => s.classList.toggle("active", s === btn));
  $("eraseTool").classList.remove("active");
}
$("colorPicker").addEventListener("input", (e) => {
  activeColor = e.target.value; paintTool = "paint";
  document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
  $("eraseTool").classList.remove("active");
});
$("fillAll").addEventListener("click", () => { fillColor = activeColor; art = null; renderMini(); scheduleRender(); });
$("clearArt").addEventListener("click", () => { art = null; renderMini(); });
$("eraseTool").addEventListener("click", (e) => {
  paintTool = paintTool === "erase" ? "paint" : "erase";
  e.currentTarget.classList.toggle("active", paintTool === "erase");
});

/* ----- coordinate inputs ----- */
[selX, selY, selW, selH].forEach((inp) => {
  inp.addEventListener("change", () => {
    const x = +selX.value || 0, y = +selY.value || 0;
    const w = Math.max(1, +selW.value || 1), h = Math.max(1, +selH.value || 1);
    const changedSize = !sel || w !== sel.w || h !== sel.h;
    openForm();
    setSelection(x, y, w, h, changedSize);
    centerOn(x + w / 2, y + h / 2, false);
  });
});

/* ----- commit purchase ----- */
buyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!sel || overlapWarn) return;
  const px = sel.w * sel.h;
  const total = px * PRICE;
  const owner = ($("ownerName").value.trim() || "Anonymous Pixel Baron").slice(0, 40);
  $("confirmBody").textContent =
    `You're about to immortalize ${fmtInt(px)} pixel${px === 1 ? "" : "s"} as "${owner}". ` +
    `This is a parody — no real money moves — but the commitment is emotionally real.`;
  $("confirmReceipt").innerHTML =
    `<div class="r-row"><span>Block</span><span>${sel.w} × ${sel.h} @ (${sel.x}, ${sel.y})</span></div>` +
    `<div class="r-row"><span>Pixels</span><span>${fmtInt(px)} × $0.01</span></div>` +
    `<div class="r-row r-total"><span>Total</span><span>${fmtMoney(total)}</span></div>`;
  showModal("confirmModal");
});

function commitPurchase() {
  const owner = ($("ownerName").value.trim() || "Anonymous Pixel Baron").slice(0, 40);
  const message = $("ownerMsg").value.trim().slice(0, 80);
  const url = safeUrl($("ownerUrl").value.trim());
  const region = {
    id: "r-" + Date.now() + "-" + Math.floor(Math.random() * 1e6),
    x: sel.x, y: sel.y, w: sel.w, h: sel.h,
    fill: fillColor,
    art: art ? art.slice() : null,
    owner, message, url, ts: Date.now(),
  };
  regions.push(region);
  save();
  const px = region.w * region.h;
  burstConfetti(view.ox + (region.x + region.w / 2) * view.scale,
                view.oy + (region.y + region.h / 2) * view.scale);
  addToast(`🎉 ${owner} claimed ${fmtInt(px)} pixel${px === 1 ? "" : "s"} for ${fmtMoney(px * PRICE)}!`);
  $("ownerName").value = ""; $("ownerMsg").value = ""; $("ownerUrl").value = "";
  hideModal("confirmModal");
  closeForm();
  refreshAll();
}

/* ============================================================
   Canvas pointer interaction (pan / select / pinch)
   ============================================================ */
let mode = "select";
let spaceHeld = false;
const pointers = new Map();
let single = null;   // {mode, startCell, startScreen, moved}
let pinch = null;    // {dist, scale, cx, cy}

function setMode(m) {
  mode = m;
  $("modeSelect").classList.toggle("active", m === "select");
  $("modePan").classList.toggle("active", m === "pan");
}
$("modeSelect").addEventListener("click", () => setMode("select"));
$("modePan").addEventListener("click", () => setMode("pan"));

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

canvas.addEventListener("pointerdown", (e) => {
  userInteracted = true;
  canvas.setPointerCapture(e.pointerId);
  const p = getPos(e);
  pointers.set(e.pointerId, p);
  if (pointers.size === 2) {
    single = null;
    const pts = [...pointers.values()];
    pinch = {
      dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      scale: view.scale,
      cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2,
    };
    return;
  }
  const usePan = mode === "pan" || spaceHeld;
  single = { mode: usePan ? "pan" : "select", startScreen: p, last: p, moved: false,
             startCell: toCell(p.x, p.y) };
  if (single.mode === "pan") wrap.classList.add("panning");
});

canvas.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) { hover(e); return; }
  const p = getPos(e);
  pointers.set(e.pointerId, p);

  if (pinch && pointers.size >= 2) {
    const pts = [...pointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
    const target = clamp(pinch.scale * (dist / pinch.dist), minScale(), MAXSCALE);
    const gx = (cx - view.ox) / view.scale, gy = (cy - view.oy) / view.scale;
    view.scale = target; view.ox = cx - gx * view.scale; view.oy = cy - gy * view.scale;
    clampView(); updateZoom(); scheduleRender();
    return;
  }
  if (!single) return;
  const dx = p.x - single.last.x, dy = p.y - single.last.y;
  if (Math.abs(p.x - single.startScreen.x) + Math.abs(p.y - single.startScreen.y) > 3) single.moved = true;
  single.last = p;

  if (single.mode === "pan") {
    view.ox += dx; view.oy += dy; clampView(); scheduleRender();
  } else {
    const c = toCell(p.x, p.y);
    const x0 = clamp(Math.min(single.startCell.gx, c.gx), 0, GRID - 1);
    const y0 = clamp(Math.min(single.startCell.gy, c.gy), 0, GRID - 1);
    const x1 = clamp(Math.max(single.startCell.gx, c.gx), 0, GRID - 1);
    const y1 = clamp(Math.max(single.startCell.gy, c.gy), 0, GRID - 1);
    openForm();
    setSelection(x0, y0, x1 - x0 + 1, y1 - y0 + 1, true);
  }
});

function endPointer(e) {
  const had = pointers.has(e.pointerId);
  pointers.delete(e.pointerId);
  try { canvas.releasePointerCapture(e.pointerId); } catch {}
  wrap.classList.remove("panning");
  if (pointers.size < 2) pinch = null;
  if (!single || !had) return;

  if (!single.moved) {
    // a click (no drag)
    const c = single.startCell;
    const r = regionAtCell(c.gx, c.gy);
    if (single.mode === "pan") {
      if (r && r.url) window.open(r.url, "_blank", "noopener");
    } else {
      if (r && r.url) { window.open(r.url, "_blank", "noopener"); }
      else if (c.gx >= 0 && c.gx < GRID && c.gy >= 0 && c.gy < GRID) {
        openForm(); setSelection(c.gx, c.gy, 1, 1, true);
      }
    }
  }
  single = null;
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  userInteracted = true;
  const p = getPos(e);
  zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
}, { passive: false });

/* hover card + coords */
function hover(e) {
  if (pointers.size > 0) return;
  const p = getPos(e);
  const c = toCell(p.x, p.y);
  if (c.gx < 0 || c.gy < 0 || c.gx >= GRID || c.gy >= GRID) {
    coordReadout.textContent = "—"; hoverCard.hidden = true; return;
  }
  coordReadout.textContent = `x:${fmtInt(c.gx)}  y:${fmtInt(c.gy)}`;
  const r = regionAtCell(c.gx, c.gy);
  if (!r) { hoverCard.hidden = true; return; }
  $("hoverOwner").textContent = r.owner || "Unclaimed-ish";
  $("hoverMsg").textContent = r.message || "";
  const px = r.w * r.h;
  $("hoverMeta").textContent = `${fmtInt(px)} px · ${fmtMoney(px * PRICE)} · ${rel(r.ts)}`;
  const link = $("hoverLink");
  if (r.url) { link.hidden = false; link.href = r.url; } else link.hidden = true;
  hoverCard.style.left = clamp(p.x, 60, cw - 60) + "px";
  hoverCard.style.top = clamp(p.y, 70, ch) + "px";
  hoverCard.hidden = false;
}
canvas.addEventListener("pointerleave", () => { hoverCard.hidden = true; coordReadout.textContent = "—"; });

/* keyboard: space = temporary pan */
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !spaceHeld && document.activeElement?.tagName !== "INPUT") {
    spaceHeld = true; wrap.classList.add("pan"); e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") { spaceHeld = false; if (mode !== "pan") wrap.classList.remove("pan"); }
});

/* ---------- toolbar buttons ---------- */
$("zoomIn").addEventListener("click", () => { userInteracted = true; zoomAt(1.5, cw / 2, ch / 2); });
$("zoomOut").addEventListener("click", () => { userInteracted = true; zoomAt(1 / 1.5, cw / 2, ch / 2); });
$("zoomReset").addEventListener("click", () => { fit(); scheduleRender(); });
$("teleport").addEventListener("click", () => {
  if (!regions.length) return;
  const r = regions[Math.floor(Math.random() * regions.length)];
  userInteracted = true;
  view.scale = clamp(Math.min(cw, ch) / (Math.max(r.w, r.h) * 2.2), minScale(), MAXSCALE);
  centerOn(r.x + r.w / 2, r.y + r.h / 2, true);
  addToast(`🎲 Teleported to "${r.owner}"`);
});
function centerOn(gx, gy, interacted) {
  if (interacted) userInteracted = true;
  view.ox = cw / 2 - gx * view.scale;
  view.oy = ch / 2 - gy * view.scale;
  clampView(); updateZoom(); scheduleRender();
}

/* minimap click-to-jump */
minimap.addEventListener("click", (e) => {
  const rect = minimap.getBoundingClientRect();
  const gx = ((e.clientX - rect.left) / rect.width) * GRID;
  const gy = ((e.clientY - rect.top) / rect.height) * GRID;
  centerOn(gx, gy, true);
});

/* "I'm feeling rich" — pick an empty-ish spot */
$("luckyBtn").addEventListener("click", () => {
  const size = 60 + Math.floor(Math.random() * 80);
  let x, y, tries = 0, ok = false;
  do {
    x = Math.floor(Math.random() * (GRID - size));
    y = Math.floor(Math.random() * (GRID - size));
    ok = !regions.some((r) => intersects({ x, y, w: size, h: size }, r));
  } while (!ok && ++tries < 40);
  userInteracted = true;
  view.scale = clamp(Math.min(cw, ch) / (size * 2.4), minScale(), MAXSCALE);
  openForm(); setSelection(x, y, size, size, true);
  centerOn(x + size / 2, y + size / 2, true);
  addToast("🍀 Found you a cozy, suspiciously affordable plot.");
});
$("cancelBuy").addEventListener("click", closeForm);

/* ============================================================
   Stats / leaderboard / recent / ticker
   ============================================================ */
function totals() {
  let px = 0;
  for (const r of regions) px += r.w * r.h;
  return { px, raised: px * PRICE };
}
let firstStats = true;
function refreshStats() {
  const { px, raised } = totals();
  animateNum($("statPixels"), px, (v) => fmtInt(Math.round(v)));
  animateNum($("statRaised"), raised, (v) => fmtMoney(v));
  $("statBillion").textContent = pctOfBillion(raised);
  const w = Math.max(0.0001, (raised / BILLION) * 100);
  $("billionFill").style.width = Math.min(100, w) + "%";
  $("billionMid").textContent =
    raised >= MAX_RAISE ? "SOLD OUT at $1,000,000 — only $999,000,000 short!"
                        : "Goal: $1,000,000,000 (we believe in ourselves)";
  firstStats = false;
}
function animateNum(el, to, fmt) {
  const from = firstStats ? 0 : (parseFloat(el.dataset.val || "0"));
  el.dataset.val = to;
  const dur = firstStats ? 1100 : 500;
  const t0 = performance.now();
  function step(t) {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function refreshBoards() {
  // biggest spenders
  const byOwner = new Map();
  for (const r of regions) {
    const k = r.owner || "Anonymous Pixel Baron";
    const cur = byOwner.get(k) || { name: k, px: 0, color: r.fill };
    cur.px += r.w * r.h;
    byOwner.set(k, cur);
  }
  const top = [...byOwner.values()].sort((a, b) => b.px - a.px).slice(0, 6);
  $("topList").innerHTML = top.map((o) =>
    `<li><span class="bl-dot" style="background:${o.color}"></span>` +
    `<span class="bl-name">${esc(o.name)}</span>` +
    `<span class="bl-val">${fmtInt(o.px)} px · ${fmtMoney(o.px * PRICE)}</span></li>`).join("") ||
    `<li class="empty-note">No barons yet. Be the first.</li>`;

  // recent
  const recent = [...regions].sort((a, b) => b.ts - a.ts).slice(0, 6);
  $("recentList").innerHTML = recent.map((r) => {
    const px = r.w * r.h;
    return `<li><span class="bl-dot" style="background:${r.fill}"></span>` +
      `<span class="bl-name">${esc(r.owner)}</span>` +
      `<span class="bl-val">${fmtInt(px)} px · ${rel(r.ts)}</span></li>`;
  }).join("");

  // ticker (doubled for seamless scroll)
  const items = [...regions].sort((a, b) => b.ts - a.ts).slice(0, 14).map((r) =>
    `<span class="ticker-item"><span class="ticker-dot" style="background:${r.fill}"></span>` +
    `${esc(r.owner)} · ${fmtInt(r.w * r.h)} px</span>`).join("");
  $("tickerTrack").innerHTML = items + items;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function refreshAll() { refreshStats(); refreshBoards(); scheduleRender(); }

/* ============================================================
   Confetti
   ============================================================ */
let confParticles = [], confRAF = 0;
function burstConfetti(x, y) {
  const colors = PALETTE.slice(0, 8);
  for (let i = 0; i < 150; i++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7;
    confParticles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4,
      g: 0.18 + Math.random() * 0.12, life: 1,
      size: 3 + Math.random() * 5, rot: Math.random() * 6.28,
      vr: (Math.random() - .5) * .4, color: colors[i % colors.length],
    });
  }
  if (!confRAF) confRAF = requestAnimationFrame(confStep);
}
function confStep() {
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cctx.clearRect(0, 0, cw, ch);
  confParticles = confParticles.filter((p) => p.life > 0 && p.y < ch + 40);
  for (const p of confParticles) {
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.012;
    cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot);
    cctx.globalAlpha = Math.max(0, p.life);
    cctx.fillStyle = p.color;
    cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    cctx.restore();
  }
  if (confParticles.length) confRAF = requestAnimationFrame(confStep);
  else { confRAF = 0; cctx.clearRect(0, 0, cw, ch); }
}

/* ============================================================
   Modals / toasts / ad
   ============================================================ */
function showModal(id) { $(id).hidden = false; }
function hideModal(id) { $(id).hidden = true; }
$("confirmOk").addEventListener("click", commitPurchase);
$("confirmCancel").addEventListener("click", () => hideModal("confirmModal"));
$("confirmModal").addEventListener("click", (e) => { if (e.target.id === "confirmModal") hideModal("confirmModal"); });

const AD_SCENES = [
  { bg: "#0a0a12", t: "In a world… with exactly 100,000,000 pixels…" },
  { bg: "#241a3a", t: "One person dared to spend… one cent." },
  { bg: "#3a1a2a", t: "\"Is it a good investment?\" — No. No, it is not." },
  { bg: "#1a2a3a", t: "Own a square smaller than this period. ." },
  { bg: "#1a3a2a", t: "It's called the BILLION Dollar Drawing." },
  { bg: "#3a2a1a", t: "It maxes out at one million. The math is a vibe." },
  { bg: "#0a0a12", t: "🎨 Claim your penny of history. →" },
];
let adTimer = 0;
function playAd() {
  $("adPlay").style.display = "none";
  let i = 0;
  const screen = $("adScreen"), cap = $("adCaption");
  function next() {
    if (i >= AD_SCENES.length) {
      cap.innerHTML = '<b style="color:#f5c518">Now playing in your browser. Forever.</b>';
      const cta = document.createElement("button");
      cta.className = "btn btn-gold"; cta.textContent = "🎨 Claim a pixel";
      cta.style.marginTop = "10px";
      cta.onclick = () => { hideModal("adModal"); document.getElementById("studio").scrollIntoView(); };
      cap.appendChild(document.createElement("br")); cap.appendChild(cta);
      $("adPlay").style.display = "";
      return;
    }
    const s = AD_SCENES[i++];
    screen.style.background = `radial-gradient(120% 120% at 50% 0%, ${s.bg}, #07070b)`;
    cap.textContent = s.t;
    adTimer = setTimeout(next, 2100);
  }
  next();
}
function openAd() { showModal("adModal"); }
["navWatchAd", "heroWatchAd", "footerWatchAd"].forEach((id) => $(id).addEventListener("click", openAd));
$("adPlay").addEventListener("click", playAd);
$("adClose").addEventListener("click", () => { clearTimeout(adTimer); hideModal("adModal"); });
$("adModal").addEventListener("click", (e) => { if (e.target.id === "adModal") { clearTimeout(adTimer); hideModal("adModal"); } });

function addToast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  $("toastWrap").appendChild(t);
  setTimeout(() => t.remove(), 3600);
}

/* reset */
$("resetAll").addEventListener("click", () => {
  if (!confirm("Wipe every pixel from this browser and reload the original mosaic? Your local masterpiece will be gone.")) return;
  try { localStorage.removeItem(STORE_KEY); } catch {}
  regions = seedRegions(); save();
  closeForm(); firstStats = true; fit(); refreshAll();
  addToast("🧨 Canvas reset. A clean slate of crushing potential.");
});

/* ============================================================
   Boot
   ============================================================ */
load();
setMode("select");
new ResizeObserver(resizeCanvas).observe(wrap);
resizeCanvas();
refreshAll();
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { hideModal("confirmModal"); hideModal("adModal"); }
});

})();
