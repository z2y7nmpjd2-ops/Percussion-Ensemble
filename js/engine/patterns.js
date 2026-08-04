/* LATTICE — patterns.js
 * The weave itself. One cycle = 48 pulses (4 beats × 12), which holds
 * duple 16ths (every 3 pulses), sextuplets (every 2) and triplet 8ths
 * (every 4) on one grid — high subdivisional density with true
 * cross-grouping between parts.
 *
 * Event fields:
 *   p       pulse 0..47
 *   stroke  voice stroke name
 *   a       accent 0..1 (pre-humanization)
 *   anchor  never dropped or varied — the structural skeleton
 *   soft    quieter substitute stroke for stochastic articulation
 *   d       minimum Density control (0..1) for the event to sound
 *   h       minimum Heat for the event to sound (ghost/fill layer)
 */
(function () {
  "use strict";

  const P = { PPC: 48 };

  /* ---- KEEL: the asymmetric guide line all parts hang from.
   * Intervals in pulses: 9-9-6-9-9-6 — an uneven six-stroke key of our
   * own design. Two pitches trace its internal shape. Never varies. */
  P.keel = {
    base: [
      { p: 0,  stroke: "keel.tick", a: 1.0, anchor: true },
      { p: 9,  stroke: "keel.tock", a: 0.8, anchor: true },
      { p: 18, stroke: "keel.tick", a: 0.9, anchor: true },
      { p: 24, stroke: "keel.tock", a: 0.85, anchor: true },
      { p: 33, stroke: "keel.tock", a: 0.8, anchor: true },
      { p: 42, stroke: "keel.tick", a: 0.9, anchor: true }
    ],
    variants: []
  };

  /* ---- ROOT: low anchor. Sparse, behind the beat, guards the ground.
   * Speaks in the keel's gaps (12, 30, 36) rather than on its strokes. */
  P.root = {
    base: [
      { p: 3,  stroke: "root.press", a: 0.5, soft: "root.press", d: 0.35 },
      { p: 12, stroke: "root.open",  a: 0.9, anchor: true },
      { p: 21, stroke: "root.press", a: 0.55, d: 0.25 },
      { p: 30, stroke: "root.open",  a: 0.8, anchor: true },
      { p: 36, stroke: "root.open",  a: 0.95, anchor: true },
      { p: 45, stroke: "root.press", a: 0.5, d: 0.5 }
    ],
    variants: [
      // pickup roll into the 36 anchor
      [
        { p: 12, stroke: "root.open",  a: 0.9, anchor: true },
        { p: 30, stroke: "root.open",  a: 0.8, anchor: true },
        { p: 33, stroke: "root.press", a: 0.6 },
        { p: 34, stroke: "root.press", a: 0.5 },
        { p: 36, stroke: "root.open",  a: 1.0, anchor: true },
        { p: 45, stroke: "root.press", a: 0.5 }
      ],
      // displaced answer: open lands on 21 instead of pressing
      [
        { p: 3,  stroke: "root.press", a: 0.5 },
        { p: 12, stroke: "root.open",  a: 0.9, anchor: true },
        { p: 21, stroke: "root.open",  a: 0.75 },
        { p: 30, stroke: "root.press", a: 0.55 },
        { p: 36, stroke: "root.open",  a: 0.95, anchor: true },
        { p: 42, stroke: "root.press", a: 0.5 }
      ]
    ],
    response: [
      { p: 12, stroke: "root.open",  a: 0.95, anchor: true },
      { p: 24, stroke: "root.open",  a: 0.85 },
      { p: 27, stroke: "root.press", a: 0.6 },
      { p: 30, stroke: "root.open",  a: 0.9 },
      { p: 36, stroke: "root.open",  a: 1.0, anchor: true }
    ]
  };

  /* ---- WEAVE: the middle voice, living off the beat. Its tones sit on
   * offbeat 16ths that interlock against keel and root; at higher
   * density it stitches sextuplet pairs (2-pulse spacings) between them. */
  P.weave = {
    base: [
      { p: 6,  stroke: "weave.tone",  a: 0.7, soft: "weave.touch" },
      { p: 15, stroke: "weave.snap",  a: 0.8, anchor: true },
      { p: 21, stroke: "weave.tone",  a: 0.65, soft: "weave.touch" },
      { p: 27, stroke: "weave.tone",  a: 0.7, soft: "weave.touch" },
      { p: 32, stroke: "weave.touch", a: 0.4, d: 0.55 },
      { p: 34, stroke: "weave.touch", a: 0.45, d: 0.55 },
      { p: 39, stroke: "weave.snap",  a: 0.85, anchor: true },
      { p: 45, stroke: "weave.tone",  a: 0.6, soft: "weave.touch" },
      // ghost layer, appears with heat
      { p: 11, stroke: "weave.touch", a: 0.3, h: 0.45 },
      { p: 23, stroke: "weave.touch", a: 0.3, h: 0.55 },
      { p: 44, stroke: "weave.touch", a: 0.32, h: 0.5 }
    ],
    variants: [
      // doubled snap conversation in the second half
      [
        { p: 6,  stroke: "weave.tone", a: 0.7 },
        { p: 15, stroke: "weave.snap", a: 0.8, anchor: true },
        { p: 21, stroke: "weave.tone", a: 0.65 },
        { p: 27, stroke: "weave.snap", a: 0.75 },
        { p: 30, stroke: "weave.tone", a: 0.55 },
        { p: 33, stroke: "weave.tone", a: 0.6 },
        { p: 39, stroke: "weave.snap", a: 0.9, anchor: true },
        { p: 42, stroke: "weave.touch", a: 0.45 },
        { p: 45, stroke: "weave.tone", a: 0.6 }
      ],
      // sextuplet stitch across beats 1–2
      [
        { p: 6,  stroke: "weave.tone",  a: 0.7 },
        { p: 10, stroke: "weave.touch", a: 0.4 },
        { p: 12, stroke: "weave.touch", a: 0.45 },
        { p: 15, stroke: "weave.snap",  a: 0.85, anchor: true },
        { p: 21, stroke: "weave.tone",  a: 0.65 },
        { p: 27, stroke: "weave.tone",  a: 0.7 },
        { p: 39, stroke: "weave.snap",  a: 0.85, anchor: true },
        { p: 45, stroke: "weave.tone",  a: 0.6 }
      ]
    ],
    response: [
      { p: 15, stroke: "weave.snap", a: 0.9, anchor: true },
      { p: 18, stroke: "weave.tone", a: 0.7 },
      { p: 20, stroke: "weave.tone", a: 0.6 },
      { p: 22, stroke: "weave.tone", a: 0.7 },
      { p: 24, stroke: "weave.snap", a: 0.85 },
      { p: 33, stroke: "weave.tone", a: 0.7 },
      { p: 39, stroke: "weave.snap", a: 0.9, anchor: true }
    ]
  };

  /* ---- GRAIN: the continuous texture. Three density tiers; forward and
   * back strokes alternate so accents ride a physical motion. */
  P.grain = {
    base: (function () {
      const ev = [];
      for (let s = 0; s < 16; s++) {
        const p = s * 3;
        const fwd = s % 2 === 0;
        ev.push({
          p: p,
          stroke: fwd ? "grain.push" : "grain.pull",
          a: (p % 12 === 0) ? 0.9 : (p % 6 === 0 ? 0.55 : 0.38),
          d: (p % 6 === 0) ? 0 : 0.3,          // 8ths always, 16ths need density
          anchor: p % 12 === 0
        });
      }
      // sextuplet infill on beat 4, needs heat AND density
      ev.push({ p: 38, stroke: "grain.pull", a: 0.4, d: 0.6, h: 0.5 });
      ev.push({ p: 40, stroke: "grain.push", a: 0.45, d: 0.6, h: 0.5 });
      ev.push({ p: 44, stroke: "grain.pull", a: 0.4, d: 0.6, h: 0.6 });
      ev.push({ p: 46, stroke: "grain.push", a: 0.45, d: 0.6, h: 0.6 });
      return ev;
    })(),
    variants: []
  };

  /* ---- HALO: rare metallic punctuation at the cycle's turning points. */
  P.halo = {
    base: [
      { p: 24, stroke: "halo.damp", a: 0.5, d: 0.45 },
      { p: 42, stroke: "halo.ring", a: 0.6, d: 0.3 },
      { p: 45, stroke: "halo.damp", a: 0.4, h: 0.6 }
    ],
    variants: [
      [
        { p: 18, stroke: "halo.damp", a: 0.45 },
        { p: 42, stroke: "halo.ring", a: 0.65 }
      ]
    ]
  };

  /* ---- SPARK: the lead. A bank of one-cycle motifs, some marked as
   * CALLS (they announce a conversation; the ensemble answers next
   * cycle). `after` weights make phrases follow each other musically. */
  P.sparkMotifs = [
    { id: "rest", energy: 0.0, call: false, after: { seed: 3, roll: 2, offset: 2 },
      ev: [] },
    { id: "seed", energy: 0.25, call: false, after: { seed: 2, roll: 3, offset: 3, rise: 2 },
      ev: [
        { p: 18, stroke: "spark.open",  a: 0.7 },
        { p: 24, stroke: "spark.touch", a: 0.45 },
        { p: 33, stroke: "spark.open",  a: 0.75 }
      ] },
    { id: "offset", energy: 0.4, call: false, after: { seed: 2, roll: 3, rise: 3, callA: 1 },
      ev: [
        { p: 3,  stroke: "spark.crack", a: 0.7 },
        { p: 9,  stroke: "spark.open",  a: 0.65 },
        { p: 15, stroke: "spark.crack", a: 0.75 },
        { p: 27, stroke: "spark.open",  a: 0.7 },
        { p: 30, stroke: "spark.touch", a: 0.45 },
        { p: 39, stroke: "spark.open",  a: 0.7 }
      ] },
    { id: "roll", energy: 0.55, call: false, after: { seed: 2, offset: 2, rise: 3, callA: 2 },
      ev: [
        { p: 6,  stroke: "spark.open",  a: 0.7 },
        { p: 12, stroke: "spark.touch", a: 0.4 },
        { p: 14, stroke: "spark.touch", a: 0.45 },
        { p: 16, stroke: "spark.touch", a: 0.5 },
        { p: 18, stroke: "spark.crack", a: 0.85 },
        { p: 30, stroke: "spark.open",  a: 0.7 },
        { p: 36, stroke: "spark.crack", a: 0.8 },
        { p: 42, stroke: "spark.open",  a: 0.65 }
      ] },
    { id: "rise", energy: 0.7, call: false, after: { callA: 3, callB: 2, roll: 2, seed: 1 },
      ev: [
        { p: 0,  stroke: "spark.open",  a: 0.8 },
        { p: 9,  stroke: "spark.crack", a: 0.8 },
        { p: 18, stroke: "spark.open",  a: 0.75 },
        { p: 22, stroke: "spark.touch", a: 0.5 },
        { p: 26, stroke: "spark.touch", a: 0.55 },
        { p: 30, stroke: "spark.crack", a: 0.85 },
        { p: 33, stroke: "spark.open",  a: 0.7 },
        { p: 36, stroke: "spark.crack", a: 0.9 },
        { p: 40, stroke: "spark.touch", a: 0.5 },
        { p: 42, stroke: "spark.open",  a: 0.75 },
        { p: 45, stroke: "spark.crack", a: 0.8 }
      ] },
    { id: "callA", energy: 0.85, call: true, after: { seed: 3, offset: 2 },
      ev: [
        { p: 0,  stroke: "spark.crack", a: 1.0, anchor: true },
        { p: 4,  stroke: "spark.crack", a: 0.85 },
        { p: 8,  stroke: "spark.crack", a: 0.9 },
        { p: 12, stroke: "spark.open",  a: 0.95, anchor: true },
        { p: 18, stroke: "spark.open",  a: 0.8 },
        { p: 21, stroke: "spark.crack", a: 0.95 }
      ] },
    { id: "callB", energy: 0.9, call: true, after: { seed: 2, roll: 2 },
      ev: [
        { p: 6,  stroke: "spark.crack", a: 0.9 },
        { p: 8,  stroke: "spark.touch", a: 0.55 },
        { p: 10, stroke: "spark.crack", a: 0.9 },
        { p: 12, stroke: "spark.open",  a: 1.0, anchor: true },
        { p: 16, stroke: "spark.touch", a: 0.55 },
        { p: 18, stroke: "spark.crack", a: 0.95 },
        { p: 24, stroke: "spark.open",  a: 0.9, anchor: true }
      ] }
  ];

  /* Motif transforms — small mutations so no phrase returns identical. */
  P.transforms = {
    // shift the whole phrase 3 pulses later (a 16th displacement)
    displace: function (ev, ppc) {
      const N = ppc || P.PPC;
      return ev.map(e => Object.assign({}, e, { p: (e.p + 3) % N }));
    },
    // add a soft pickup 2 pulses before the first stroke
    pickup: function (ev, ppc) {
      if (!ev.length) return ev;
      const N = ppc || P.PPC;
      const first = ev[0];
      const pre = { p: (first.p + N - 2) % N, stroke: "spark.touch", a: first.a * 0.5 };
      return [pre].concat(ev);
    },
    // double one mid-phrase stroke at sextuplet distance
    stutter: function (ev, ppc) {
      if (ev.length < 2) return ev;
      const N = ppc || P.PPC;
      const i = 1 + Math.floor(Math.random() * (ev.length - 1));
      const e = ev[i];
      const echo = { p: (e.p + 2) % N, stroke: "spark.touch", a: e.a * 0.65 };
      return ev.slice(0, i + 1).concat([echo], ev.slice(i + 1));
    },
    // thin the phrase: drop non-anchor strokes with 40% chance
    thin: function (ev, ppc) {
      return ev.filter(e => e.anchor || Math.random() > 0.4);
    }
  };

  /* ---- BREAK: one unison cycle everyone plays, then air, then back in. */
  P.breakFigure = {
    keel:  [0, 9, 18, 24, 33].map(p => ({ p, stroke: "keel.tick", a: 1, anchor: true })),
    root:  [0, 9, 18, 24, 33].map(p => ({ p, stroke: "root.open", a: 1, anchor: true }))
             .concat([{ p: 36, stroke: "root.open", a: 1, anchor: true }]),
    weave: [0, 9, 18, 24, 33].map(p => ({ p, stroke: "weave.snap", a: 1, anchor: true })),
    spark: [0, 9, 18, 24, 33].map(p => ({ p, stroke: "spark.crack", a: 1, anchor: true })),
    grain: [0, 9, 18, 24, 33].map(p => ({ p, stroke: "grain.push", a: 0.9, anchor: true })),
    halo:  [{ p: 33, stroke: "halo.ring", a: 0.9, anchor: true }]
  };

  /* ---- The hand-written groove, packaged in the same shape the
   * generator produces, so it is simply one groove among many. */
  P.houseSet = function () {
    return {
      seed: "HOUSE",
      name: "House Weave",
      ppc: 48,
      feel: { id: "rolling", lean: [0, 0.42, -0.08, 0.3] },
      keel:  { base: P.keel.base,  variants: [] },
      root:  { base: P.root.base,  variants: P.root.variants,  response: P.root.response },
      weave: { base: P.weave.base, variants: P.weave.variants, response: P.weave.response },
      grain: { base: P.grain.base, variants: [] },
      halo:  { base: P.halo.base,  variants: P.halo.variants },
      sparkMotifs: P.sparkMotifs,
      breakFigure: P.breakFigure,
      meta: {
        beats: 4,
        key: "9·9·6·9·9·6",
        feel: "rolling",
        archetype: "house",
        low: "gaps",
        mid: "punctuate",
        grain: "continuous",
        grainLock: "beat",
        rootAnchors: 3
      }
    };
  };

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Patterns = P;
})();
