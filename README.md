# The Billion Dollar Drawing

A playable parody of [The Million Dollar Homepage](https://en.wikipedia.org/wiki/The_Million_Dollar_Homepage)
and The Million Dollar Drawing — except this one is named after a **billion** dollars and then
quietly maxes out at one million. That gap is the whole joke.

> **100,000,000 pixels. One cent each. Maximum possible raise: $1,000,000 — exactly 0.1% of a
> billion. We remain optimistic.**

## What it is

A single-page interactive canvas where anyone can claim a rectangle of a 10,000×10,000 grid
(100 million pixels), paint it, name it, link it, and "buy" it for $0.01 per pixel. A live
counter tracks dollars raised and the (adorably tiny) percentage of the way to an *actual*
billion. It's a financially confused work of art.

No real money changes hands. Purchases are simulated and saved to your browser's
`localStorage`. It's a toy and a joke, not an investment.

## Features

- **100M-pixel canvas** rendered with sparse storage + viewport culling, so it stays fast
  (only sold pixels are stored and drawn — never a 100-million-cell array).
- **Zoom & pan** via scroll wheel, buttons, pinch (touch), spacebar-drag, and a click-to-jump
  **minimap**.
- **Select & buy**: drag a rectangle (or type exact X / Y / W / H), see the price update live.
- **Pixel-art paint tool**: for blocks up to 100×100, hand-paint individual pixels with a
  palette, custom color, fill, and eraser. Larger blocks get a solid fill.
- **Hover cards** showing each block's owner, message, size, price, and link.
- **Live stats, leaderboard ("Wall of Fame"), recent-claims ticker**, confetti on purchase,
  and the running "% to a billion" gag.
- **The Ad**: a built-in mock-trailer teaser, plus a full interactive AI video script.
- Responsive, dark/gold theme, zero dependencies, no build step.

## Run it

It's static. Any of these work:

```bash
# Option 1: the bundled Node server (zero dependencies)
npm start                  # -> http://localhost:3000

# Option 2: just open the file
open index.html            # macOS  (or: xdg-open index.html on Linux)

# Option 3: any static server
python3 -m http.server 8000   # -> http://localhost:8000
```

## Deploy to Render

The app is 100% client-side, so it deploys cleanly on [Render](https://render.com).
Two supported paths:

**Option A — Static Site (recommended: free, global CDN, no cold starts).**
This repo includes a `render.yaml` blueprint.
- Dashboard: **New + → Blueprint**, connect this repo, and Render reads `render.yaml`.
- Or manually: **New + → Static Site**, leave **Build Command** blank, set **Publish
  Directory** to `.`.

**Option B — Web Service (Node).** Uses the bundled `server.js`.
- **New + → Web Service**, connect this repo.
- **Build Command:** `npm install` &nbsp;·&nbsp; **Start Command:** `npm start`.
- Render injects `PORT`; `server.js` already binds to `process.env.PORT` on `0.0.0.0`.

**Note on state:** purchases are saved in each visitor's browser via `localStorage`, so
everyone sees the seeded canvas plus *their own* claims — it is not yet a shared, live canvas.
Making it shared would need a small backend (a Render Web Service + Postgres or a persistent
disk) — easy to add if you want it.

## Files

| File | What |
|---|---|
| `index.html` | Page structure and content |
| `styles.css` | Dark + gold theme, fully responsive |
| `app.js` | Canvas engine: storage, rendering, zoom/pan, selection, paint, purchases, stats |
| `server.js` | Zero-dependency static server (Render Web Service entrypoint + local dev) |
| `render.yaml` | Render Blueprint (deploys as a Static Site) |
| `package.json` | `npm start` script + Node engine |
| `VIDEO_SCRIPT.md` | The funny, branching, **interactive** AI video ad script (shot-by-shot, with copy-paste generation prompts) |

## The advertisement

`VIDEO_SCRIPT.md` is a complete, AI-ready production script: a mock-epic movie trailer that
narrates the act of spending one cent as if it were the most important event in human history.
It includes per-shot generation prompts (for Sora / Runway / Kling / Veo / Pika), a clean
voiceover track, an interactive branch ("How rich do you feel?" → "I'm broke" vs "I'm RICH"),
and platform cutdowns (6s / 15s / 30s / 60–90s).

## Disclaimer

A loving parody. Not affiliated with or endorsed by the originals. No billions (or millions)
were raised, harmed, or seriously attempted. Pixels live in your browser. Past performance of
imaginary pixels does not guarantee future imaginary results.
