/* The Billion Dollar Drawing — static server + shared-canvas API.
 *
 * Zero dependencies. Doubles as:
 *   - a Render "Web Service" entrypoint (binds to process.env.PORT), and
 *   - a local dev server (`npm start` -> http://localhost:3000).
 *
 * When this server is running, the front end uses the API below so every
 * visitor paints the SAME canvas. On a plain static deploy (no server) the
 * front end falls back to per-browser localStorage automatically.
 *
 * Endpoints:
 *   GET  /api/regions  -> { regions: [...] }      the whole shared canvas
 *   POST /api/regions  -> 201 { region }          claim a block (validated)
 *                          409 if it overlaps an existing claim
 *
 * Storage: a JSON file. Set DATA_DIR to a Render persistent disk (e.g. /data)
 * for durability across deploys; otherwise it lives next to the app and resets
 * when the instance is recreated.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "regions.json");

/* ---- limits / validation ---- */
const GRID = 10000;
const ART_CAP = 100;              // max W/H for hand-painted art
const MAX_AREA = 1_000_000;       // biggest single claim (1000x1000)
const MAX_REGIONS = 100_000;      // bound the file/memory
const MAX_BODY = 256 * 1024;      // request body cap (bytes)
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/* ---- seed canvas (matches the front-end fallback) ---- */
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
    id: "seed-" + i, x: r[0], y: r[1], w: r[2], h: r[3],
    fill: r[4], art: null, owner: r[5], message: r[6], url: "",
    ts: now - (i + 2) * 5400000,
  }));
}

/* ---- state + persistence ---- */
let regions = [];
let writeChain = Promise.resolve();
function loadData() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      if (Array.isArray(parsed)) { regions = parsed; return; }
    }
  } catch (e) { console.error("loadData:", e.message); }
  regions = seedRegions();
  persist();
}
function persist() {
  const tmp = DATA_FILE + ".tmp";
  const data = JSON.stringify(regions);
  writeChain = writeChain
    .then(() => fs.promises.mkdir(DATA_DIR, { recursive: true }))
    .then(() => fs.promises.writeFile(tmp, data))
    .then(() => fs.promises.rename(tmp, DATA_FILE))
    .catch((e) => console.error("persist:", e.message));
  return writeChain;
}

const intersects = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const isInt = (n) => Number.isInteger(n);
function safeUrl(u) {
  if (!u) return "";
  if (typeof u !== "string" || u.length > 300) return "";
  try { const x = new URL(u); return (x.protocol === "http:" || x.protocol === "https:") ? x.href : ""; }
  catch { return ""; }
}

function validateRegion(b) {
  if (!b || typeof b !== "object") return { error: "body must be an object" };
  const x = b.x, y = b.y, w = b.w, h = b.h;
  if (![x, y, w, h].every(isInt)) return { error: "x,y,w,h must be integers" };
  if (x < 0 || y < 0 || w < 1 || h < 1) return { error: "out of range" };
  if (x + w > GRID || y + h > GRID) return { error: "exceeds canvas bounds" };
  if (w * h > MAX_AREA) return { error: "claim too large (max " + MAX_AREA + " pixels)" };
  if (typeof b.fill !== "string" || !HEX.test(b.fill)) return { error: "fill must be a hex color" };

  let art = null;
  if (b.art != null) {
    if (w > ART_CAP || h > ART_CAP) return { error: "art only allowed up to " + ART_CAP + "x" + ART_CAP };
    if (!Array.isArray(b.art) || b.art.length !== w * h) return { error: "art length must equal w*h" };
    for (const c of b.art) if (c != null && (typeof c !== "string" || !HEX.test(c))) return { error: "art has invalid color" };
    art = b.art;
  }
  if (regions.length >= MAX_REGIONS) return { error: "canvas is full of claims" };
  const cand = { x, y, w, h };
  if (regions.some((r) => intersects(cand, r))) return { error: "overlap", overlap: true };

  return {
    region: {
      id: "r-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      x, y, w, h, fill: b.fill, art,
      owner: (typeof b.owner === "string" ? b.owner.trim() : "").slice(0, 40) || "Anonymous Pixel Baron",
      message: (typeof b.message === "string" ? b.message.trim() : "").slice(0, 80),
      url: safeUrl(b.url),
      ts: Date.now(),
    },
  };
}

/* ---- http helpers ---- */
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
function readBody(req, cb) {
  let len = 0; const chunks = [];
  req.on("data", (c) => {
    len += c.length;
    if (len > MAX_BODY) { cb(new Error("body too large")); req.destroy(); return; }
    chunks.push(c);
  });
  req.on("end", () => cb(null, Buffer.concat(chunks).toString("utf8")));
  req.on("error", (e) => cb(e));
}

/* ---- api ---- */
function handleApi(req, res, pathname) {
  if (pathname === "/api/regions" && req.method === "GET") {
    return sendJson(res, 200, { regions });
  }
  if (pathname === "/api/regions" && req.method === "POST") {
    return readBody(req, (err, raw) => {
      if (err) return sendJson(res, 413, { error: "request too large" });
      let body; try { body = JSON.parse(raw || "{}"); } catch { return sendJson(res, 400, { error: "invalid JSON" }); }
      const v = validateRegion(body);
      if (v.error) return sendJson(res, v.overlap ? 409 : 400, { error: v.error });
      regions.push(v.region);
      persist();
      return sendJson(res, 201, { region: v.region });
    });
  }
  return sendJson(res, 404, { error: "no such endpoint" });
}

/* ---- static ---- */
function handleStatic(req, res, pathname) {
  if (pathname === "/" || pathname === "") pathname = "/index.html";
  const filePath = path.join(ROOT, path.normalize(pathname));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain" }); res.end("Forbidden"); return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>404</h1><p>Not found — like 99.9% of our imaginary billion.</p>");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("/api/")) return handleApi(req, res, pathname);
    return handleStatic(req, res, pathname);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain" }); res.end("Server error");
  }
});

loadData();
server.listen(PORT, HOST, () => {
  console.log(`The Billion Dollar Drawing is live at http://${HOST}:${PORT}`);
  console.log(`Shared canvas data: ${DATA_FILE}  (${regions.length} regions loaded)`);
});
