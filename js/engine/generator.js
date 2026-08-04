/* LATTICE — generator.js
 * Grows a whole circle from a short seed: its meter, the length of its
 * cycle, how the drum family is spaced by register, the timeline everyone
 * hangs on, the composite line the family shares, the strikers that interlock
 * above it, the engine underneath, and the lead's vocabulary.
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
  const FAM = ["floor", "column", "arch"];

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

  function Rng(seed) { this.next = mulberry32(xmur3(String(seed))()); }
  Rng.prototype.int = function (n) { return Math.floor(this.next() * n); };
  Rng.prototype.intRange = function (a, b) { return a + this.int(b - a + 1); };
  Rng.prototype.range = function (a, b) { return a + this.next() * (b - a); };
  Rng.prototype.pick = function (arr) { return arr[this.int(arr.length)]; };
  Rng.prototype.chance = function (p) { return this.next() < p; };
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

  /* One stroke per pulse per HAND. A family player holds a stick over the
   * drum and a striker in the other hand, so a drum stroke and a striker
   * stroke may land on the same pulse — that pairing is a large part of
   * how the family sounds. Two strokes on the same drum at the same
   * instant is the impossible case, and that is what collapses here. */
  function dedupe(ev) {
    const by = new Map();
    for (const e of ev) {
      const hand = e.p + (e.stroke.indexOf(".bell") > 0 ? ":s" : ":d");
      const cur = by.get(hand);
      if (!cur) { by.set(hand, Object.assign({}, e)); continue; }
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
  const NOUN = ["Circle", "Drift", "Weave", "Pulse", "Column", "Current", "Braid", "Ladder",
                "Spiral", "Anchor", "Thread", "Frame", "Ring", "Ridge", "Seam", "Bend",
                "Field", "Chain", "Gate", "Terrace", "Furrow", "Span", "Shelf", "Lock",
                "Vessel", "Rafter", "Harbour", "Signal", "Cradle", "Quarry", "Beam"];

  G.nameFor = function (seed) {
    const R = new Rng(seed + "/name");
    return R.pick(ADJ) + " " + R.pick(NOUN);
  };

  /* ---------- archetypes ---------- */

  const ARCHETYPES = [
    { id: "open",    famDensity: [0.3, 0.45], bells: ["sparse", "layer"],
      engine: ["plain"],            tiers: 4, calls: 2, mutes: [0, 2] },
    { id: "driving", famDensity: [0.5, 0.72], bells: ["split", "double"],
      engine: ["busy", "plain"],    tiers: 5, calls: 3, mutes: [2, 5] },
    { id: "talking", famDensity: [0.42, 0.62], bells: ["layer", "split"],
      engine: ["plain", "busy"],    tiers: 5, calls: 3, mutes: [1, 4] },
    { id: "deep",    famDensity: [0.3, 0.48], bells: ["sparse", "layer"],
      engine: ["plain", "spare"],   tiers: 3, calls: 2, mutes: [1, 3] },
    { id: "rolling", famDensity: [0.48, 0.68], bells: ["split", "layer"],
      engine: ["busy"],             tiers: 4, calls: 2, mutes: [2, 4] }
  ];

  /* ---------- meter, tuning, feel ---------- */

  // Four values per beat in a binary groove, three in a ternary one.
  const FEELS_BINARY = [
    { id: "even",     lean: [0, 0.10, -0.02, 0.08] },
    { id: "rolling",  lean: [0, 0.42, -0.08, 0.30] },
    { id: "leaning",  lean: [0, 0.55, 0.04, 0.36] },
    { id: "pushed",   lean: [0, 0.24, -0.20, 0.14] },
    { id: "dragged",  lean: [0, 0.36, 0.18, 0.46] },
    { id: "level",    lean: [0, 0.04, 0.02, 0.05] }
  ];
  const FEELS_TERNARY = [
    { id: "even",     lean: [0, 0.05, 0.03] },
    { id: "rolling",  lean: [0, 0.18, 0.08] },
    { id: "leaning",  lean: [0, 0.28, 0.13] },
    { id: "pushed",   lean: [0, 0.10, -0.07] },
    { id: "dragged",  lean: [0, 0.22, 0.21] },
    { id: "level",    lean: [0, 0.03, 0.02] }
  ];

  function genProfiles(R) {
    const out = {};
    for (const id of ["spine", "floor", "column", "arch", "drive", "caller"]) {
      if (!R.chance(0.55)) continue;
      const span = id === "spine" ? 2 : 7;
      out[id] = { lean: r2(R.range(-span, span)) };
    }
    return out;
  }

  function genFeel(R, meter) {
    const base = R.pick(meter === "ternary" ? FEELS_TERNARY : FEELS_BINARY);
    const jit = meter === "ternary" ? 0.04 : 0.07;
    return {
      id: base.id,
      lean: base.lean.map((v, i) => (i === 0 ? 0 : r2(v + R.range(-jit, jit)))),
      profiles: genProfiles(R)
    };
  }

  /* The family is spaced by REGISTER, not tuned by interval. The ratios
   * below are deliberately not simple fractions, and the voices they feed
   * are broadband, so the three drums separate without ever implying a
   * chord. Spacing decides how far apart the composite line ranges. */
  const SPACINGS = [
    { id: "close", r: [1, 1.43, 2.25] },
    { id: "mid",   r: [1, 1.59, 2.80] },
    { id: "wide",  r: [1, 1.78, 3.33] },
    { id: "steep", r: [1, 2.13, 3.71] }
  ];
  // Every pair above — mid/low, high/mid and high/low — is kept clear of
  // the simple ratios (5:4, 4:3, 3:2, 5:3, 2:1, 5:2, 3:1) that would put
  // an interval back into the family.

  function genRegister(R) {
    const t = R.pick(SPACINGS);
    const base = R.range(72, 92);
    return {
      id: t.id,
      register: {
        floor:  Math.round(base),
        column: Math.round(base * t.r[1]),
        arch:   Math.round(base * t.r[2]),
        drive:  Math.round(R.range(88, 112)),
        caller: Math.round(R.range(132, 172))
      }
    };
  }

  /* ---------- the timeline ---------- */

  function genSpine(R, ppc, step) {
    const mode = R.weighted(["uneven", "pulse"], [3.4, 1]);

    if (mode === "pulse") {
      const cands = divisors(ppc, step, Math.max(step, Math.floor(ppc / 3)))
        .filter(d => d % step === 0);
      const s = R.pick(cands.length ? cands : [step]);
      const pos = grid(ppc, s);
      const every = R.intRange(2, 4);
      const from = R.int(pos.length);
      const ev = pos.map((p, i) => {
        const strong = ((i - from) % every + every) % every === 0;
        return { p: p, stroke: strong ? "spine.high" : "spine.low",
                 a: strong ? r2(R.range(0.88, 1.0)) : r2(R.range(0.55, 0.7)),
                 anchor: true };
      });
      return { mode: "pulse", pos: pos, key: "pulse /" + (s / step),
               part: { base: dedupe(ev), variants: [] } };
    }

    // An uneven partition of the cycle into spans that are all multiples
    // of the subdivision. Even partitions are rejected: they would give
    // the circle nothing to lean on.
    const spans = [1, 2, 3, 4, 5].map(k => k * step);
    const wts   = [0.5, 1.6, 1.5, 0.8, 0.35];
    let pos = null, iv = null;
    for (let attempt = 0; attempt < 900; attempt++) {
      const cand = [];
      let sum = 0;
      while (sum < ppc && cand.length < 9) {
        const v = R.weighted(spans, wts);
        if (sum + v > ppc) break;
        cand.push(v); sum += v;
      }
      if (sum !== ppc || cand.length < 4) continue;
      if (new Set(cand).size < 2) continue;
      let p = 0; const ps = [];
      for (const v of cand) { ps.push(p); p += v; }
      if (!ps.some(x => x % PPB !== 0)) continue;      // must cut across the beat
      pos = ps; iv = cand;
      break;
    }
    if (!pos) { pos = grid(ppc, step * 2); iv = pos.map(() => step * 2); }

    const ev = pos.map((p, i) => ({
      p: p,
      stroke: iv[i] > step ? "spine.high" : "spine.low",
      a: i === 0 ? 1.0 : r2(R.range(0.76, 0.92)),
      anchor: true
    }));
    if (ev.length) ev[0].stroke = "spine.high";
    return { mode: "uneven", pos: pos, key: iv.join("·"),
             part: { base: dedupe(ev), variants: [] } };
  }

  /* ---------- the family's composite line ----------
   * The three drums are written as ONE line: a rhythm across the
   * subdivision grid, and a contour that says which drum speaks each
   * time. Stepwise motion is preferred, and the line settles onto the low
   * drum at structural points — that settling is what makes three
   * unpitched drums read as one instrument with a range. */

  const CONTOURS = ["rise", "fall", "arch", "valley", "rock", "pedal"];

  function contourLevels(R, count, shape) {
    const lv = [];
    let cur = 0;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      let target;
      if (shape === "rise") target = t * 2;
      else if (shape === "fall") target = (1 - t) * 2;
      else if (shape === "arch") target = Math.sin(t * Math.PI) * 2;
      else if (shape === "valley") target = 2 - Math.sin(t * Math.PI) * 2;
      else if (shape === "rock") target = Math.sin(t * Math.PI * 2) + 1;
      else target = (i % 4 === 0) ? 0 : 1 + (R.chance(0.45) ? 1 : 0);   // pedal
      // stepwise motion toward the target, with the occasional leap
      if (cur < target - 0.4) cur += 1;
      else if (cur > target + 0.4) cur -= 1;
      else if (R.chance(0.22)) cur += R.chance(0.5) ? 1 : -1;
      lv.push(Math.max(0, Math.min(2, cur)));
      cur = lv[lv.length - 1];
    }
    return lv;
  }

  function genFamilyLine(R, C) {
    const g = grid(C.ppc, C.step);
    const dens = R.range(C.arch_.famDensity[0], C.arch_.famDensity[1]);
    const n = Math.max(4, Math.min(g.length, Math.round(g.length * dens)));
    const score = p => (p % PPB === 0 ? 2.0 : 1) +
                       (C.spinePos.indexOf(p) >= 0 ? 0.5 : 0.3);
    const pos = R.drawN(g, score, n).sort((a, b) => a - b);

    const shape = R.pick(CONTOURS);
    const levels = contourLevels(R, pos.length, shape);
    // Resolve onto the low drum wherever the cycle turns over.
    for (let i = 0; i < pos.length; i++) if (pos[i] % C.ppc === 0) levels[i] = 0;

    const out = { floor: [], column: [], arch: [] };
    for (let i = 0; i < pos.length; i++) {
      const id = FAM[levels[i]];
      const onBeat = pos[i] % PPB === 0;
      const turn = i === 0 || levels[i] !== levels[i - 1];
      const a = onBeat ? R.range(0.85, 0.98) : (turn ? R.range(0.7, 0.85) : R.range(0.6, 0.75));
      out[id].push({ p: pos[i], stroke: id + ".open", a: r2(a) });
    }
    // Two anchors hold the line: its first stroke and its lowest late one.
    const first = pos[0], firstId = FAM[levels[0]];
    markAnchor(out[firstId], first);
    let lateLow = -1, lateId = null;
    for (let i = 0; i < pos.length; i++) {
      if (pos[i] >= C.ppc * 0.4 && (lateLow < 0 || levels[i] <= FAM.indexOf(lateId))) {
        lateLow = pos[i]; lateId = FAM[levels[i]];
      }
    }
    if (lateId) markAnchor(out[lateId], lateLow);

    // Muted strokes fill where the line is silent — the drum you are not
    // speaking on still answers under your hand.
    const used = pos.slice();
    const freePool = g.filter(p => used.indexOf(p) < 0);
    const nMute = R.intRange(C.arch_.mutes[0], C.arch_.mutes[1]);
    for (const p of R.drawN(freePool, () => 1, nMute)) {
      const id = FAM[R.weighted([0, 1, 2], [1, 1.3, 1.1])];
      out[id].push({ p: p, stroke: id + ".mute", a: r2(R.range(0.3, 0.45)),
                     d: r2(R.range(0.35, 0.65)) });
    }

    // An occasional drag: the same drum twice, a half-subdivision apart.
    if (R.chance(0.45)) {
      const i = R.int(pos.length);
      const id = FAM[levels[i]];
      const half = Math.max(2, Math.round(C.step / 2));
      const p2 = pos[i] + half;
      if (p2 < C.ppc) {
        out[id].push({ p: p2, stroke: id + ".mute", a: r2(R.range(0.3, 0.4)),
                       h: r2(R.range(0.45, 0.65)) });
      }
    }

    return { parts: out, contour: shape, positions: pos, levels: levels };
  }

  function markAnchor(list, p) {
    for (const e of list) if (e.p === p) { e.anchor = true; delete e.d; delete e.h; }
  }

  /* ---------- the strikers ----------
   * Each family player carries one. Their patterns are simpler than the
   * drum parts and interlock with each other, so the subdivision they
   * produce together is one none of them plays alone. */

  function genBells(R, C, style) {
    const out = { floor: [], column: [], arch: [] };
    const g = grid(C.ppc, C.step);
    const beats = grid(C.ppc, PPB);

    if (style === "split") {
      // Three hands, one continuous line between them.
      const off = R.int(3);
      g.forEach((p, i) => {
        const id = FAM[(i + off) % 3];
        out[id].push({ p: p, stroke: id + ".bell",
                       a: r2(p % PPB === 0 ? R.range(0.5, 0.62) : R.range(0.38, 0.5)),
                       d: p % PPB === 0 ? 0 : r2(R.range(0.2, 0.4)) });
      });
    } else if (style === "layer") {
      // Low on the beat, mid off it, high tracing the timeline.
      for (const p of beats) {
        out.floor.push({ p: p, stroke: "floor.bell", a: r2(R.range(0.5, 0.62)) });
      }
      for (const p of g) {
        if (p % PPB === 0) continue;
        if (R.chance(0.75)) {
          out.column.push({ p: p, stroke: "column.bell", a: r2(R.range(0.4, 0.52)),
                            d: r2(R.range(0.2, 0.4)) });
        }
      }
      for (const p of C.spinePos) {
        if (R.chance(0.7)) {
          out.arch.push({ p: p, stroke: "arch.bell", a: r2(R.range(0.36, 0.5)),
                          d: r2(R.range(0.3, 0.55)) });
        }
      }
    } else if (style === "double") {
      for (const p of beats) {
        out.floor.push({ p: p, stroke: "floor.bell", a: r2(R.range(0.5, 0.62)) });
        out.column.push({ p: p, stroke: "column.bell", a: r2(R.range(0.42, 0.54)) });
      }
      for (const p of g) {
        out.arch.push({ p: p, stroke: "arch.bell", a: r2(R.range(0.34, 0.46)),
                        d: r2(R.range(0.3, 0.55)) });
      }
    } else {                                   // sparse
      const every = R.pick([1, 2]);
      beats.forEach((p, i) => {
        if (i % every !== 0) return;
        out.floor.push({ p: p, stroke: "floor.bell", a: r2(R.range(0.48, 0.6)) });
      });
      for (const p of R.drawN(g.filter(x => x % PPB !== 0), () => 1, R.intRange(1, 3))) {
        out.column.push({ p: p, stroke: "column.bell", a: r2(R.range(0.36, 0.48)),
                          d: r2(R.range(0.4, 0.6)) });
      }
    }
    return out;
  }

  /* ---------- the engine ----------
   * A repeating cell, stated as many times as the cycle allows. Steady
   * is the point: this part is what the rest of the circle counts on. */

  function genDrive(R, C) {
    const beats = C.ppc / PPB;
    const cellBeats = R.pick(divisors(beats, 1, Math.max(1, beats)));
    const cellLen = cellBeats * PPB;
    const reps = C.ppc / cellLen;
    const style = R.pick(C.arch_.engine);

    const slots = grid(cellLen, C.step);
    const slapAt = R.drawN(slots.filter(p => p !== 0),
                           p => (p % PPB === 0 ? 0.6 : 1.5), 1)[0];

    const cell = [];
    for (const p of slots) {
      if (p === 0) { cell.push({ p: 0, stroke: "drive.bass", a: 0.9, anchor: true }); continue; }
      if (p === slapAt) { cell.push({ p: p, stroke: "drive.slap", a: r2(R.range(0.8, 0.92)),
                                      anchor: true }); continue; }
      if (style === "spare") {
        if (R.chance(0.45)) cell.push({ p: p, stroke: "drive.tone", a: r2(R.range(0.55, 0.68)),
                                        soft: "drive.ghost" });
      } else if (style === "busy") {
        cell.push(R.chance(0.55)
          ? { p: p, stroke: "drive.tone", a: r2(R.range(0.55, 0.7)), soft: "drive.ghost" }
          : { p: p, stroke: "drive.ghost", a: r2(R.range(0.26, 0.36)), d: r2(R.range(0.3, 0.5)) });
      } else {
        if (R.chance(0.7)) {
          cell.push(R.chance(0.6)
            ? { p: p, stroke: "drive.tone", a: r2(R.range(0.55, 0.7)), soft: "drive.ghost" }
            : { p: p, stroke: "drive.ghost", a: r2(R.range(0.26, 0.36)), d: r2(R.range(0.35, 0.55)) });
        }
      }
    }

    const ev = [];
    for (let rep = 0; rep < reps; rep++) {
      for (const e of cell) {
        const c = Object.assign({}, e, { p: e.p + rep * cellLen });
        if (rep > 0 && c.anchor && c.stroke === "drive.bass") c.a = r2(c.a * 0.94);
        ev.push(c);
      }
    }
    // The last statement leans out of the cycle rather than repeating flat.
    if (reps > 1 && R.chance(0.6)) {
      const last = ev[ev.length - 1];
      last.stroke = R.chance(0.5) ? "drive.slap" : "drive.tone";
      last.a = r2(Math.min(1, last.a + 0.12));
    }
    return { style: style, cellBeats: cellBeats,
             part: { base: dedupe(ev), variants: [], response: null } };
  }

  /* ---------- the lead ---------- */

  function strongStroke(R) {
    return R.weighted(["caller.slap", "caller.tone", "caller.bass"], [1.5, 1.1, 0.7]);
  }
  function weakStroke(R) {
    return R.chance(0.72) ? "caller.ghost" : "caller.tone";
  }

  function phraseWalk(R, C, energy) {
    const count = Math.round(3 + energy * 8);
    const s = C.step;
    const steps = energy > 0.6 ? [s / 2, s, s, s * 1.5].map(Math.round)
                : energy > 0.4 ? [s, s, s * 1.5, s * 2].map(Math.round)
                : [s * 2, s * 3, s * 3].map(Math.round);
    let p = R.pick(grid(C.ppc, s).slice(0, 6));
    const ev = [];
    for (let i = 0; i < count && p < C.ppc; i++) {
      const strong = i === 0 || i === count - 1 || R.chance(0.3 + energy * 0.2);
      ev.push({ p: p, stroke: strong ? strongStroke(R) : weakStroke(R),
                a: strong ? r2(R.range(0.65, 0.85)) : r2(R.range(0.38, 0.55)) });
      p += Math.max(2, R.pick(steps));
    }
    return ev;
  }

  // A short cell restated at a fixed distance — the most motivic grammar.
  function phraseCell(R, C, energy) {
    const len = R.intRange(2, 3 + Math.round(energy * 2));
    const inner = [];
    for (let i = 0; i < len - 1; i++) inner.push(Math.max(2, Math.round(C.step * R.pick([0.5, 1, 1]))));
    const period = R.pick([PPB, PPB, PPB * 1.5, PPB * 2].map(Math.round))
                     .valueOf();
    const start = R.pick(grid(C.ppc, C.step).slice(0, 4));
    const ev = [];
    for (let rep = 0; start + rep * period < C.ppc; rep++) {
      let p = start + rep * period;
      for (let i = 0; i < len && p < C.ppc; i++) {
        const strong = i === 0;
        ev.push({ p: p, stroke: strong ? strongStroke(R) : weakStroke(R),
                  a: strong ? r2(Math.max(0.5, R.range(0.7, 0.9) - rep * 0.04))
                            : r2(R.range(0.38, 0.55)) });
        p += inner[i] || C.step;
      }
    }
    return ev;
  }

  // Density gathers, then thins — a phrase with a shape.
  function phraseArc(R, C, energy) {
    const peak = R.range(0.3, 0.7) * C.ppc;
    const ev = [];
    for (let p = 0; p < C.ppc; p += Math.max(2, Math.round(C.step / 2))) {
      const near = 1 - Math.abs(p - peak) / (C.ppc * 0.55);
      if (near <= 0) continue;
      if (!R.chance(near * (0.32 + energy * 0.55))) continue;
      const strong = R.chance(0.3 + near * 0.4);
      ev.push({ p: p, stroke: strong ? strongStroke(R) : weakStroke(R),
                a: strong ? r2(R.range(0.65, 0.88)) : r2(R.range(0.36, 0.55)) });
    }
    return ev;
  }

  // A few isolated strong strokes with air around them.
  function phrasePunctuate(R, C, energy) {
    const n = R.intRange(2, 3 + Math.round(energy * 3));
    return R.drawN(grid(C.ppc, C.step), p => (p % PPB === 0 ? 0.6 : 1.4), n)
      .sort((a, b) => a - b)
      .map(p => ({ p: p, stroke: strongStroke(R), a: r2(R.range(0.62, 0.9)) }));
  }

  const GRAMMARS = [phraseWalk, phraseCell, phraseArc, phrasePunctuate];

  // A call declares itself: an even repeated figure, then a landing.
  function genCall(R, C) {
    const step = Math.max(2, R.pick([C.step / 2, C.step, C.step].map(Math.round)));
    const start = R.pick(grid(C.ppc, C.step).slice(0, 4));
    const reps = R.intRange(3, 5);
    const ev = [];
    let p = start;
    for (let i = 0; i < reps && p < C.ppc; i++) {
      ev.push({ p: p,
                stroke: i % 2 === 0 ? "caller.slap" : (step <= 3 ? "caller.ghost" : "caller.slap"),
                a: i % 2 === 0 ? r2(R.range(0.85, 1.0)) : r2(R.range(0.5, 0.65)) });
      p += step;
    }
    const land = Math.min(C.ppc - 2, p + R.pick([C.step, C.step * 2, C.step * 3]));
    ev.push({ p: land, stroke: "caller.bass", a: 0.95, anchor: true });
    if (R.chance(0.65) && land + C.step * 2 < C.ppc) {
      ev.push({ p: land + C.step * 2, stroke: "caller.slap", a: r2(R.range(0.85, 0.95)) });
    }
    if (ev.length) ev[0].anchor = true;
    return ev;
  }

  const TIER_IDS = ["seed", "offset", "roll", "rise", "surge"];
  const CALL_IDS = ["callA", "callB", "callC"];

  function genCallerBank(R, C) {
    const bank = [{ id: "rest", energy: 0, call: false, after: {}, ev: [] }];
    const nTiers = Math.min(TIER_IDS.length, C.arch_.tiers);
    for (let i = 0; i < nTiers; i++) {
      const energy = r2(0.22 + (i / Math.max(1, nTiers - 1)) * 0.5);
      let ev = dedupe(R.pick(GRAMMARS)(R, C, energy)).filter(e => e.p < C.ppc);
      if (!ev.length) ev = dedupe(phrasePunctuate(R, C, energy));
      if (ev.length) ev[0].a = Math.min(1, r2(ev[0].a + 0.08));
      bank.push({ id: TIER_IDS[i], energy: energy, call: false, after: {}, ev: ev });
    }
    const nCalls = Math.min(CALL_IDS.length, C.arch_.calls);
    for (let i = 0; i < nCalls; i++) {
      bank.push({ id: CALL_IDS[i], energy: r2(0.84 + i * 0.04), call: true, after: {},
                  ev: dedupe(genCall(R, C)) });
    }
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

  /* ---------- variants and answers ---------- */

  function familyVariant(R, C, line, bells) {
    // Re-voice the same rhythm through a different contour: the line
    // moves, the shape of the part stays recognisable.
    const shape = R.pick(CONTOURS);
    const levels = contourLevels(R, line.positions.length, shape);
    const out = { floor: [], column: [], arch: [] };
    for (let i = 0; i < line.positions.length; i++) {
      const id = FAM[levels[i]];
      const onBeat = line.positions[i] % PPB === 0;
      out[id].push({ p: line.positions[i], stroke: id + ".open",
                     a: r2(onBeat ? R.range(0.84, 0.96) : R.range(0.6, 0.8)) });
    }
    markAnchor(out[FAM[levels[0]]], line.positions[0]);
    for (const id of FAM) out[id] = dedupe(out[id].concat(bells[id]));
    if (!FAM.some(id => out[id].some(e => e.anchor))) markAnchor(out.floor, line.positions[0]);
    return out;
  }

  function familyResponse(R, C, line, bells) {
    // The answer closes ranks: the line fills in and drives to the end.
    const g = grid(C.ppc, C.step);
    const pos = line.positions.slice();
    for (const p of R.drawN(g.filter(x => pos.indexOf(x) < 0),
                            x => (x >= C.ppc * 0.4 ? 1.8 : 0.7), R.intRange(2, 4))) {
      pos.push(p);
    }
    pos.sort((a, b) => a - b);
    const levels = contourLevels(R, pos.length, R.pick(["rise", "arch", "rock"]));
    const out = { floor: [], column: [], arch: [] };
    for (let i = 0; i < pos.length; i++) {
      const id = FAM[levels[i]];
      out[id].push({ p: pos[i], stroke: id + ".open", a: r2(R.range(0.72, 0.95)) });
    }
    markAnchor(out[FAM[levels[0]]], pos[0]);
    for (const id of FAM) out[id] = dedupe(out[id].concat(bells[id]));
    if (!FAM.some(id => out[id].some(e => e.anchor))) markAnchor(out.floor, pos[0]);
    return out;
  }

  function driveVariant(R, C, base) {
    return dedupe(base.map(e => (e.anchor || R.chance(0.6))
      ? e
      : Object.assign({}, e, {
          stroke: R.chance(0.5) ? "drive.slap" : e.stroke,
          a: r2(Math.min(1, e.a + 0.08))
        })));
  }

  function driveResponse(R, C, base) {
    return dedupe(base.map(e => {
      const c = Object.assign({}, e);
      if (!c.anchor && c.stroke === "drive.ghost" && R.chance(0.6)) c.stroke = "drive.tone";
      if (!c.anchor && c.stroke === "drive.tone" && R.chance(0.45)) c.stroke = "drive.slap";
      delete c.d; delete c.h;
      c.a = r2(Math.min(1, c.a + 0.08));
      return c;
    }));
  }

  /* ---------- the whole groove ---------- */

  function build(seed) {
    const R = new Rng(seed);
    const meter = R.weighted(["ternary", "binary"], [1.15, 1]);
    const step = meter === "ternary" ? 4 : 3;
    const ppc = R.weighted([36, 48, 60, 72], [1.0, 3.0, 0.85, 0.6]);
    const arch_ = R.pick(ARCHETYPES);
    const feel = genFeel(R, meter);
    const reg = genRegister(R);

    const spine = genSpine(R, ppc, step);
    const C = { ppc: ppc, beats: ppc / PPB, step: step, meter: meter,
                arch_: arch_, spinePos: spine.pos };

    const line = genFamilyLine(R, C);
    const bellStyle = R.pick(arch_.bells);
    const bells = genBells(R, C, bellStyle);

    const famBase = {};
    for (const id of FAM) famBase[id] = dedupe(line.parts[id].concat(bells[id]));

    const drive = genDrive(R, C);
    drive.part.variants = [driveVariant(R, C, drive.part.base)];
    drive.part.response = driveResponse(R, C, drive.part.base);

    // Everyone lands on the timeline together for the break.
    const unison = spine.pos.slice(0, Math.max(4, Math.min(6, spine.pos.length - 1)));
    const breakFigure = {
      spine:  unison.map(p => ({ p: p, stroke: "spine.high",  a: 1, anchor: true })),
      floor:  unison.map(p => ({ p: p, stroke: "floor.open",  a: 1, anchor: true })),
      column: unison.map(p => ({ p: p, stroke: "column.open", a: 1, anchor: true })),
      arch:   unison.map(p => ({ p: p, stroke: "arch.open",   a: 1, anchor: true })),
      drive:  unison.map(p => ({ p: p, stroke: "drive.slap",  a: 1, anchor: true })),
      caller: unison.map(p => ({ p: p, stroke: "caller.slap", a: 1, anchor: true }))
    };

    return {
      seed: String(seed),
      name: G.nameFor(seed),
      ppc: ppc,
      meter: meter,
      step: step,
      register: reg.register,
      feel: feel,
      spine: spine.part,
      family: {
        base: famBase,
        variants: [familyVariant(R, C, line, bells)],
        response: familyResponse(R, C, line, bells)
      },
      drive: drive.part,
      callerMotifs: genCallerBank(R, C),
      breakFigure: breakFigure,
      meta: {
        beats: C.beats,
        meter: meter,
        key: spine.key,
        feel: feel.id,
        archetype: arch_.id,
        spacing: reg.id,
        contour: line.contour,
        bells: bellStyle,
        engine: drive.style + " / " + drive.cellBeats + "-beat cell"
      }
    };
  }

  // A groove has to be playable, not merely well-formed.
  function usable(set) {
    if (!set.spine.base.length || !set.drive.base.length) return false;
    if (set.spine.base.length < 3) return false;
    const fam = set.family.base;
    const opens = FAM.reduce((n, id) =>
      n + fam[id].filter(e => e.stroke === id + ".open").length, 0);
    if (opens < 5) return false;                       // the melody needs notes
    const voiced = FAM.filter(id => fam[id].some(e => e.stroke === id + ".open")).length;
    if (voiced < 2) return false;                      // at least two drums must speak
    if (!FAM.some(id => fam[id].some(e => e.anchor))) return false;
    if (!set.drive.base.some(e => e.anchor)) return false;
    if (set.callerMotifs.filter(m => m.call).length < 2) return false;
    if (set.callerMotifs.filter(m => m.ev.length >= 3).length < 2) return false;

    let total = set.spine.base.length + set.drive.base.length;
    for (const id of FAM) total += fam[id].length;
    if (total < 18 || total > 150) return false;

    const parts = [set.spine.base, set.drive.base, fam.floor, fam.column, fam.arch];
    for (const part of parts) {
      if (part.some(e => e.p < 0 || e.p >= set.ppc)) return false;
    }
    for (const m of set.callerMotifs) {
      if (m.ev.some(e => e.p < 0 || e.p >= set.ppc)) return false;
    }
    return true;
  }

  G.generate = function (seed) {
    const s = seed || G.newSeed();
    for (let i = 0; i < 14; i++) {
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
