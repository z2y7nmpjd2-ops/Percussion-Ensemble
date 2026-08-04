/* LATTICE — generator.js
 * Grows a whole groove from a short seed: the length of the cycle, the
 * guide line's key figure, the strategy each part uses to place itself
 * against that figure, the lead's motif bank, and the feel of the grid
 * itself. Same seed, same groove, forever.
 *
 * Generation is constrained rather than random: parts are placed
 * relative to what is already on the grid, so the interlock survives
 * every re-roll. Only the groove uses the seeded stream — per-stroke
 * human life still comes from Math.random at performance time.
 */
(function () {
  "use strict";

  const G = {};
  const PPB = 12;                 // pulses per beat — constant across grooves

  /* ---------- seeded random ---------- */

  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function Rng(seed) {
    this.next = mulberry32(xmur3(String(seed))());
  }
  Rng.prototype.int = function (n) { return Math.floor(this.next() * n); };
  Rng.prototype.intRange = function (a, b) { return a + this.int(b - a + 1); };
  Rng.prototype.range = function (a, b) { return a + this.next() * (b - a); };
  Rng.prototype.pick = function (arr) { return arr[this.int(arr.length)]; };
  Rng.prototype.chance = function (p) { return this.next() < p; };
  Rng.prototype.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  Rng.prototype.weighted = function (items, weights) {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };
  // n distinct draws, each weighted by score(item)
  Rng.prototype.drawN = function (pool, score, n) {
    const rest = pool.slice(), out = [];
    while (out.length < n && rest.length) {
      const w = rest.map(x => Math.max(0.001, score(x)));
      const chosen = this.weighted(rest, w);
      out.push(chosen);
      rest.splice(rest.indexOf(chosen), 1);
    }
    return out;
  };

  const r2 = v => Math.round(v * 100) / 100;

  function grid(ppc, step, from) {
    const a = [];
    for (let p = from || 0; p < ppc; p += step) a.push(p);
    return a;
  }

  function divisors(n, min, max) {
    const out = [];
    for (let d = min; d <= max; d++) if (n % d === 0) out.push(d);
    return out.length ? out : [min];
  }

  // One stroke per pulse per part: keep the loudest, inherit any anchor.
  function dedupe(ev) {
    const by = new Map();
    for (const e of ev) {
      const cur = by.get(e.p);
      if (!cur) { by.set(e.p, Object.assign({}, e)); continue; }
      if (e.anchor) cur.anchor = true;
      if (e.a > cur.a) { cur.stroke = e.stroke; cur.a = e.a; cur.soft = e.soft; }
      if (cur.anchor) { delete cur.d; delete cur.h; }
    }
    return Array.from(by.values()).sort((a, b) => a.p - b.p);
  }

  /* ---------- seeds and names ---------- */

  const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY3479";

  G.newSeed = function () {
    let s = "";
    for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
  };

  const ADJ = ["Amber", "Copper", "Slate", "Quiet", "Deep", "Loose", "Bright", "Narrow",
               "Low", "Late", "Dry", "Cool", "Iron", "Glass", "Paper", "Ash", "Salt",
               "Long", "Half", "Open", "Close", "Pale", "Rough", "Still", "Tilted",
               "Hollow", "Folded", "Patient", "Crooked", "Level", "Distant", "Woven"];
  const NOUN = ["Lattice", "Drift", "Weave", "Pulse", "Column", "Current", "Braid", "Ladder",
                "Spiral", "Anchor", "Thread", "Frame", "Circuit", "Ridge", "Seam", "Bend",
                "Field", "Chain", "Gate", "Terrace", "Furrow", "Span", "Shelf", "Lock",
                "Vessel", "Rafter", "Harbour", "Signal", "Cradle", "Quarry", "Beam"];

  G.nameFor = function (seed) {
    const R = new Rng(seed + "/name");
    return R.pick(ADJ) + " " + R.pick(NOUN);
  };

  /* ---------- groove archetypes ----------
   * A whole-ensemble disposition. It decides how many anchors the low
   * voice guards, how busy the middle is, what the texture is allowed to
   * do, and how large the lead's vocabulary gets. */

  const ARCHETYPES = [
    { id: "open",    root: [2, 3], weave: [3, 5], halo: [1, 2], tiers: 4, calls: 2,
      grain: ["sparse", "gapped", "pulsed"] },
    { id: "driving", root: [3, 4], weave: [5, 8], halo: [1, 3], tiers: 5, calls: 3,
      grain: ["continuous", "gapped", "continuous"] },
    { id: "talking", root: [2, 3], weave: [5, 7], halo: [2, 3], tiers: 5, calls: 3,
      grain: ["gapped", "pulsed", "continuous"] },
    { id: "deep",    root: [3, 4], weave: [3, 5], halo: [1, 2], tiers: 3, calls: 2,
      grain: ["sparse", "pulsed"] },
    { id: "shimmer", root: [2, 3], weave: [4, 6], halo: [2, 4], tiers: 4, calls: 2,
      grain: ["shimmer", "continuous", "shimmer"] }
  ];

  /* ---------- feel: how the grid itself leans ---------- */

  const FEELS = [
    { id: "even",     lean: [0, 0.10, -0.02, 0.08] },
    { id: "rolling",  lean: [0, 0.42, -0.08, 0.30] },
    { id: "leaning",  lean: [0, 0.55, 0.04, 0.36] },
    { id: "pushed",   lean: [0, 0.24, -0.20, 0.14] },
    { id: "dragged",  lean: [0, 0.36, 0.18, 0.46] },
    { id: "lurching", lean: [0, 0.62, -0.14, 0.22] },
    { id: "level",    lean: [0, 0.04, 0.02, 0.05] }
  ];

  // Each groove also nudges the players' personal timing, so two grooves
  // with the same figures still sit differently against each other.
  function genProfiles(R) {
    const out = {};
    for (const id of ["keel", "root", "weave", "spark", "grain", "halo"]) {
      if (!R.chance(0.55)) continue;
      const span = id === "keel" ? 2 : 7;
      out[id] = { lean: r2(R.range(-span, span)) };
    }
    return out;
  }

  function genFeel(R) {
    const base = R.pick(FEELS);
    return {
      id: base.id,
      lean: base.lean.map((v, i) => (i === 0 ? 0 : r2(v + R.range(-0.07, 0.07)))),
      profiles: genProfiles(R)
    };
  }

  /* ---------- the guide line ----------
   * Either an uneven key figure — a partition of the cycle whose spans
   * differ — or a steady pulse carrying a cross-cutting accent pattern. */

  function genKey(R, ppc) {
    const mode = R.weighted(["uneven", "pulse"], [3.2, 1]);

    if (mode === "pulse") {
      const step = R.pick(divisors(ppc, 4, Math.max(4, Math.floor(ppc / 3))));
      const pos = grid(ppc, step);
      const every = R.intRange(2, 4);
      const rot = R.int(pos.length);
      return { mode: "pulse", pos: pos, iv: [step], accentEvery: every, accentFrom: rot };
    }

    const spans = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18];
    const wts   = [0.5, 1.5, 0.7, 1.5, 0.6, 1.1, 0.4, 0.6, 0.5, 0.5];
    for (let attempt = 0; attempt < 800; attempt++) {
      const iv = [];
      let sum = 0;
      while (sum < ppc && iv.length < 9) {
        const v = R.weighted(spans, wts);
        if (sum + v > ppc) break;
        iv.push(v); sum += v;
      }
      if (sum !== ppc || iv.length < 4) continue;
      if (new Set(iv).size < 2) continue;            // must be uneven
      let pos = []; let p = 0;
      for (const v of iv) { pos.push(p); p += v; }
      if (!pos.some(x => x % PPB !== 0)) continue;    // must cut across the beat
      // The figure need not begin on the downbeat.
      if (R.chance(0.3)) {
        const rot = R.pick(grid(ppc, 3).slice(1));
        pos = pos.map(x => (x + rot) % ppc).sort((a, b) => a - b);
      }
      return { mode: "uneven", iv: iv, pos: pos };
    }
    return { mode: "uneven", iv: [9, 9, 6, 9, 9, 6].slice(0, Math.max(4, ppc / 9)),
             pos: grid(ppc, 9) };
  }

  function genKeel(R, key) {
    let ev;
    if (key.mode === "pulse") {
      ev = key.pos.map((p, i) => {
        const strong = ((i - key.accentFrom) % key.accentEvery + key.accentEvery)
                       % key.accentEvery === 0;
        return {
          p: p,
          stroke: strong ? "keel.tick" : "keel.tock",
          a: strong ? r2(R.range(0.88, 1.0)) : r2(R.range(0.55, 0.7)),
          anchor: true
        };
      });
    } else {
      // Long spans open with the lower pitch — the figure states its shape.
      ev = key.pos.map((p, i) => ({
        p: p,
        stroke: key.iv[i % key.iv.length] >= 9 ? "keel.tock" : "keel.tick",
        a: i === 0 ? 1.0 : r2(R.range(0.76, 0.92)),
        anchor: true
      }));
      if (ev.length) ev[0].stroke = "keel.tick";
    }
    return { base: dedupe(ev), variants: [] };
  }

  /* ---------- low anchor ---------- */

  function rootGaps(R, C, want, lockOne) {
    const off = grid(C.ppc, 3).filter(p => C.keyPos.indexOf(p) < 0);
    const score = p => (p % PPB === 0 ? 2.2 : 1) + (p % 6 === 0 ? 0.8 : 0);
    const half = C.ppc / 2;
    const fh = off.filter(p => p < half), sh = off.filter(p => p >= half);
    const anchors = [];
    if (fh.length) anchors.push(R.drawN(fh, score, 1)[0]);
    if (sh.length) anchors.push(R.drawN(sh, score, 1)[0]);
    while (anchors.length < want) {
      const rest = off.filter(p => anchors.indexOf(p) < 0);
      if (!rest.length) break;
      anchors.push(R.drawN(rest, score, 1)[0]);
    }
    // A locked groove lets the low voice double one guide stroke.
    if (lockOne && C.keyPos.length) anchors[anchors.length - 1] = R.pick(C.keyPos);
    return Array.from(new Set(anchors)).sort((a, b) => a - b);
  }

  function genRoot(R, C) {
    const style = R.weighted(["gaps", "lock", "line", "pedal"], [2.2, 1.1, 1.0, 0.9]);
    const want = R.intRange(C.arch.root[0], C.arch.root[1]);
    let anchors = [], ev = [];

    if (style === "line") {
      // A two-tone walking figure: opens anchor it, presses fill between.
      const step = R.pick([9, 12, 15, 18].filter(s => s * 2 <= C.ppc));
      let p = R.pick(grid(C.ppc, 3).slice(0, 5));
      let i = 0;
      while (p < C.ppc) {
        const open = i % 2 === 0;
        const e = { p: p, stroke: open ? "root.open" : "root.press",
                    a: open ? r2(R.range(0.78, 0.95)) : r2(R.range(0.45, 0.6)) };
        if (open) { e.anchor = true; anchors.push(p); }
        else e.d = r2(R.range(0.2, 0.45));
        ev.push(e);
        p += step; i++;
      }
    } else if (style === "pedal") {
      // A regular tread, sometimes cutting across the beat.
      const step = R.pick(divisors(C.ppc, 8, Math.max(8, Math.floor(C.ppc / 2))));
      anchors = grid(C.ppc, step);
      ev = anchors.map((p, i) => ({
        p: p, stroke: "root.open",
        a: i === 0 ? 0.95 : r2(R.range(0.72, 0.88)), anchor: true
      }));
    } else {
      anchors = rootGaps(R, C, want, style === "lock");
      ev = anchors.map((p, i) => ({
        p: p, stroke: "root.open",
        a: i === 0 ? 0.9 : r2(R.range(0.78, 1.0)), anchor: true
      }));
    }

    if (anchors.length < 2) {                       // never leave the ground unguarded
      anchors = rootGaps(R, C, Math.max(2, want), false);
      ev = anchors.map(p => ({ p: p, stroke: "root.open", a: 0.88, anchor: true }));
    }

    if (style !== "line") {
      const pool = grid(C.ppc, 3).filter(p => anchors.indexOf(p) < 0);
      const presses = R.drawN(pool, p => (p % 6 === 3 ? 1.5 : 1), R.intRange(2, 5));
      for (const p of presses) {
        ev.push({ p: p, stroke: "root.press",
                  a: r2(R.range(0.42, 0.62)), d: r2(R.range(0.18, 0.58)) });
      }
    }
    return { anchors: anchors, style: style, part: { base: dedupe(ev), variants: [], response: null } };
  }

  /* ---------- mid voice: lives where the low anchor doesn't ---------- */

  function genWeave(R, C) {
    const style = R.weighted(["punctuate", "ride", "answer"], [2.2, 1.2, 1.0]);
    const want = R.intRange(C.arch.weave[0], C.arch.weave[1]);
    const free = p => C.rootAnchors.indexOf(p) < 0;
    let ev = [];

    if (style === "ride") {
      // A running line at one subdivision, snapped at a cross-period.
      const step = R.pick([2, 3, 3, 4, 6]);
      const period = R.intRange(3, 5);
      const off = R.int(period);
      grid(C.ppc, step).forEach((p, i) => {
        const strong = ((i - off) % period + period) % period === 0;
        if (strong && free(p)) {
          ev.push({ p: p, stroke: "weave.snap", a: r2(R.range(0.74, 0.9)),
                    anchor: i === off });
        } else {
          ev.push({ p: p, stroke: "weave.touch", a: r2(R.range(0.3, 0.45)),
                    d: r2(R.range(0.3, 0.6)) });
        }
      });
    } else {
      // Sparse tones and snaps: either spread over the cycle, or clustered
      // into one half so the other half stays open for the lead.
      let cands = grid(C.ppc, 3).filter(free);
      if (style === "answer") {
        const half = C.ppc / 2;
        const late = R.chance(0.6);
        const win = cands.filter(p => (late ? p >= half : p < half));
        if (win.length >= 3) cands = win;
      }
      const score = p => (p % PPB === 0 ? 0.45 : 1.6) + (p % 6 === 3 ? 0.7 : 0) +
                         (C.keyPos.indexOf(p) >= 0 ? -0.3 : 0.2);
      const chosen = R.drawN(cands, score, Math.min(want, cands.length)).sort((a, b) => a - b);
      const snapPool = chosen.filter(p => p % PPB !== 0);
      const snaps = R.drawN(snapPool.length ? snapPool : chosen, () => 1,
                            snapPool.length > 1 ? R.intRange(1, 2) : 1);
      ev = chosen.map(p => snaps.indexOf(p) >= 0
        ? { p: p, stroke: "weave.snap", a: r2(R.range(0.76, 0.9)), anchor: true }
        : { p: p, stroke: "weave.tone", a: r2(R.range(0.58, 0.74)), soft: "weave.touch" });
    }

    // Ghost layer on sextuplet positions — only heard as Heat comes up.
    const taken = ev.map(e => e.p);
    const sextPool = [];
    for (let p = 0; p < C.ppc; p += 2) if (p % 3 !== 0 && taken.indexOf(p) < 0) sextPool.push(p);
    for (const p of R.drawN(sextPool, () => 1, R.intRange(2, 4))) {
      ev.push({ p: p, stroke: "weave.touch", a: r2(R.range(0.26, 0.38)),
                h: r2(R.range(0.35, 0.65)) });
    }

    // A stitched pair inside one beat, gated by Density.
    if (style !== "ride") {
      const s0 = R.int(C.ppc / PPB) * PPB + R.pick([2, 4, 8]);
      ev.push({ p: s0 % C.ppc, stroke: "weave.touch", a: 0.4, d: 0.55 });
      ev.push({ p: (s0 + 2) % C.ppc, stroke: "weave.touch", a: 0.45, d: 0.55 });
    }

    if (!ev.some(e => e.anchor) && ev.length) {
      const loud = ev.reduce((a, b) => (b.a > a.a ? b : a));
      loud.anchor = true; delete loud.d; delete loud.h;
    }
    return { style: style, part: { base: dedupe(ev), variants: [], response: null } };
  }

  /* ---------- texture ---------- */

  function genGrain(R, C) {
    const style = R.pick(C.arch.grain);
    const lockKey = R.chance(0.4);   // accents follow the key figure, not the beat
    const beats = C.ppc / PPB;
    let step, active;

    if (style === "shimmer") { step = 2; active = null; }
    else if (style === "sparse") { step = R.pick([6, 12]); active = null; }
    else { step = R.pick([3, 3, 6]); active = null; }

    if (style === "gapped") {
      // Rest for one or two beats — air is part of the pattern.
      const rest = R.drawN(grid(beats, 1), () => 1, R.intRange(1, Math.max(1, beats - 2)));
      active = b => rest.indexOf(b) < 0;
    } else if (style === "pulsed") {
      // Only certain beats carry texture, and they carry it densely.
      const on = R.drawN(grid(beats, 1), b => (b === 0 ? 2 : 1),
                         R.intRange(2, Math.max(2, beats - 1)));
      active = b => on.indexOf(b) >= 0;
      step = R.pick([2, 3]);
    }

    const ev = [];
    let i = 0;
    for (let p = 0; p < C.ppc; p += step) {
      if (active && !active(Math.floor(p / PPB))) { i++; continue; }
      let a;
      if (lockKey && C.keyPos.indexOf(p) >= 0) a = 0.9;
      else if (p % PPB === 0) a = lockKey ? 0.62 : 0.9;
      else if (p % 6 === 0) a = 0.55;
      else a = 0.38;
      if (style === "shimmer") a *= 0.72;
      const gated = step < 6 && p % 6 !== 0;
      ev.push({
        p: p,
        stroke: i % 2 === 0 ? "grain.push" : "grain.pull",
        a: r2(a),
        d: gated ? r2(R.range(0.22, 0.45)) : 0,
        anchor: !gated && p % PPB === 0 && style !== "shimmer"
      });
      i++;
    }

    // Sextuplet infill in one beat, needing both Density and Heat.
    if (style !== "shimmer") {
      const base = R.int(beats) * PPB;
      [2, 4, 8, 10].forEach((o, k) => {
        if (R.chance(0.65)) {
          ev.push({ p: (base + o) % C.ppc, stroke: k % 2 ? "grain.push" : "grain.pull",
                    a: r2(R.range(0.36, 0.48)), d: 0.6, h: r2(R.range(0.45, 0.65)) });
        }
      });
    }
    return { style: style, step: step, lockKey: lockKey,
             part: { base: dedupe(ev), variants: [] } };
  }

  /* ---------- color ---------- */

  function genHalo(R, C) {
    const style = R.weighted(["turns", "figure", "tail"], [2, 1, 1]);
    const ev = [];
    if (style === "figure") {
      // A small repeating shape rather than isolated points.
      const step = R.pick(divisors(C.ppc, 12, Math.max(12, C.ppc / 2)));
      grid(C.ppc, step).forEach((p, i) => {
        ev.push({ p: p, stroke: i === 0 ? "halo.ring" : "halo.damp",
                  a: r2(R.range(0.4, 0.6)), d: r2(R.range(0.3, 0.55)) });
      });
    } else {
      const late = C.ppc - PPB;
      const pool = style === "tail"
        ? grid(C.ppc, 3).filter(p => p >= late)
        : C.keyPos.filter(p => p >= PPB).concat(grid(C.ppc, 6).filter(p => p >= C.ppc / 2));
      const picks = R.drawN(pool.length ? pool : grid(C.ppc, 6), () => 1,
                            R.intRange(C.arch.halo[0], C.arch.halo[1]));
      picks.forEach((p, i) => ev.push({
        p: p, stroke: i === 0 ? "halo.ring" : "halo.damp",
        a: r2(R.range(0.4, 0.65)), d: r2(R.range(0.25, 0.5)),
        h: i > 1 ? r2(R.range(0.5, 0.7)) : undefined
      }));
    }
    return { style: style, part: { base: dedupe(ev), variants: [] } };
  }

  /* ---------- lead: phrase grammars, a bank, and the graph between ---------- */

  function phraseWalk(R, ppc, energy) {
    const count = Math.round(3 + energy * 8);
    const steps = energy > 0.6 ? [2, 3, 3, 4, 6]
                : energy > 0.4 ? [3, 3, 4, 6, 9]
                : [6, 9, 12, 12];
    let p = R.pick(energy > 0.55 ? [0, 3, 6, 12] : [6, 12, 18, 24]).valueOf() % ppc;
    const ev = [];
    for (let i = 0; i < count && p < ppc; i++) {
      const strong = i === 0 || i === count - 1 || R.chance(0.3 + energy * 0.2);
      ev.push({ p: p,
        stroke: strong ? (R.chance(0.45) ? "spark.crack" : "spark.open") : "spark.touch",
        a: strong ? r2(R.range(0.65, 0.85)) : r2(R.range(0.4, 0.55)) });
      p += R.pick(steps);
    }
    return ev;
  }

  // A short cell restated at a fixed distance — the most motivic grammar.
  function phraseCell(R, ppc, energy) {
    const len = R.intRange(2, 3 + Math.round(energy * 2));
    const inner = [];
    for (let i = 0; i < len - 1; i++) inner.push(R.pick([2, 3, 3, 4]));
    const period = R.pick([9, 12, 15, 18].filter(x => x * 2 <= ppc).concat([12]));
    const start = R.pick(grid(ppc, 3).slice(0, 4));
    const ev = [];
    for (let rep = 0; start + rep * period < ppc; rep++) {
      let p = start + rep * period;
      for (let i = 0; i < len && p < ppc; i++) {
        const strong = i === 0;
        ev.push({ p: p,
          stroke: strong ? (rep === 0 || R.chance(0.5) ? "spark.crack" : "spark.open")
                         : "spark.touch",
          a: strong ? r2(R.range(0.7, 0.9) - rep * 0.04) : r2(R.range(0.4, 0.55)) });
        p += inner[i] || 3;
      }
    }
    return ev;
  }

  // Density gathers, then thins — a phrase with a shape.
  function phraseArc(R, ppc, energy) {
    const peak = R.range(0.3, 0.7) * ppc;
    const ev = [];
    for (let p = 0; p < ppc; p += R.pick([2, 3])) {
      const near = 1 - Math.abs(p - peak) / (ppc * 0.55);
      if (near <= 0) continue;
      if (!R.chance(near * (0.35 + energy * 0.6))) continue;
      const strong = R.chance(0.3 + near * 0.4);
      ev.push({ p: p,
        stroke: strong ? (R.chance(0.5) ? "spark.crack" : "spark.open") : "spark.touch",
        a: strong ? r2(R.range(0.65, 0.88)) : r2(R.range(0.38, 0.55)) });
    }
    return ev;
  }

  // A few isolated strong strokes with air around them.
  function phrasePunctuate(R, ppc, energy) {
    const n = R.intRange(2, 3 + Math.round(energy * 3));
    const pool = grid(ppc, 3);
    return R.drawN(pool, p => (p % PPB === 0 ? 0.6 : 1.4), n)
      .sort((a, b) => a - b)
      .map(p => ({ p: p, stroke: R.chance(0.5) ? "spark.open" : "spark.crack",
                   a: r2(R.range(0.62, 0.9)) }));
  }

  const GRAMMARS = [phraseWalk, phraseCell, phraseArc, phrasePunctuate];

  // A call declares itself: an even repeated figure, then a landing.
  function genCall(R, ppc) {
    const step = R.pick([2, 3, 4, 6]);
    const start = R.pick([0, 3, 6, 9].filter(x => x < ppc));
    const reps = R.intRange(3, 5);
    const ev = [];
    let p = start;
    for (let i = 0; i < reps && p < ppc; i++) {
      ev.push({ p: p,
        stroke: i % 2 === 0 ? "spark.crack" : (step <= 3 ? "spark.touch" : "spark.crack"),
        a: i % 2 === 0 ? r2(R.range(0.85, 1.0)) : r2(R.range(0.5, 0.65)) });
      p += step;
    }
    const land = Math.min(ppc - 3, p + R.pick([3, 6, 9]));
    ev.push({ p: land, stroke: "spark.open", a: 0.95, anchor: true });
    if (R.chance(0.7) && land + 9 < ppc) {
      ev.push({ p: land + R.pick([6, 9]), stroke: "spark.crack", a: r2(R.range(0.85, 0.95)) });
    }
    if (ev.length) ev[0].anchor = true;
    return ev;
  }

  const TIER_IDS = ["seed", "offset", "roll", "rise", "surge"];
  const CALL_IDS = ["callA", "callB", "callC"];

  function genSparkBank(R, C) {
    const bank = [{ id: "rest", energy: 0, call: false, after: {}, ev: [] }];
    const nTiers = Math.min(TIER_IDS.length, C.arch.tiers);
    for (let i = 0; i < nTiers; i++) {
      const energy = r2(0.22 + (i / Math.max(1, nTiers - 1)) * 0.5);
      const grammar = R.pick(GRAMMARS);
      let ev = dedupe(grammar(R, C.ppc, energy)).filter(e => e.p < C.ppc);
      if (!ev.length) ev = dedupe(phrasePunctuate(R, C.ppc, energy));
      if (ev.length) ev[0].a = Math.min(1, r2(ev[0].a + 0.08));
      bank.push({ id: TIER_IDS[i], energy: energy, call: false, after: {}, ev: ev });
    }
    const nCalls = Math.min(CALL_IDS.length, C.arch.calls);
    for (let i = 0; i < nCalls; i++) {
      bank.push({ id: CALL_IDS[i], energy: r2(0.84 + i * 0.04), call: true, after: {},
                  ev: dedupe(genCall(R, C.ppc)) });
    }

    // Phrases follow phrases of nearby energy; calls resolve downward.
    for (const m of bank) {
      for (const n of bank) {
        if (n.id === m.id) continue;
        let w = 3 - Math.abs(m.energy - n.energy) * 3;
        if (m.call) w = n.energy < 0.5 ? 3 : 1;
        if (n.call) w *= 0.8;
        if (n.id === "rest") w *= m.energy > 0.5 ? 0.5 : 1.2;
        if (w > 0.2) m.after[n.id] = r2(w);
      }
    }
    return bank;
  }

  /* ---------- variants and answers, derived from each part ---------- */

  function displaceVariant(R, base, ppc) {
    return dedupe(base.map(e => (e.anchor || R.chance(0.5))
      ? e
      : Object.assign({}, e, { p: (e.p + R.pick([-3, 3, 2]) + ppc) % ppc })));
  }

  function fillVariant(R, base, fillStroke, ppc) {
    const ev = base.slice();
    const used = base.map(e => e.p);
    const pool = grid(ppc, 3).filter(p => used.indexOf(p) < 0);
    for (const p of R.drawN(pool, () => 1, R.intRange(1, 3))) {
      ev.push({ p: p, stroke: fillStroke, a: r2(R.range(0.45, 0.65)) });
    }
    return dedupe(ev);
  }

  function thinVariant(R, base) {
    const ev = base.filter(e => e.anchor || R.chance(0.6));
    return ev.length >= 3 ? ev : base;
  }

  // The answer figure: anchors kept, extra weight late in the cycle.
  function genResponse(R, base, mainStroke, fillStroke, ppc) {
    const ev = base.filter(e => e.anchor)
      .map(e => { const c = Object.assign({}, e); delete c.d; delete c.h; return c; });
    const used = ev.map(e => e.p);
    const pool = grid(ppc, 3).filter(p => used.indexOf(p) < 0);
    for (const p of R.drawN(pool, p => (p >= ppc * 0.4 ? 1.8 : 0.7), R.intRange(3, 5))) {
      ev.push({ p: p, stroke: R.chance(0.6) ? mainStroke : fillStroke,
                a: r2(R.range(0.6, 0.85)) });
    }
    return dedupe(ev);
  }

  /* ---------- the whole groove ---------- */

  function build(seed) {
    const R = new Rng(seed);
    const ppc = R.weighted([36, 48, 60, 72], [1.0, 3.0, 0.85, 0.6]);
    const arch = R.pick(ARCHETYPES);
    const feel = genFeel(R);
    const key = genKey(R, ppc);
    const C = { ppc: ppc, beats: ppc / PPB, arch: arch, keyPos: key.pos };

    const keel = genKeel(R, key);
    const rootGen = genRoot(R, C);
    C.rootAnchors = rootGen.anchors;
    const weaveGen = genWeave(R, C);
    const grainGen = genGrain(R, C);
    const haloGen = genHalo(R, C);

    const root = rootGen.part;
    root.variants = [displaceVariant(R, root.base, ppc),
                     fillVariant(R, root.base, "root.press", ppc)];
    root.response = genResponse(R, root.base, "root.open", "root.press", ppc);

    const weave = weaveGen.part;
    weave.variants = [displaceVariant(R, weave.base, ppc), thinVariant(R, weave.base)];
    weave.response = genResponse(R, weave.base, "weave.snap", "weave.tone", ppc);

    const halo = haloGen.part;
    halo.variants = [thinVariant(R, halo.base)];

    // Everyone lands on the key figure together for the break.
    const unison = key.pos.slice(0, Math.max(4, Math.min(6, key.pos.length - 1)));
    const breakFigure = {
      keel:  unison.map(p => ({ p: p, stroke: "keel.tick", a: 1, anchor: true })),
      root:  unison.map(p => ({ p: p, stroke: "root.open", a: 1, anchor: true })),
      weave: unison.map(p => ({ p: p, stroke: "weave.snap", a: 1, anchor: true })),
      spark: unison.map(p => ({ p: p, stroke: "spark.crack", a: 1, anchor: true })),
      grain: unison.map(p => ({ p: p, stroke: "grain.push", a: 0.9, anchor: true })),
      halo:  [{ p: unison[unison.length - 1], stroke: "halo.ring", a: 0.9, anchor: true }]
    };

    return {
      seed: String(seed),
      name: G.nameFor(seed),
      ppc: ppc,
      feel: feel,
      keel: keel,
      root: root,
      weave: weave,
      grain: grainGen.part,
      halo: halo,
      sparkMotifs: genSparkBank(R, C),
      breakFigure: breakFigure,
      meta: {
        beats: C.beats,
        key: key.mode === "pulse" ? "pulse /" + key.iv[0] : key.iv.join("·"),
        feel: feel.id,
        archetype: arch.id,
        low: rootGen.style,
        mid: weaveGen.style,
        grain: grainGen.style,
        color: haloGen.style,
        grainLock: grainGen.lockKey ? "key" : "beat",
        rootAnchors: rootGen.anchors.length
      }
    };
  }

  // A groove has to be playable, not merely well-formed.
  function usable(set) {
    if (!set.keel.base.length || !set.root.base.length || !set.weave.base.length) return false;
    if (set.root.base.filter(e => e.anchor).length < 2) return false;
    if (!set.weave.base.some(e => e.anchor)) return false;
    if (set.sparkMotifs.filter(m => m.call).length < 2) return false;
    if (set.sparkMotifs.filter(m => m.ev.length >= 3).length < 2) return false;
    const total = set.keel.base.length + set.root.base.length + set.weave.base.length +
                  set.grain.base.length + set.halo.base.length;
    if (total < 14) return false;                    // too thin to be a groove
    if (total > 130) return false;                   // too dense to breathe
    for (const part of [set.keel, set.root, set.weave, set.grain, set.halo]) {
      if (part.base.some(e => e.p < 0 || e.p >= set.ppc)) return false;
    }
    for (const m of set.sparkMotifs) {
      if (m.ev.some(e => e.p < 0 || e.p >= set.ppc)) return false;
    }
    return true;
  }

  G.generate = function (seed) {
    const s = seed || G.newSeed();
    for (let i = 0; i < 12; i++) {
      const set = build(i === 0 ? s : s + "/" + i);
      if (usable(set)) { set.seed = String(s); set.name = G.nameFor(s); return set; }
    }
    const fallback = window.LATTICE.Patterns.houseSet();
    fallback.seed = String(s);
    fallback.name = G.nameFor(s);
    return fallback;
  };

  G.ARCHETYPES = ARCHETYPES;

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Generator = G;
})();
