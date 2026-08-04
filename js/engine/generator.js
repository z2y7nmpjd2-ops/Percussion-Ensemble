/* LATTICE — generator.js
 * Grows a whole groove from a short seed: the guide line's key figure,
 * where each part sits against it, the lead's motif bank, and the feel
 * of the grid itself. Same seed, same groove, forever.
 *
 * Generation is constrained rather than random: parts are placed
 * relative to what is already on the grid, so the interlock survives
 * every re-roll. Only the groove uses the seeded stream — per-stroke
 * human life still comes from Math.random at performance time.
 */
(function () {
  "use strict";

  const G = {};
  const PPC = 48;
  const GRID16 = [];
  for (let p = 0; p < PPC; p += 3) GRID16.push(p);

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

  /* ---------- seeds and names ---------- */

  const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY3479";

  G.newSeed = function () {
    let s = "";
    for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
  };

  const ADJ = ["Amber", "Copper", "Slate", "Quiet", "Deep", "Loose", "Bright", "Narrow",
               "Low", "Late", "Dry", "Cool", "Iron", "Glass", "Paper", "Ash", "Salt",
               "Long", "Half", "Open", "Close", "Pale", "Rough", "Still"];
  const NOUN = ["Lattice", "Drift", "Weave", "Pulse", "Column", "Current", "Braid", "Ladder",
                "Spiral", "Anchor", "Thread", "Frame", "Circuit", "Ridge", "Seam", "Bend",
                "Field", "Chain", "Gate", "Terrace", "Furrow", "Span", "Shelf", "Lock"];

  G.nameFor = function (seed) {
    const R = new Rng(seed + "/name");
    return R.pick(ADJ) + " " + R.pick(NOUN);
  };

  /* ---------- feel: how the grid itself leans ---------- */

  const FEELS = [
    { id: "even",     lean: [0, 0.10, -0.02, 0.08] },
    { id: "rolling",  lean: [0, 0.42, -0.08, 0.30] },
    { id: "leaning",  lean: [0, 0.55, 0.04, 0.36] },
    { id: "pushed",   lean: [0, 0.24, -0.20, 0.14] },
    { id: "dragged",  lean: [0, 0.36, 0.18, 0.46] }
  ];

  function genFeel(R) {
    const base = R.pick(FEELS);
    return {
      id: base.id,
      lean: base.lean.map((v, i) => (i === 0 ? 0 : r2(v + R.range(-0.06, 0.06))))
    };
  }

  /* ---------- the guide line's key figure ----------
   * An uneven partition of 48 into 5–7 spans. Asymmetry is required:
   * a figure of equal spans would give the ensemble nothing to lean on. */

  function genKey(R) {
    const spans = [6, 9, 12, 15];
    const wts = [1.4, 1.5, 0.8, 0.35];
    for (let attempt = 0; attempt < 600; attempt++) {
      const iv = [];
      let sum = 0;
      while (sum < PPC && iv.length < 7) {
        const v = R.weighted(spans, wts);
        if (sum + v > PPC) break;
        iv.push(v); sum += v;
      }
      if (sum !== PPC || iv.length < 5) continue;
      if (new Set(iv).size < 2) continue;           // must be uneven
      const pos = []; let p = 0;
      for (const v of iv) { pos.push(p); p += v; }
      if (!pos.some(x => x % 12 !== 0)) continue;   // must cut across the beat
      return { iv: iv, pos: pos };
    }
    return { iv: [9, 9, 6, 9, 9, 6], pos: [0, 9, 18, 24, 33, 42] };
  }

  function genKeel(R, key) {
    // Long spans open with the lower pitch — the figure states its own shape.
    const ev = key.pos.map((p, i) => ({
      p: p,
      stroke: key.iv[i] >= 9 ? "keel.tock" : "keel.tick",
      a: i === 0 ? 1.0 : r2(R.range(0.78, 0.92)),
      anchor: true
    }));
    if (ev.length) ev[0].stroke = "keel.tick";
    return { base: ev, variants: [] };
  }

  /* ---------- low anchor: speaks in the guide line's gaps ---------- */

  function genRoot(R, keyPos) {
    const off = GRID16.filter(p => keyPos.indexOf(p) < 0);
    const score = p => (p % 12 === 0 ? 2.2 : 1) + (p % 6 === 0 ? 0.8 : 0);
    const fh = off.filter(p => p < 24);
    const sh = off.filter(p => p >= 24);

    const anchors = [];
    if (fh.length) anchors.push(R.drawN(fh, score, 1)[0]);
    if (sh.length) anchors.push(R.drawN(sh, score, 1)[0]);
    if (R.chance(0.5)) {
      const rest = off.filter(p => anchors.indexOf(p) < 0);
      if (rest.length) anchors.push(R.drawN(rest, score, 1)[0]);
    }
    anchors.sort((a, b) => a - b);

    const ev = anchors.map((p, i) => ({
      p: p, stroke: "root.open", a: i === 0 ? 0.9 : r2(R.range(0.8, 1.0)), anchor: true
    }));

    // Pressed strokes fill in as Density opens up.
    const pressPool = GRID16.filter(p => anchors.indexOf(p) < 0);
    const presses = R.drawN(pressPool, p => (p % 6 === 3 ? 1.5 : 1), 2 + R.int(3));
    for (const p of presses) {
      ev.push({ p: p, stroke: "root.press", a: r2(R.range(0.45, 0.6)), d: r2(R.range(0.2, 0.55)) });
    }
    ev.sort((a, b) => a.p - b.p);
    return { anchors: anchors, part: { base: ev, variants: [], response: null } };
  }

  /* ---------- mid voice: lives where the low anchor doesn't ---------- */

  function genWeave(R, keyPos, rootAnchors) {
    const cands = GRID16.filter(p => rootAnchors.indexOf(p) < 0);
    const score = p => (p % 12 === 0 ? 0.45 : 1.6) + (p % 6 === 3 ? 0.7 : 0) +
                       (keyPos.indexOf(p) >= 0 ? -0.3 : 0.2);
    const chosen = R.drawN(cands, score, 4 + R.int(3)).sort((a, b) => a - b);

    // One or two snaps carry the part; they prefer offbeat placements.
    const snapPool = chosen.filter(p => p % 12 !== 0);
    const snaps = R.drawN(snapPool.length ? snapPool : chosen, () => 1, snapPool.length > 1 ? 2 : 1);

    const ev = chosen.map(p => {
      const isSnap = snaps.indexOf(p) >= 0;
      return isSnap
        ? { p: p, stroke: "weave.snap", a: r2(R.range(0.78, 0.9)), anchor: true }
        : { p: p, stroke: "weave.tone", a: r2(R.range(0.6, 0.74)), soft: "weave.touch" };
    });

    // Ghost layer on sextuplet positions — only heard as Heat comes up.
    const sextPool = [];
    for (let p = 0; p < PPC; p += 2) if (p % 3 !== 0 && chosen.indexOf(p) < 0) sextPool.push(p);
    for (const p of R.drawN(sextPool, () => 1, 2 + R.int(2))) {
      ev.push({ p: p, stroke: "weave.touch", a: r2(R.range(0.28, 0.36)), h: r2(R.range(0.4, 0.6)) });
    }

    // A stitched sextuplet pair inside one beat, gated by Density.
    const beat = R.pick([0, 1, 2, 3]);
    const s0 = beat * 12 + R.pick([2, 4, 8]);
    ev.push({ p: s0, stroke: "weave.touch", a: 0.4, d: 0.55 });
    ev.push({ p: (s0 + 2) % PPC, stroke: "weave.touch", a: 0.45, d: 0.55 });

    ev.sort((a, b) => a.p - b.p);
    return { base: ev, variants: [], response: null };
  }

  /* ---------- texture: a continuous hand, thickening with Density ---------- */

  function genGrain(R, keyPos) {
    const grid = R.weighted([3, 6], [0.62, 0.38]);
    const lockKey = R.chance(0.4);   // accents follow the key figure, not the beat
    const ev = [];
    let i = 0;
    for (let p = 0; p < PPC; p += grid) {
      let a;
      if (lockKey && keyPos.indexOf(p) >= 0) a = 0.9;
      else if (p % 12 === 0) a = lockKey ? 0.62 : 0.9;
      else if (p % 6 === 0) a = 0.55;
      else a = 0.38;
      const gated = grid === 3 && p % 6 !== 0;
      ev.push({
        p: p,
        stroke: i % 2 === 0 ? "grain.push" : "grain.pull",
        a: r2(a),
        d: gated ? r2(R.range(0.25, 0.4)) : 0,
        anchor: !gated && p % 12 === 0
      });
      i++;
    }
    // Sextuplet infill in one beat, needing both Density and Heat.
    const base = R.pick([1, 2, 3]) * 12;
    [2, 4, 8, 10].forEach((o, k) => {
      if (R.chance(0.7)) {
        ev.push({
          p: base + o, stroke: k % 2 ? "grain.push" : "grain.pull",
          a: r2(R.range(0.38, 0.48)), d: 0.6, h: r2(R.range(0.5, 0.65))
        });
      }
    });
    ev.sort((a, b) => a.p - b.p);
    return { grid: grid, lockKey: lockKey, part: { base: ev, variants: [] } };
  }

  /* ---------- color: a few points of metal at the turns ---------- */

  function genHalo(R, keyPos) {
    const pool = keyPos.filter(p => p >= 12).concat([24, 36, 42, 45]);
    const picks = R.drawN(pool, p => (p >= 30 ? 1.6 : 1), 2 + R.int(2));
    const ev = picks.map((p, i) => ({
      p: p,
      stroke: i === 0 ? "halo.ring" : "halo.damp",
      a: r2(R.range(0.4, 0.65)),
      d: r2(R.range(0.25, 0.5)),
      h: i > 1 ? r2(R.range(0.5, 0.7)) : undefined
    }));
    ev.sort((a, b) => a.p - b.p);
    return { base: ev, variants: [] };
  }

  /* ---------- lead: a bank of phrases and the graph between them ---------- */

  const TIERS = [
    { id: "seed",   energy: 0.25 },
    { id: "offset", energy: 0.4 },
    { id: "roll",   energy: 0.55 },
    { id: "rise",   energy: 0.7 }
  ];

  function genPhrase(R, energy) {
    const count = Math.round(3 + energy * 8);
    const steps = energy > 0.6 ? [2, 3, 3, 4, 6]
                : energy > 0.4 ? [3, 3, 4, 6, 9]
                : [6, 9, 12, 12];
    let p = R.pick(energy > 0.55 ? [0, 3, 6, 12] : [6, 12, 18, 24]);
    const ev = [];
    for (let i = 0; i < count && p < PPC; i++) {
      const strong = i === 0 || i === count - 1 || R.chance(0.3 + energy * 0.2);
      ev.push({
        p: p,
        stroke: strong ? (R.chance(0.45) ? "spark.crack" : "spark.open") : "spark.touch",
        a: strong ? r2(R.range(0.65, 0.85)) : r2(R.range(0.4, 0.55))
      });
      p += R.pick(steps);
    }
    if (ev.length) ev[0].a = Math.min(1, r2(ev[0].a + 0.08));
    return ev;
  }

  // A call declares itself: an even repeated figure, then a landing.
  function genCall(R) {
    const step = R.pick([2, 3, 4]);
    const start = R.pick([0, 3, 6]);
    const reps = 3 + R.int(2);
    const ev = [];
    let p = start;
    for (let i = 0; i < reps && p < PPC; i++) {
      ev.push({
        p: p,
        stroke: i % 2 === 0 ? "spark.crack" : (step <= 3 ? "spark.touch" : "spark.crack"),
        a: i % 2 === 0 ? r2(R.range(0.85, 1.0)) : r2(R.range(0.5, 0.65))
      });
      p += step;
    }
    const land = Math.min(PPC - 3, p + R.pick([3, 6, 9]));
    ev.push({ p: land, stroke: "spark.open", a: 0.95, anchor: true });
    if (R.chance(0.7) && land + 9 < PPC) {
      ev.push({ p: land + R.pick([6, 9]), stroke: "spark.crack", a: r2(R.range(0.85, 0.95)) });
    }
    if (ev.length) ev[0].anchor = true;
    return ev;
  }

  function genSparkBank(R) {
    const bank = [{ id: "rest", energy: 0, call: false, after: {}, ev: [] }];
    for (const t of TIERS) {
      bank.push({ id: t.id, energy: t.energy, call: false, after: {}, ev: genPhrase(R, t.energy) });
    }
    bank.push({ id: "callA", energy: 0.85, call: true, after: {}, ev: genCall(R) });
    bank.push({ id: "callB", energy: 0.9, call: true, after: {}, ev: genCall(R) });

    // Phrases follow phrases of nearby energy; calls resolve downward.
    for (const m of bank) {
      for (const n of bank) {
        if (n.id === m.id) continue;
        let w = 3 - Math.abs(m.energy - n.energy) * 3;
        if (m.call) w = n.energy < 0.5 ? 3 : 1;      // after a call, settle
        if (n.call) w *= 0.8;
        if (n.id === "rest") w *= m.energy > 0.5 ? 0.5 : 1.2;
        if (w > 0.2) m.after[n.id] = r2(w);
      }
    }
    return bank;
  }

  /* ---------- variants and answers, derived from each part ---------- */

  function displaceVariant(R, base) {
    return base.map(e => (e.anchor || R.chance(0.5))
      ? e
      : Object.assign({}, e, { p: (e.p + R.pick([-3, 3, 2])+ PPC) % PPC }));
  }

  function fillVariant(R, base, fillStroke) {
    const ev = base.slice();
    const used = base.map(e => e.p);
    const pool = GRID16.filter(p => used.indexOf(p) < 0);
    for (const p of R.drawN(pool, () => 1, 1 + R.int(3))) {
      ev.push({ p: p, stroke: fillStroke, a: r2(R.range(0.45, 0.65)) });
    }
    return ev.sort((a, b) => a.p - b.p);
  }

  function thinVariant(R, base) {
    const ev = base.filter(e => e.anchor || R.chance(0.6));
    return ev.length >= 3 ? ev : base;
  }

  // The answer figure: anchors kept, extra weight in the second half.
  function genResponse(R, base, mainStroke, fillStroke) {
    const ev = base.filter(e => e.anchor).map(e => Object.assign({}, e, { d: undefined, h: undefined }));
    const used = ev.map(e => e.p);
    const pool = GRID16.filter(p => used.indexOf(p) < 0);
    for (const p of R.drawN(pool, p => (p >= 18 ? 1.8 : 0.7), 3 + R.int(2))) {
      ev.push({ p: p, stroke: R.chance(0.6) ? mainStroke : fillStroke, a: r2(R.range(0.6, 0.85)) });
    }
    return ev.sort((a, b) => a.p - b.p);
  }

  /* ---------- the whole groove ---------- */

  function build(seed) {
    const R = new Rng(seed);
    const key = genKey(R);
    const feel = genFeel(R);
    const keel = genKeel(R, key);
    const rootGen = genRoot(R, key.pos);
    const weave = genWeave(R, key.pos, rootGen.anchors);
    const grainGen = genGrain(R, key.pos);
    const halo = genHalo(R, key.pos);

    const root = rootGen.part;
    root.variants = [displaceVariant(R, root.base), fillVariant(R, root.base, "root.press")];
    root.response = genResponse(R, root.base, "root.open", "root.press");

    weave.variants = [displaceVariant(R, weave.base), thinVariant(R, weave.base)];
    weave.response = genResponse(R, weave.base, "weave.snap", "weave.tone");

    halo.variants = [thinVariant(R, halo.base)];

    // Everyone lands on the key figure together for the break.
    const unison = key.pos.slice(0, Math.max(4, key.pos.length - 1));
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
      feel: feel,
      keel: keel,
      root: root,
      weave: weave,
      grain: grainGen.part,
      halo: halo,
      sparkMotifs: genSparkBank(R),
      breakFigure: breakFigure,
      meta: {
        key: key.iv.join("·"),
        feel: feel.id,
        grain: grainGen.grid === 3 ? "sixteenths" : "eighths",
        grainLock: grainGen.lockKey ? "key" : "beat",
        rootAnchors: rootGen.anchors.length,
        weaveVoices: weave.base.length
      }
    };
  }

  // A groove has to be playable, not merely well-formed.
  function usable(set) {
    if (!set.keel.base.length || !set.root.base.length || !set.weave.base.length) return false;
    if (set.root.base.filter(e => e.anchor).length < 2) return false;
    if (set.weave.base.filter(e => e.anchor).length < 1) return false;
    if (set.sparkMotifs.filter(m => m.call).length < 2) return false;
    if (set.sparkMotifs.filter(m => m.ev.length >= 3).length < 3) return false;
    return true;
  }

  G.generate = function (seed) {
    const s = seed || G.newSeed();
    for (let i = 0; i < 8; i++) {
      const set = build(i === 0 ? s : s + "/" + i);
      if (usable(set)) { set.seed = String(s); set.name = G.nameFor(s); return set; }
    }
    const fallback = window.LATTICE.Patterns.houseSet();
    fallback.seed = String(s);
    fallback.name = G.nameFor(s);
    return fallback;
  };

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Generator = G;
})();
