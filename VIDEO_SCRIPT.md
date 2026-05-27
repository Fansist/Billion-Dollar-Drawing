# The Billion Dollar Drawing — Interactive AI Video Ad Script

**Logline:** A movie-trailer-grade epic about the bravest financial decision of our
time: spending one (1) cent.

**Runtime:** ~60s core spot, branches to ~90s.
**Format:** Vertical 9:16 master (TikTok / Reels / Shorts) + 16:9 cutdown for web/YouTube.
**Genre:** Mock-epic comedy. Think *Hollywood blockbuster trailer* narrating *a single penny*.

This script is written to be handed directly to an AI video pipeline. Every shot has a
**generation prompt** (for Sora / Runway Gen-3 / Kling / Veo / Pika), a **voiceover** line
(for ElevenLabs or similar — voice direction included), **on-screen text**, **sound**, and an
**interactive cue**. The whole thing branches based on one viewer choice.

---

## 1. Production specs (give these to the tools)

| Setting | Value |
|---|---|
| Aspect | 9:16 master (1080×1920), 16:9 cutdown (1920×1080) |
| Frame rate | 24fps (cinematic) |
| Visual style | Cinematic teaser, volumetric light, shallow depth of field, slight film grain, gold + deep-purple palette to match the site |
| Narrator voice | Epic movie-trailer baritone, fully committed, zero awareness that the stakes are one cent. ElevenLabs "deep/cinematic" preset, ~0.9x speed, dramatic pauses |
| Buyer voice | Ordinary, slightly nervous human. Normal pace |
| Music | Rising orchestral trailer cue (strings + braams), then a hard comedic record-scratch drop at each punchline |
| Captions | Always-on burned-in captions (auto-fail-safe for muted autoplay). Big, bold, gold |
| Brand lockup | "🎨 The **Billion** Dollar Drawing" + tagline "Own a pixel of internet history. For a penny." |

**Comedy rule:** The visuals and the narrator treat this like the most important event in
human history. The numbers on screen quietly betray that it is not. Never wink too hard —
play it straight, let the math be the joke.

---

## 2. Cast

- **NARRATOR (V.O.)** — unseen, god-tier trailer voice.
- **DAVE** — our hero. An average person at a laptop. Hoodie. Single bead of sweat.
- **THE COUNTER** — an on-screen UI element that is, frankly, a character. It is the "% of a
  billion" meter, and it refuses to move.

---

## 3. Interactive structure (this is the "interactive" part)

The ad pauses once and asks the viewer to choose. Implement per platform:

- **TikTok / Reels / Shorts:** freeze-frame at 0:34 with two on-screen "tap" zones + a caption
  poll ("Reply with A or B"). Publish both branch endings as a 2-part series; pin the branch
  the audience voted for.
- **YouTube:** use an end-screen / card choice, or upload as two videos linked by cards.
- **Web embed (recommended):** an HTML `<video>` with two clickable hotspot buttons that jump
  to branch timestamps. Drop-in code is in the site repo idea below.
- **Connected TV / kiosk:** remote left/right selects the branch.

**The choice (asked on screen):** *"How rich do you feel right now?"*
→ **Branch A: "I'm broke"** &nbsp;|&nbsp; **Branch B: "I'm RICH"**

Both branches reunite for the same final CTA, so you only generate one ending.

---

## 4. The script (shot by shot)

> Columns per beat: **Visual (AI gen prompt)** · **VO** · **On-screen text** · **Sound** · **Interactive cue**

### COLD OPEN — 0:00–0:06

**Visual (gen prompt):**
> Cinematic slow push-in through dark clouds at dawn, golden volumetric god-rays breaking
> through, epic scale, particles of dust drifting, 9:16, shallow depth of field, film grain,
> color grade gold and deep purple. Camera drifts toward a single tiny glowing square pixel
> suspended in the void.

**VO (NARRATOR, hushed, building):** "In a world… of one hundred million pixels…"

**On-screen text:** `100,000,000 PIXELS` (huge, gold, slams in on a braam)

**Sound:** Low rumble → single deep braam. Distant choir.

**Interactive cue:** none (let them settle in).

---

### BEAT 2 — THE HERO — 0:06–0:14

**Visual (gen prompt):**
> Push in on DAVE, late-20s in a hoodie, lit by a single laptop screen in a dark room,
> heroic low-angle, one bead of sweat rolling down his temple, reflection of a glowing pixel
> grid in his eyes. Epic, overly serious tone. Slight slow motion.

**VO (NARRATOR):** "One man… dared to do what no sensible person would. He dared… to spend…"
*(dramatic pause, music swells)*

**On-screen text:** (Dave's POV of the site, zooming into the canvas)

**Sound:** Strings rising, ticking clock.

**Interactive cue:** none.

---

### BEAT 3 — THE REVEAL (first punchline) — 0:14–0:20

**Visual (gen prompt):**
> Extreme close-up of a price tag materializing in glowing gold numerals: "$0.01". The
> orchestra freezes. Hard record-scratch. The dramatic lighting flickers as if the budget
> just got cut.

**VO (NARRATOR, deflating):** "…one cent."

**On-screen text:** `$0.01` then beneath, smaller: *"per pixel. that's the whole bit."*

**Sound:** Record scratch. Music dies to a single sad kazoo/triangle ding.

**Interactive cue:** none — let the laugh land.

---

### BEAT 4 — THE NAME — 0:20–0:28

**Visual (gen prompt):**
> Grand logo reveal: gold serif title "The BILLION Dollar Drawing" igniting with sparks,
> fireworks behind it, epic. Then the fireworks awkwardly fizzle as a small asterisk appears.

**VO (NARRATOR, regaining confidence):** "They called it… **The Billion Dollar Drawing.**"
*(beat)* "Then they did the math."

**On-screen text:**
- Line 1: `THE BILLION DOLLAR DRAWING`
- Line 2 (small, sheepish): `*maximum possible total: $1,000,000`
- Line 3 (smaller): `that's 0.1% of a billion. we're aware.`

**Sound:** Triumphant brass → comedic deflating-balloon.

**Interactive cue:** none.

---

### BEAT 5 — THE COUNTER (running gag) — 0:28–0:34

**Visual (gen prompt):**
> UI overlay of a sleek progress bar labeled "PROGRESS TO A REAL BILLION." The fill is an
> almost-invisible sliver. Camera dramatically dollies along the empty bar for what feels
> like miles. Tumbleweed made of pixels rolls past.

**VO (NARRATOR):** "Watch… as the counter races toward a billion dollars."
*(long pause)* "…Any moment now."

**On-screen text:** `0.0017% TO A BILLION` (the digit nudges up by one and the music does a
triumphant sting wildly disproportionate to the achievement)

**Sound:** Epic build that goes nowhere. Cricket.

**Interactive cue:** none — build toward the choice.

---

### THE CHOICE (interactive freeze) — 0:34–0:38

**Visual (gen prompt):**
> Freeze-frame on Dave mid-click, time stops, debris and confetti suspended in mid-air
> (Matrix bullet-time), two glowing doors of light appear left and right, one cool blue, one
> blazing gold.

**VO (NARRATOR):** "But first… **you** must decide. How rich do you feel… *right now?*"

**On-screen text (tap zones):**
- LEFT (blue): `A) "I'm broke"`
- RIGHT (gold): `B) "I'm RICH"`
- Bottom caption: *"Tap your side. Comment A or B."*

**Sound:** Suspended dramatic chord, heartbeat.

**Interactive cue:** **PAUSE / BRANCH.** Wait for input (or auto-advance to A after 3s on
linear platforms). Route to the chosen branch.

---

## 5. Branches

### BRANCH A — "I'M BROKE" — 0:38–0:50

**Visual (gen prompt):**
> Dave triumphantly buys exactly ONE pixel. Confetti cannons fire… and release a single,
> sad piece of confetti that drifts down. Push in on the canvas: his pixel is so small it is
> legally a rumor. A spotlight searches for it like a prison-break scene and can't find it.

**VO (NARRATOR, moved to tears):** "For one cent… Dave bought a piece of internet history.
A square so small… that on most screens… it is technically a legend."

**On-screen text:** `1 pixel · $0.01 · priceless* ` → *(*it is precisely $0.01)*

**Sound:** Single triumphant trumpet note, then a tiny "blip."

→ proceed to **UNIFIED ENDING.**

### BRANCH B — "I'M RICH" — 0:38–0:50

**Visual (gen prompt):**
> Dave, now in absurd opulence (gold chain over the hoodie, tiny crown), drags a giant
> selection box across the canvas. A cartoonishly large invoice prints out and unspools across
> the floor. He signs it with a feather pen. The total reads a "fortune."

**VO (NARRATOR, awed):** "But YOU… you went big. A hundred-by-hundred empire. Ten thousand
pixels. A fortune of… *(beat)*… one hundred dollars."

**On-screen text:** `10,000 pixels · $100.00 · "a fortune"` then tiny: *(0.00001% of a billion)*

**Sound:** Cash-register cha-ching, then the same lonely kazoo.

→ proceed to **UNIFIED ENDING.**

---

### UNIFIED ENDING — 0:50–1:00

**Visual (gen prompt):**
> Pull back fast from Dave's single glowing region to reveal the entire 10,000×10,000 mosaic
> of thousands of tiny colorful brands and doodles, forming a vast living tapestry, camera
> rockets upward into the gold-and-purple sky. The brand lockup assembles from flying pixels.

**VO (NARRATOR, full epic mode restored):** "Join the masterpiece. Leave your mark. Become…
a glorious rounding error… in internet history."

**On-screen text (sequence):**
1. `🎨 The BILLION Dollar Drawing`
2. `Own a pixel. For a penny.`
3. `100,000,000 pixels. Pick yours.`
4. CTA button: `CLAIM YOUR PIXEL →`

**Sound:** Full orchestral payoff (the real one this time), confetti whoosh, gold shimmer.

**Interactive cue:** clickable end-card → site `#studio`. On social, "Link in bio." Add an
on-screen QR for CTV/print.

---

### POST-CREDITS STINGER (optional, 1:00–1:05)

**Visual:** The "% to a billion" counter, alone in the dark, ticks from `0.0017%` to
`0.0018%`. A single firework celebrates. Cut to black.

**VO (NARRATOR, whisper):** "We believe in ourselves."

**On-screen text:** `999,000,000 to go.`

---

## 6. Clean voiceover script (for one-take VO recording / TTS)

```
In a world... of one hundred million pixels...
One man dared to do what no sensible person would.
He dared... to spend... one cent.
They called it: The Billion Dollar Drawing.
Then they did the math.
Watch, as the counter races toward a billion dollars.
...Any moment now.
But first — YOU must decide. How rich do you feel, right now?
[BRANCH A] For one cent, Dave bought a piece of internet history. A square so small that, on most screens, it is technically a legend.
[BRANCH B] But you went big. Ten thousand pixels. A fortune of... one hundred dollars.
Join the masterpiece. Leave your mark. Become a glorious rounding error in internet history.
The Billion Dollar Drawing. Own a pixel. For a penny.
[STINGER] We believe in ourselves.
```

---

## 7. Per-shot generation prompts (copy/paste sheet)

Use these as the `prompt` field in your video model. Append the global style suffix to each:

**Global style suffix:**
`, cinematic teaser, 9:16, 24fps, volumetric god-rays, shallow depth of field, fine film
grain, gold and deep-purple color grade, ultra-detailed, dramatic lighting`

1. `Slow push through dark dawn clouds toward a single glowing pixel in a void`
2. `Heroic low-angle of a hooded person lit only by a laptop, a bead of sweat, pixel grid reflected in their eyes`
3. `Extreme close-up of a glowing gold "$0.01" price tag materializing, lights flickering like the budget was cut`
4. `Epic gold serif logo "The BILLION Dollar Drawing" igniting with sparks, then a small apologetic asterisk appears`
5. `A sleek progress bar labeled "PROGRESS TO A REAL BILLION" with an almost invisible sliver of fill, camera dollies down the empty bar, a pixel tumbleweed rolls past`
6. `Bullet-time freeze of a person mid-click, suspended confetti, two glowing doors of light, one blue one gold`
7. `(Branch A) Confetti cannon fires a single sad piece of confetti; a spotlight searches a vast canvas for one tiny pixel and fails`
8. `(Branch B) A person in a tiny crown and gold chain drags a huge selection box; a cartoonishly long invoice unspools across the floor`
9. `Rapid pull-back revealing a vast 10,000 by 10,000 mosaic of thousands of tiny colorful brand pixels, camera rockets into a gold-purple sky`
10. `(Stinger) A lone progress counter in the dark ticking up by 0.0001 percent, a single small firework`

---

## 8. Platform cutdowns

- **6s bumper (YouTube/pre-roll):** Beat 3 → Beat 4 → CTA. Just the "$0.01 / Billion Dollar"
  whiplash and the logo. The whole joke in one breath.
- **15s (TikTok hook-first):** Open on Beat 3 ("…one cent." record scratch) → Beat 4 name joke
  → unified CTA. Front-load the punchline for the scroll.
- **30s:** Cold open → Beat 3 → Beat 4 → Beat 5 counter gag → CTA. Skip the interactive branch.
- **60–90s:** Full interactive version above.

## 9. On-screen caption bank (for B-roll / remix / comments-bait)

- "It's called the BILLION Dollar Drawing. It maxes out at one million. We're not great at names."
- "Own a pixel smaller than this period. ."
- "Financial advisor's reaction: visible disappointment."
- "0.1% funded and incredibly proud."
- "Tag someone who would absolutely buy one pixel."

---

*Parody. No real billions (or millions) are raised, harmed, or seriously attempted. The only
thing appreciating here is the joke.*
