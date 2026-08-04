# LATTICE

**A synthetic drum circle — a playable instrument for live performance and
accompaniment.**

Six synthesized drums play as a circle of listening musicians. Every one of them
is **muted and unpitched**. Three are a *family* separated by register, whose
parts are not three patterns but one composite line handed out across three
registers; each of those players also carries a hand striker, and the strikers
interlock into a subdivision none of them plays alone.
Underneath sits an accompaniment drum holding a repeating cell steady, and above
it a lead drum that calls, answers, and solos. A hard dry timeline runs through
everything.

You conduct with a handful of macro controls and cues, roll entirely new circles
from a seed, and save the ones worth keeping — or take the lead drum yourself and
play it from your keyboard while the circle accompanies you.

All sound is generated live by the Web Audio API. There are no samples.

## Run it

Open `index.html` in any modern browser (plain scripts, no build step, works from
`file://`) and press **Start**. Or serve the folder:

```
npx serve .        # or: python3 -m http.server
```

## The circle

| Voice | Role | Character |
|-------|------|-----------|
| **Spine** | timeline | A hard, dry two-pitch striker line, the shortest sound in the circle. Never varies — it is the reference everyone leans on. |
| **Floor** | family, low | The lowest register of the family. Decays longest and carries the line's settling points. Open and muted stick strokes, plus a striker. |
| **Column** | family, mid | The middle register. Open, muted, striker. |
| **Arch** | family, high | The highest register; speaks and dies away quickest. Open, muted, striker. |
| **Drive** | engine | The accompaniment hand drum. Bass, tone, slap and ghost strokes in a repeating cell that the rest of the circle counts on. |
| **Caller** | lead | The lead hand drum — smaller, so it speaks faster. Issues calls the circle answers, and takes the solos. |

## The sound

Every voice is a drum, and every drum is **muted and atonal**.

**Atonal.** There is not one oscillator in the instrument. Each stroke is a burst
of noise shaped by a bank of bandpass resonators sitting at inharmonic ratios
(1 : 1.62 : 2.51 : 3.77), with Q held near 1 so no partial can ever narrow into a
note. Where weight is needed it comes from noise driven through a resonant
lowpass whose cutoff falls fast — heft and a sense of "low" with no frequency to
name. On top of that, **every stroke lands somewhere slightly different**: band
centres are jittered 10–17% per hit, so no two strokes share a frequency and no
pitch centre can form across a pattern.

The drums are separated by **register, not interval**. Each groove picks a
spacing (close, mid, wide, steep) whose every pair — mid/low, high/mid, high/low
— is deliberately kept clear of the simple ratios (5:4, 4:3, 3:2, 5:3, 2:1, 5:2,
3:1) that would put a chord back into the family.

**Muted.** Everything is damped. Measured from rendered strokes, the longest
sound in the circle falls 40 dB in about 40 ms and most are 13–25 ms; there is no
ring anywhere.

**Still dry at the transient.** Every attack is ramped 2.4–6 ms rather than
clicked, contact noise is double-poled so a slap cannot become a hiss, and the
only "space" is a 60 ms synthetic glue at −18 dB.

Verified against a pure-tone control that scores 1.000 on the same metrics, every
stroke measures a periodicity of 0.13–0.46 and a spectral flatness of 0.30–0.79,
with no single spectral bin owning more than 8% of the energy. Registers still
ascend across the family, which is what lets the composite line read as a
contour — of register and colour rather than of pitch.

## The grid

A beat is always **12 pulses**, which carries both meters exactly:

- **binary** — subdivision every 3 pulses, four to a beat
- **ternary** — subdivision every 4 pulses, three to a beat

Each groove picks one, and the choice reaches everything: the spans the timeline
is built from, the grid the family's line lands on, the engine's cell, the
lead's phrase steps, and the lilt curve (four lean values per beat in a binary
groove, three in a ternary one). A cycle is 3–6 beats long. The hand-written
groove is ternary, four beats — twelve subdivisions to a cycle.

## What makes it feel played, not programmed

- **Lilt** — a systematic lean of the subdivisions inside each beat, interpolated
  so fast fills ride the same wave instead of snapping back to straight time.
- **Spread** — each player has a persistent timing personality: the timeline is
  the tightest thing in the circle, the low drum sits furthest back (~5 ms), the
  lead leans forward into its phrases (~3 ms), each with a slow drift on top.
- **Loose** — gaussian per-stroke jitter, velocity life (downbeats steadier than
  weak positions), and stochastic articulation: weak strokes occasionally soften
  or drop. Structural anchors never fray.
- **Two hands** — a family player strikes the drum with one hand and the striker
  with the other, so both may land on the same pulse. That pairing is a large
  part of how the family sounds.

## How the players listen to each other

- **The family moves as one.** Its three parts are a single line; a variation
  re-voices the whole line through a new contour rather than changing one drum.
- **Turn-taking** — variation privilege alternates between the lead and the
  family every two cycles, so they trade phrases instead of talking over each
  other. The engine holds steady underneath both, varying rarely by design.
- **Call & answer** — some lead phrases are calls. The next cycle the family
  closes ranks into its answer figure and the engine digs in. Calls emerge
  spontaneously from high heat, or you cue one — including while *you* hold the
  lead.
- **Phrase memory** — the lead chooses phrases through weighted transitions from
  its current one, energy-matched to the heat level, then mutates them so nothing
  returns identical.

## Rolling new circles

**Roll a new groove** grows an entirely new circle from a fresh seed. Generation
is constrained rather than random, so the interlock survives every re-roll:

- **Meter and cycle length** — binary or ternary, 3–6 beats.
- **Spacing** — how far apart the family's three registers sit, and where the
  set as a whole starts, so each circle has its own range.
- **The timeline** — an uneven partition of the cycle into spans that are all
  multiples of the subdivision. Even partitions are rejected: they would give the
  circle nothing to lean on, as would a figure that never cuts across the beat.
- **The family's line** — a rhythm across the subdivision grid, then a
  *contour* (rise, fall, arch, valley, rock, pedal) deciding which drum speaks
  each time. Stepwise motion is preferred over leaps, and the line settles onto
  the low drum where the cycle turns over. Muted strokes fill where the line is
  silent, and an occasional drag doubles a stroke a half-subdivision later.
- **The strikers** — *split* (three hands, one continuous line between them),
  *layer* (low on the beat, mid off it, high tracing the timeline), *double*, or
  *sparse*.
- **The engine** — a cell of 1–N beats, stated as many times as the cycle allows,
  with a bass anchor, a slap on a chosen offbeat, and tones and ghosts between;
  the last statement leans out rather than repeating flat.
- **The lead's bank** — grown across energy tiers from four phrase grammars (a
  stepping *walk*, a restated *cell*, a density *arc*, isolated *punctuation*),
  plus two or three calls and a transition graph that settles after each one.
- **The feel** — a lilt archetype matched to the meter, plus per-groove nudges to
  each player's personal timing.

Every circle is checked for playability before it reaches your ears — the line
needs enough strokes, at least two drums must voice it, the engine needs its
anchor, and no stroke may fall outside the cycle. A circle that fails re-rolls
automatically. Across 600 sampled seeds, every groove was structurally unique.

Seeds are the whole story: **the same seed always grows the same circle**, so
typing `copper` into the seed box gives the same one on any machine. A groove
queued while the circle is playing lands on the next cycle line, never mid-phrase.

## Saving circles

**Save this groove** keeps the one you're hearing along with the settings you
were playing it with — tempo, all five macros, tone, and each player's level,
vary and mute state. Saved circles live in your browser's local storage and
survive reloads; rename one by typing over its name, bring it back with **Load**,
or **Delete** it. **House groove** returns to the hand-written original. Saves
store the complete pattern set, not just the seed, so a saved circle comes back
exactly as it left even if the generator changes later.

## Conducting

| Control | Effect |
|---------|--------|
| **Heat** | circle energy: variation probability, ghost layer, lead phrase energy, dynamic ceiling |
| **Density** | how full the supporting parts play (muted fills, strikers, ghosts) |
| **Lilt** | amount of the shared subdivision lean |
| **Spread** | scale of each player's personal timing lean and drift |
| **Loose** | human jitter, drift and velocity variance |
| **Call & Answer** | arms a call; fires at the next phrase boundary |
| **Break** | one cycle where the whole circle lands on the timeline together |
| **Lift / Simmer** | ramp heat up / down over several cycles |

Each player strip has **Mute**, **Level** and **Vary** (how adventurous that
player is allowed to be — the three family members' Vary settings average into
one decision for the family). Tempo, master level and a master tone sit in the
transport.

## Playing along

Check **Take the lead** to silence the synthetic lead and play Caller yourself,
or jam on any voice at any time — see the on-screen key map. Hold **Shift** for
accented strokes. Live strokes get velocity life but no added timing
humanization: your hands supply that.

Power users: everything is scriptable from the console via `LATTICE.app`, e.g.
`LATTICE.app.ens.regenerate("copper")` or `LATTICE.app.ens.cue("break")`.

## Customizing

- `js/engine/patterns.js` — the hand-written circle, and the lead's phrase
  transforms. `P.houseSet()` packages it in the shape the generator emits.
- `js/engine/generator.js` — meter and register spacing, the timeline partition, the
  composite-line contour grammar, striker styles, engine cells, phrase
  grammars, and the playability check every circle must pass.
- `js/audio/voices.js` — the resonator banks, low-body and contact layers behind
  all nineteen strokes, plus the per-stroke frequency spread.
- `js/engine/humanize.js` — per-player timing personalities and the lilt curve.

## Architecture

```
index.html
css/style.css
js/audio/voices.js     19 muted, unpitched drum strokes: noise through
                       inharmonic low-Q resonators, jittered per stroke
js/audio/mixer.js      per-player buses → glue → tone → compressor → master
js/engine/humanize.js  meter-aware lilt, timing personalities, velocity life
js/engine/patterns.js  the hand-written circle, lead phrase transforms
js/engine/generator.js seeded generation: meter, register spacing, contour,
                       strikers, engine cells, phrase grammars
js/engine/scheduler.js lookahead clock (25 ms timer, 140 ms horizon)
js/engine/ensemble.js  per-cycle planning; the family plans as one part
js/ui/visual.js        concentric-ring score with real (humanized) hit flares
js/ui/controls.js      sliders, cues, player strips, keyboard play
js/ui/grooves.js       roll / seed / save / load / delete the circle library
js/main.js             builds the instrument at load; Start resumes audio
```
