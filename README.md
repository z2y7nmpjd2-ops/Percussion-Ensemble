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
| **Keel** | guide line | A dry two-pitch woodblock tick tracing the groove's key figure. Never varies — it is the reference everyone leans on. |
| **Root** | low anchor | Round swept-sine low drum, open and pressed strokes. Guards the ground and lays back behind the beat. |
| **Weave** | mid voice | Woodier mid drum living off the beat, interlocking against the low anchor; stitches sextuplet pairs at higher density. Trades variation turns with the lead. |
| **Spark** | lead voice | The fastest-speaking drum. Walks a motif graph, mutates its phrases, and issues calls the ensemble answers. |
| **Grain** | texture | A shaker with alternating push/pull strokes; thickens from 8ths to 16ths to sextuplet infill as density and heat rise. |
| **Halo** | color | Sparse, quickly-damped inharmonic metal marking the cycle's turning points. |

## The grid

A beat is always **12 pulses**, which holds duple 16ths (every 3 pulses),
sextuplets (every 2) and triplet 8ths (every 4) simultaneously, so parts
genuinely cross-group against each other rather than sharing one subdivision.
A cycle is 3–6 beats long depending on the groove; the hand-written one is
4 beats (48 pulses).

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

## Rolling new grooves

The per-cycle intelligence varies *how* a groove is played; the **Groove** panel
changes *what* the groove is. **Roll a new groove** grows an entirely new weave
from a fresh seed — a new key figure for the guide line, new placements for every
part, a new motif bank for the lead, and a new feel for the grid itself.

Generation is constrained rather than random, so the interlock survives every
re-roll. What varies:

- **Cycle length** — 3, 4, 5 or 6 beats (36, 48, 60 or 72 pulses). The beat is
  always 12 pulses, so every cycle keeps the same subdivisional density.
- **Archetype** — a whole-ensemble disposition (*open*, *driving*, *talking*,
  *deep*, *shimmer*) that decides how many anchors the low voice guards, how busy
  the middle is, what the texture may do, and how large the lead's vocabulary gets.
- **The guide line** — either an uneven key figure (a partition of the cycle whose
  spans differ, optionally rotated so it doesn't begin on the downbeat) or a
  steady pulse carrying a cross-cutting accent pattern. Even partitions are
  rejected, as are figures that never cut across the beat.
- **The low voice** picks a strategy: anchoring in the guide line's *gaps*,
  *lock*ing one anchor onto a guide stroke, walking a two-tone *line*, or
  treading a regular *pedal* that may cut across the beat.
- **The mid voice** then avoids the low anchors and either *punctuate*s sparsely,
  *ride*s a running subdivision snapped at a cross-period, or *answer*s within one
  half of the cycle, leaving the other half open for the lead.
- **The texture** runs *continuous*, *gapped* (resting whole beats), *pulsed*
  (dense on chosen beats only), *sparse*, or *shimmer* (sextuplet grid), with
  accents following either the beat or the key figure.
- **The color voice** marks the cycle's *turns*, repeats a small *figure*, or
  gathers in the *tail*.
- **The lead's** bank is grown across energy tiers using one of four phrase
  grammars — a stepping *walk*, a restated *cell*, a density *arc*, or isolated
  *punctuation* — plus two or three calls and a transition graph that settles
  after each one.
- **The feel** — the lilt curve the whole grid leans on — is drawn from seven
  archetypes and jittered, and each groove also nudges individual players' timing
  personalities, so two grooves with similar figures still sit differently.

Every groove is then checked for playability before it reaches your ears — enough
anchors to hold, no part too thin or too dense to breathe, no stroke outside the
cycle — and a groove that fails re-rolls automatically. Across 600 sampled seeds,
every groove was structurally unique.

Seeds are the whole story: **the same seed always grows the same groove**, so
typing `copper` into the seed box gives you the same weave on any machine. Share
the code, share the groove. A new groove queued while the ensemble is playing
lands on the next cycle line, never mid-phrase.

## Saving generations

**Save this groove** keeps the one you're hearing, along with the settings you
were playing it with — tempo, all five macros, tone, and each player's level,
vary and mute state. Saved grooves live in your browser's local storage and
survive reloads; rename one by typing over its name, bring it back with **Load**,
or **Delete** it. **House groove** returns to the hand-written original.

Saves store the complete pattern set, not just the seed, so a saved groove comes
back exactly as it left even if the generator changes later.

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

- `js/engine/patterns.js` — the hand-written groove: every part, variant,
  response figure, lead motif and transform. Events are `{p, stroke, a}` plus
  optional `anchor`, `soft` (quiet substitute), `d` (density gate) and `h`
  (heat gate). `P.houseSet()` packages it in the same shape the generator emits.
- `js/engine/generator.js` — the constraints that grow a groove from a seed:
  the key-figure partition, per-part placement rules, the motif grammar, the
  feel archetypes, and the playability check every groove must pass.
- `js/engine/humanize.js` — per-player timing personalities (`H.profiles`) and
  the default lilt curve (`LEAN_16`), which each groove's own feel overrides.
- `js/audio/voices.js` — the synthesis recipes for all fourteen strokes.

## Architecture

```
index.html
css/style.css
js/audio/voices.js     14 stroke synthesizers (dry, soft-attack house style)
js/audio/mixer.js      per-player buses → glue → tone → compressor → master
js/engine/humanize.js  lilt, spread profiles, jitter/drift, velocity life
js/engine/patterns.js  48-pulse house groove, motif graph, transforms
js/engine/generator.js seeded groove generation: archetypes, part strategies,
                       phrase grammars, playability checks
js/engine/scheduler.js lookahead clock (25 ms timer, 140 ms horizon)
js/engine/ensemble.js  per-cycle planning: turns, calls, cues, groove swaps
js/ui/visual.js        concentric-ring score with real (humanized) hit flares
js/ui/controls.js      sliders, cues, player strips, keyboard play
js/ui/grooves.js       roll / seed / save / load / delete the groove library
js/main.js             builds the instrument at load; Start resumes audio
```
