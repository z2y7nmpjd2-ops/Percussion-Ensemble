/* LATTICE — patterns.js
 * The hand-written groove, and the transforms the lead uses on its own
 * phrases. Everything here is one groove among many: the generator emits
 * exactly this shape.
 *
 * A beat is 12 pulses, which carries both meters at once:
 *   binary  — subdivision every 3 pulses (4 per beat)
 *   ternary — subdivision every 4 pulses (3 per beat)
 * The house groove is ternary: 4 beats = 12 subdivisions to a cycle.
 *
 * Event fields:
 *   p       pulse within the cycle
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

  /* ---- SPINE: the timeline. Seven strokes across twelve subdivisions,
   * spans 8-8-4-8-8-8-4 — uneven by design, and cutting across the beat
   * everywhere except its first stroke. Never varies. */
  const SPINE = [
    { p: 0,  stroke: "spine.high", a: 1.0,  anchor: true },
    { p: 8,  stroke: "spine.low",  a: 0.82, anchor: true },
    { p: 16, stroke: "spine.high", a: 0.9,  anchor: true },
    { p: 20, stroke: "spine.low",  a: 0.78, anchor: true },
    { p: 28, stroke: "spine.high", a: 0.88, anchor: true },
    { p: 36, stroke: "spine.low",  a: 0.82, anchor: true },
    { p: 44, stroke: "spine.high", a: 0.8,  anchor: true }
  ];

  /* ---- THE FAMILY: three tuned stick drums whose parts are one line.
   * Read the three together and a melody appears — low, mid, high, high,
   * low, mid … — with each drum resting while its neighbours speak.
   * Each player also carries a striker; the three strikers interlock
   * into a continuous subdivision none of them plays alone. */
  const FAMILY_BASE = {
    floor: [
      { p: 0,  stroke: "floor.open", a: 0.95, anchor: true },
      { p: 20, stroke: "floor.open", a: 0.85, anchor: true },
      { p: 32, stroke: "floor.open", a: 0.8 },
      { p: 12, stroke: "floor.mute", a: 0.4, d: 0.45 },
      // striker: on the beat
      { p: 0,  stroke: "floor.bell", a: 0.6 },
      { p: 12, stroke: "floor.bell", a: 0.5 },
      { p: 24, stroke: "floor.bell", a: 0.55 },
      { p: 36, stroke: "floor.bell", a: 0.5 }
    ],
    column: [
      { p: 8,  stroke: "column.open", a: 0.8, anchor: true },
      { p: 24, stroke: "column.open", a: 0.75 },
      { p: 40, stroke: "column.open", a: 0.8 },
      { p: 4,  stroke: "column.mute", a: 0.38, d: 0.5 },
      { p: 28, stroke: "column.mute", a: 0.36, d: 0.6 },
      // striker: the offbeat subdivision
      { p: 8,  stroke: "column.bell", a: 0.5, d: 0.25 },
      { p: 20, stroke: "column.bell", a: 0.45, d: 0.25 },
      { p: 32, stroke: "column.bell", a: 0.5, d: 0.25 },
      { p: 44, stroke: "column.bell", a: 0.45, d: 0.25 }
    ],
    arch: [
      { p: 12, stroke: "arch.open", a: 0.72 },
      { p: 16, stroke: "arch.open", a: 0.78, anchor: true },
      { p: 36, stroke: "arch.open", a: 0.75 },
      { p: 44, stroke: "arch.open", a: 0.7 },
      { p: 30, stroke: "arch.mute", a: 0.34, h: 0.5 },
      // striker: the remaining subdivision, completing the pulse
      { p: 4,  stroke: "arch.bell", a: 0.45, d: 0.4 },
      { p: 16, stroke: "arch.bell", a: 0.42, d: 0.4 },
      { p: 28, stroke: "arch.bell", a: 0.45, d: 0.4 },
      { p: 40, stroke: "arch.bell", a: 0.42, d: 0.4 }
    ]
  };

  // The family shifts its composite line together, never one drum alone.
  const FAMILY_VARIANTS = [
    {
      floor: [
        { p: 0,  stroke: "floor.open", a: 0.95, anchor: true },
        { p: 16, stroke: "floor.open", a: 0.8 },
        { p: 20, stroke: "floor.open", a: 0.85, anchor: true },
        { p: 0,  stroke: "floor.bell", a: 0.6 },
        { p: 12, stroke: "floor.bell", a: 0.5 },
        { p: 24, stroke: "floor.bell", a: 0.55 },
        { p: 36, stroke: "floor.bell", a: 0.5 }
      ],
      column: [
        { p: 8,  stroke: "column.open", a: 0.8, anchor: true },
        { p: 28, stroke: "column.open", a: 0.72 },
        { p: 32, stroke: "column.open", a: 0.7 },
        { p: 40, stroke: "column.open", a: 0.8 },
        { p: 8,  stroke: "column.bell", a: 0.5, d: 0.25 },
        { p: 20, stroke: "column.bell", a: 0.45, d: 0.25 },
        { p: 32, stroke: "column.bell", a: 0.5, d: 0.25 },
        { p: 44, stroke: "column.bell", a: 0.45, d: 0.25 }
      ],
      arch: [
        { p: 12, stroke: "arch.open", a: 0.75 },
        { p: 36, stroke: "arch.open", a: 0.78, anchor: true },
        { p: 44, stroke: "arch.open", a: 0.72 },
        { p: 4,  stroke: "arch.bell", a: 0.45, d: 0.4 },
        { p: 16, stroke: "arch.bell", a: 0.42, d: 0.4 },
        { p: 28, stroke: "arch.bell", a: 0.45, d: 0.4 },
        { p: 40, stroke: "arch.bell", a: 0.42, d: 0.4 }
      ]
    }
  ];

  // The answer: the family closes ranks and drives to the cycle's end.
  const FAMILY_RESPONSE = {
    floor: [
      { p: 0,  stroke: "floor.open", a: 1.0, anchor: true },
      { p: 24, stroke: "floor.open", a: 0.9 },
      { p: 32, stroke: "floor.open", a: 0.85 },
      { p: 0,  stroke: "floor.bell", a: 0.6 },
      { p: 12, stroke: "floor.bell", a: 0.5 },
      { p: 24, stroke: "floor.bell", a: 0.55 },
      { p: 36, stroke: "floor.bell", a: 0.5 }
    ],
    column: [
      { p: 8,  stroke: "column.open", a: 0.85, anchor: true },
      { p: 16, stroke: "column.open", a: 0.75 },
      { p: 28, stroke: "column.open", a: 0.8 },
      { p: 40, stroke: "column.open", a: 0.85 },
      { p: 8,  stroke: "column.bell", a: 0.5 },
      { p: 20, stroke: "column.bell", a: 0.45 },
      { p: 32, stroke: "column.bell", a: 0.5 },
      { p: 44, stroke: "column.bell", a: 0.45 }
    ],
    arch: [
      { p: 12, stroke: "arch.open", a: 0.8 },
      { p: 20, stroke: "arch.open", a: 0.78 },
      { p: 36, stroke: "arch.open", a: 0.85, anchor: true },
      { p: 44, stroke: "arch.open", a: 0.8 },
      { p: 4,  stroke: "arch.bell", a: 0.45 },
      { p: 16, stroke: "arch.bell", a: 0.42 },
      { p: 28, stroke: "arch.bell", a: 0.45 },
      { p: 40, stroke: "arch.bell", a: 0.42 }
    ]
  };

  /* ---- DRIVE: the accompaniment hand drum, the engine of the circle.
   * A two-beat cell stated twice: bass, ghost, tone, slap, ghost, tone.
   * It holds steady while the family and the lead converse. */
  const DRIVE_BASE = (function () {
    const ev = [];
    for (let cell = 0; cell < 2; cell++) {
      const o = cell * 24;
      ev.push({ p: o + 0,  stroke: "drive.bass",  a: 0.9, anchor: true });
      ev.push({ p: o + 4,  stroke: "drive.ghost", a: 0.3, d: 0.4 });
      ev.push({ p: o + 8,  stroke: "drive.tone",  a: 0.62, soft: "drive.ghost" });
      ev.push({ p: o + 12, stroke: "drive.slap",  a: 0.85, anchor: true });
      ev.push({ p: o + 16, stroke: "drive.ghost", a: 0.3, d: 0.4 });
      ev.push({ p: o + 20, stroke: "drive.tone",  a: 0.6, soft: "drive.ghost" });
    }
    ev.push({ p: 46, stroke: "drive.ghost", a: 0.28, h: 0.55 });
    return ev;
  })();

  const DRIVE_VARIANTS = [[
    { p: 0,  stroke: "drive.bass",  a: 0.9, anchor: true },
    { p: 8,  stroke: "drive.tone",  a: 0.6 },
    { p: 12, stroke: "drive.slap",  a: 0.85, anchor: true },
    { p: 20, stroke: "drive.slap",  a: 0.7 },
    { p: 24, stroke: "drive.bass",  a: 0.85 },
    { p: 32, stroke: "drive.tone",  a: 0.6 },
    { p: 36, stroke: "drive.slap",  a: 0.88 },
    { p: 40, stroke: "drive.ghost", a: 0.32, d: 0.5 },
    { p: 44, stroke: "drive.tone",  a: 0.55 }
  ]];

  const DRIVE_RESPONSE = [
    { p: 0,  stroke: "drive.bass", a: 0.95, anchor: true },
    { p: 8,  stroke: "drive.slap", a: 0.8 },
    { p: 12, stroke: "drive.slap", a: 0.9, anchor: true },
    { p: 16, stroke: "drive.tone", a: 0.65 },
    { p: 24, stroke: "drive.bass", a: 0.9 },
    { p: 32, stroke: "drive.slap", a: 0.85 },
    { p: 36, stroke: "drive.slap", a: 0.92 },
    { p: 44, stroke: "drive.tone", a: 0.68 }
  ];

  /* ---- CALLER: the lead hand drum. A bank of one-cycle phrases; some
   * are CALLS that announce a conversation the circle answers next
   * cycle. `after` weights make phrases follow each other musically. */
  const CALLER_MOTIFS = [
    { id: "rest", energy: 0, call: false, after: { seed: 3, roll: 2, offset: 2 }, ev: [] },

    { id: "seed", energy: 0.25, call: false,
      after: { seed: 2, roll: 3, offset: 3, rise: 2 },
      ev: [
        { p: 16, stroke: "caller.tone", a: 0.68 },
        { p: 24, stroke: "caller.ghost", a: 0.4 },
        { p: 32, stroke: "caller.tone", a: 0.72 }
      ] },

    { id: "offset", energy: 0.4, call: false,
      after: { seed: 2, roll: 3, rise: 3, callA: 1 },
      ev: [
        { p: 4,  stroke: "caller.slap",  a: 0.72 },
        { p: 12, stroke: "caller.tone",  a: 0.66 },
        { p: 20, stroke: "caller.slap",  a: 0.75 },
        { p: 28, stroke: "caller.bass",  a: 0.7 },
        { p: 36, stroke: "caller.tone",  a: 0.68 },
        { p: 44, stroke: "caller.ghost", a: 0.42 }
      ] },

    { id: "roll", energy: 0.55, call: false,
      after: { seed: 2, offset: 2, rise: 3, callA: 2 },
      ev: [
        { p: 8,  stroke: "caller.bass",  a: 0.72 },
        { p: 14, stroke: "caller.ghost", a: 0.4 },
        { p: 16, stroke: "caller.ghost", a: 0.45 },
        { p: 18, stroke: "caller.tone",  a: 0.6 },
        { p: 20, stroke: "caller.slap",  a: 0.86 },
        { p: 32, stroke: "caller.tone",  a: 0.7 },
        { p: 40, stroke: "caller.slap",  a: 0.82 },
        { p: 44, stroke: "caller.tone",  a: 0.64 }
      ] },

    { id: "rise", energy: 0.7, call: false,
      after: { callA: 3, callB: 2, roll: 2, seed: 1 },
      ev: [
        { p: 0,  stroke: "caller.bass",  a: 0.82 },
        { p: 8,  stroke: "caller.slap",  a: 0.8 },
        { p: 16, stroke: "caller.tone",  a: 0.74 },
        { p: 22, stroke: "caller.ghost", a: 0.45 },
        { p: 24, stroke: "caller.tone",  a: 0.7 },
        { p: 28, stroke: "caller.slap",  a: 0.86 },
        { p: 34, stroke: "caller.ghost", a: 0.44 },
        { p: 36, stroke: "caller.slap",  a: 0.9 },
        { p: 44, stroke: "caller.tone",  a: 0.72 }
      ] },

    { id: "callA", energy: 0.85, call: true, after: { seed: 3, offset: 2 },
      ev: [
        { p: 0,  stroke: "caller.slap", a: 1.0,  anchor: true },
        { p: 4,  stroke: "caller.slap", a: 0.85 },
        { p: 8,  stroke: "caller.slap", a: 0.9 },
        { p: 12, stroke: "caller.bass", a: 0.95, anchor: true },
        { p: 20, stroke: "caller.tone", a: 0.8 },
        { p: 24, stroke: "caller.slap", a: 0.95 }
      ] },

    { id: "callB", energy: 0.9, call: true, after: { seed: 2, roll: 2 },
      ev: [
        { p: 8,  stroke: "caller.slap",  a: 0.9 },
        { p: 10, stroke: "caller.ghost", a: 0.5 },
        { p: 12, stroke: "caller.slap",  a: 0.92 },
        { p: 16, stroke: "caller.bass",  a: 1.0, anchor: true },
        { p: 24, stroke: "caller.tone",  a: 0.7 },
        { p: 28, stroke: "caller.slap",  a: 0.95 },
        { p: 36, stroke: "caller.bass",  a: 0.9, anchor: true }
      ] }
  ];

  /* Motif transforms — small mutations so no phrase returns identical. */
  P.transforms = {
    // shift the whole phrase one subdivision later
    displace: function (ev, ppc, step) {
      const N = ppc || P.PPC, s = step || 4;
      return ev.map(e => Object.assign({}, e, { p: (e.p + s) % N }));
    },
    // add a soft pickup just before the first stroke
    pickup: function (ev, ppc) {
      if (!ev.length) return ev;
      const N = ppc || P.PPC;
      const first = ev[0];
      const pre = { p: (first.p + N - 2) % N, stroke: "caller.ghost", a: first.a * 0.5 };
      return [pre].concat(ev);
    },
    // double one mid-phrase stroke a hair later
    stutter: function (ev, ppc) {
      if (ev.length < 2) return ev;
      const N = ppc || P.PPC;
      const i = 1 + Math.floor(Math.random() * (ev.length - 1));
      const e = ev[i];
      const echo = { p: (e.p + 2) % N, stroke: "caller.ghost", a: e.a * 0.65 };
      return ev.slice(0, i + 1).concat([echo], ev.slice(i + 1));
    },
    // thin the phrase: drop non-anchor strokes with 40% chance
    thin: function (ev) {
      return ev.filter(e => e.anchor || Math.random() > 0.4);
    }
  };

  /* ---- BREAK: the whole circle lands on the timeline together. */
  const BREAK_POS = [0, 8, 16, 20, 28];
  const BREAK = {
    spine:  BREAK_POS.map(p => ({ p: p, stroke: "spine.high",  a: 1, anchor: true })),
    floor:  BREAK_POS.map(p => ({ p: p, stroke: "floor.open",  a: 1, anchor: true })),
    column: BREAK_POS.map(p => ({ p: p, stroke: "column.open", a: 1, anchor: true })),
    arch:   BREAK_POS.map(p => ({ p: p, stroke: "arch.open",   a: 1, anchor: true })),
    drive:  BREAK_POS.map(p => ({ p: p, stroke: "drive.slap",  a: 1, anchor: true })),
    caller: BREAK_POS.map(p => ({ p: p, stroke: "caller.slap", a: 1, anchor: true }))
  };

  /* ---- The hand-written groove, in the shape the generator emits. */
  P.houseSet = function () {
    return {
      seed: "HOUSE",
      name: "House Circle",
      ppc: 48,
      meter: "ternary",
      step: 4,
      tuning: { floor: 74, column: 99, arch: 148, drive: 88, caller: 104 },
      feel: { id: "rolling", lean: [0, 0.16, 0.06], profiles: {} },
      spine: { base: SPINE, variants: [] },
      family: { base: FAMILY_BASE, variants: FAMILY_VARIANTS, response: FAMILY_RESPONSE },
      drive: { base: DRIVE_BASE, variants: DRIVE_VARIANTS, response: DRIVE_RESPONSE },
      callerMotifs: CALLER_MOTIFS,
      breakFigure: BREAK,
      meta: {
        beats: 4,
        meter: "ternary",
        key: "8·8·4·8·8·8·4",
        feel: "rolling",
        archetype: "house",
        tuning: "1 : 4/3 : 2",
        contour: "written",
        bells: "interlocked",
        engine: "two-beat cell"
      }
    };
  };

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Patterns = P;
})();
