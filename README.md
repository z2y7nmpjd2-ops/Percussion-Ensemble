# LATTICE

**An interlocking synthetic percussion ensemble — a playable instrument for live
performance and accompaniment.**

Six synthesized voices play as a circle of listening musicians: parts interlock on a
dense shared grid, phrases call and answer each other, and every stroke is placed
with the micro-timing, drift and dynamic life of human hands. You conduct the
ensemble with a handful of macro controls and cues — or take the lead voice
yourself and play it from your keyboard while the group accompanies you.

All sound is generated live by the Web Audio API. There are no samples. The house
sound is deliberately **dry and subdued**: attacks are ramped over milliseconds
rather than clicked, noise components are band-limited and mixed low, decays are
short, and the only "space" is a 60 ms synthetic glue at −18 dB.

## Run it

Open `index.html` in any modern browser (plain scripts, no build step, works from
`file://`) and press **Start**. Or serve the folder:

```
npx serve .        # or: python3 -m http.server
```

## The six voices

| Voice | Role | Character |
|-------|------|-----------|
| **Keel** | guide line | A dry two-pitch woodblock tick tracing an uneven 9-9-6-9-9-6 key. Never varies — it is the reference everyone leans on. |
| **Root** | low anchor | Round swept-sine low drum, open and pressed strokes. Speaks in the Keel's gaps and lays back behind the beat. |
| **Weave** | mid voice | Woodier mid drum living on offbeat 16ths; stitches sextuplet pairs at higher density. Trades variation turns with the lead. |
| **Spark** | lead voice | The fastest-speaking drum. Walks a motif graph, mutates its phrases, and issues calls the ensemble answers. |
| **Grain** | texture | A shaker with alternating push/pull strokes; thickens from 8ths to 16ths to sextuplet infill as density and heat rise. |
| **Halo** | color | Sparse, quickly-damped inharmonic metal at the cycle's turning points. |

## The grid

One cycle is **48 pulses** (4 beats × 12). That single grid holds duple 16ths
(every 3 pulses), sextuplets (every 2) and triplet 8ths (every 4) simultaneously,
so parts genuinely cross-group against each other rather than sharing one
subdivision.

## What makes it feel played, not programmed

- **Lilt** — a systematic lean of grid positions inside each beat (2nd and 4th
  16ths late, 3rd slightly early), interpolated so dense fills ride the same wave.
- **Spread** — each player has a persistent timing personality: Spark pushes
  ~3 ms ahead, Root lays back ~4.5 ms, plus a slow sinusoidal drift of that lean.
- **Loose** — gaussian per-stroke jitter, velocity life (downbeats steadier than
  weak positions), stochastic articulation: weak strokes occasionally soften to a
  touch stroke or drop entirely. Structural anchors never fray.
- **Velocity as gesture** — higher velocity also sharpens and brightens a stroke,
  the way a harder hand stroke does.

## How the players listen to each other

- **Turn-taking** — variation privilege alternates between Spark and Weave every
  two cycles, so they trade phrases instead of talking over each other. Root
  varies alongside Weave; Keel never does.
- **Call & answer** — some lead motifs are calls. The next cycle, Weave and Root
  switch to answer figures and Grain and Halo dig in. Calls emerge spontaneously
  from high heat, or you cue one yourself — including while *you* hold the lead.
- **Phrase memory** — the lead chooses motifs through weighted transitions from
  the current phrase, energy-matched to the heat level, then mutates them
  (displacement, pickups, sextuplet stutters, thinning) so nothing returns
  identical.

## Conducting

| Control | Effect |
|---------|--------|
| **Heat** | ensemble energy: variation probability, ghost-note layer, lead phrase energy, dynamic ceiling |
| **Density** | how full the supporting parts play (8ths → 16ths → sextuplet infill) |
| **Lilt** | amount of the shared off-pulse lean |
| **Spread** | scale of each player's personal timing lean and drift |
| **Loose** | human jitter, drift and velocity variance |
| **Call & Answer** | arms a call; fires at the next phrase boundary |
| **Break** | one unison cycle on the key figure, a breath of air, back in |
| **Lift / Simmer** | ramp heat up / down over several cycles |

Each player strip has **Mute**, **Level** and **Vary** (how adventurous that
player is allowed to be). Tempo, master level and a master tone (dark ↔ open)
sit in the transport.

## Playing along

Check **Take the lead** to silence the synthetic lead and play Spark yourself
(`Q`/`W`/`E`), or jam on any voice at any time — see the on-screen key map.
Hold **Shift** for accented strokes. Live strokes get velocity life but no added
timing humanization: your hands supply that.

Power users: everything is scriptable from the console via `LATTICE.app`, e.g.
`LATTICE.app.ens.setControl("heat", 0.9)` or `LATTICE.app.ens.cue("break")`.

## Customizing

- `js/engine/patterns.js` — every part, variant, response figure, lead motif and
  transform. Events are `{p, stroke, a}` plus optional `anchor`, `soft`
  (quiet substitute), `d` (density gate) and `h` (heat gate).
- `js/engine/humanize.js` — per-player timing personalities (`H.profiles`) and
  the lilt curve (`LEAN_16`).
- `js/audio/voices.js` — the synthesis recipes for all fourteen strokes.

## Architecture

```
index.html
css/style.css
js/audio/voices.js     14 stroke synthesizers (dry, soft-attack house style)
js/audio/mixer.js      per-player buses → glue → tone → compressor → master
js/engine/humanize.js  lilt, spread profiles, jitter/drift, velocity life
js/engine/patterns.js  48-pulse pattern library, motif graph, transforms
js/engine/scheduler.js lookahead clock (25 ms timer, 140 ms horizon)
js/engine/ensemble.js  per-cycle planning: turns, calls, cues, gating
js/ui/visual.js        concentric-ring score with real (humanized) hit flares
js/ui/controls.js      sliders, cues, player strips, keyboard play
js/main.js             boot on first gesture
```
