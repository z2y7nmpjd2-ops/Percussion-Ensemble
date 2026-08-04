/* LATTICE — ensemble.js
 * The circle of players and everything between them: who varies when,
 * who answers whom, how heat moves through the group.
 *
 * The three family drums are planned as ONE part, never independently —
 * their strokes are a single composite line handed out across three
 * pitches, and pulling one drum out on its own would break the melody.
 * The lead and the family trade variation turns; the accompaniment drum
 * holds the engine steady underneath both.
 */
(function () {
  "use strict";

  const L = window.LATTICE;

  const PLAYERS = [
    { id: "spine",  label: "Spine",  desc: "timeline",      pan: -0.10, level: 0.70, color: "#e0a458" },
    { id: "floor",  label: "Floor",  desc: "family — low",  pan:  0.05, level: 0.95, color: "#c05a3e" },
    { id: "column", label: "Column", desc: "family — mid",  pan:  0.35, level: 0.85, color: "#d97f52" },
    { id: "arch",   label: "Arch",   desc: "family — high", pan: -0.35, level: 0.75, color: "#e8a87c" },
    { id: "drive",  label: "Drive",  desc: "engine",        pan:  0.55, level: 0.80, color: "#7fb5a0" },
    { id: "caller", label: "Caller", desc: "lead",          pan: -0.50, level: 0.80, color: "#6fa8c9" }
  ];

  const FAMILY = ["floor", "column", "arch"];

  function Ensemble(ctx, mixer, sched) {
    this.ctx = ctx;
    this.mixer = mixer;
    this.sched = sched;
    this.players = PLAYERS.map(p => Object.assign({ muted: false, vary: 0.5 }, p));
    this.players.forEach(p => mixer.addBus(p.id, p.pan, p.level));

    // conductor controls (0..1)
    this.ctl = { heat: 0.35, density: 0.5, lilt: 0.4, spread: 0.6, loose: 0.45 };

    // the groove currently being played; swaps are deferred to a cycle line
    this.pat = L.Patterns.houseSet();
    this.pendingPat = null;

    // conversation state
    this.turn = "caller";       // who holds variation privilege
    this.motifId = "seed";      // the lead's current phrase
    this.pendingCall = false;   // user pressed Call & Answer
    this.respondCycle = -1;     // cycle in which the circle answers
    this.breakCycle = -1;       // cycle in which everyone plays the break
    this.heatRamp = 0;          // per-cycle heat drift from Lift/Simmer
    this.manualLead = false;

    this.plan = {};             // playerId -> (pulse -> [events])
    this.lastHits = [];         // for the visualizer

    sched.onCycle = (cycle, when) => this.planCycle(cycle);
    sched.onPulse = (pulse, cycle, when) => this.renderPulse(pulse, when);

    this.planCycle(0);   // so the ring shows the weave before playback starts
  }

  /* ---------- planning: once per cycle ---------- */

  Ensemble.prototype.planCycle = function (cycle) {
    // A new groove always takes over on a cycle line, never mid-phrase.
    if (this.pendingPat) {
      this.pat = this.pendingPat;
      this.pendingPat = null;
      this.motifId = "seed";
      this.respondCycle = -1;
      if (this.onGrooveChange) this.onGrooveChange(this.pat);
    }

    const Pt = this.pat, ctl = this.ctl;
    this.sched.ppc = Pt.ppc || 48;   // a groove carries its own cycle length

    // Lift / Simmer ramps move heat a step per cycle toward their target.
    if (this.heatRamp !== 0) {
      ctl.heat = Math.max(0, Math.min(1, ctl.heat + this.heatRamp));
      if ((this.heatRamp > 0 && ctl.heat >= 0.95) ||
          (this.heatRamp < 0 && ctl.heat <= 0.2)) this.heatRamp = 0;
      if (this.onHeatChange) this.onHeatChange(ctl.heat);
    }

    // Variation privilege alternates between the lead and the family, so
    // they trade phrases instead of talking over each other.
    if (cycle % 2 === 0) this.turn = (this.turn === "caller") ? "family" : "caller";

    const plan = {};
    const isBreak = (cycle === this.breakCycle);
    const isResponse = (cycle === this.respondCycle);

    if (isBreak) {
      for (const p of this.players) plan[p.id] = toMap(Pt.breakFigure[p.id] || []);
      this.plan = plan;
      this.responseNow = false;
      return;
    }

    // SPINE never varies — it is the reference everyone leans on.
    plan.spine = toMap(Pt.spine.base);

    // THE FAMILY moves as one: base, a whole-family variant, or the answer.
    const fam = this.pickFamily(Pt.family, isResponse, this.turn === "family");
    for (const id of FAMILY) plan[id] = toMap(fam[id] || []);

    // DRIVE holds the engine; it varies rarely and never on the turn.
    plan.drive = toMap(this.pickDrive(Pt.drive, isResponse));

    // CALLER: silent if the human took the lead; otherwise walk the
    // motif graph, energy-matched to heat, with mutation.
    if (this.manualLead) {
      plan.caller = new Map();
      if (this.pendingCall) {
        this.pendingCall = false;
        this.respondCycle = cycle + 1;
        if (this.onCallFired) this.onCallFired();
      }
    } else {
      const motif = this.pickMotif();
      let ev = motif.ev.slice();
      const mutP = this.playerById("caller").vary * (0.25 + ctl.heat * 0.5);
      if (ev.length && Math.random() < mutP) {
        const keys = Object.keys(L.Patterns.transforms);
        const t = keys[Math.floor(Math.random() * keys.length)];
        ev = L.Patterns.transforms[t](ev, Pt.ppc, Pt.step);
      }
      plan.caller = toMap(ev);
      if (motif.call) this.respondCycle = cycle + 1;
    }

    this.responseNow = isResponse;
    this.plan = plan;
  };

  // How adventurous the family is willing to be, as a body.
  Ensemble.prototype.familyVary = function () {
    let sum = 0;
    for (const id of FAMILY) sum += this.playerById(id).vary;
    return sum / FAMILY.length;
  };

  Ensemble.prototype.pickFamily = function (part, isResponse, holdsTurn) {
    if (isResponse && part.response) return part.response;
    const varyP = (holdsTurn ? 0.45 : 0.12) * this.familyVary() * (0.4 + this.ctl.heat);
    if (part.variants.length && Math.random() < varyP) {
      return part.variants[Math.floor(Math.random() * part.variants.length)];
    }
    return part.base;
  };

  Ensemble.prototype.pickDrive = function (part, isResponse) {
    if (isResponse && part.response) return part.response;
    const varyP = 0.1 * this.playerById("drive").vary * (0.4 + this.ctl.heat);
    if (part.variants.length && Math.random() < varyP) {
      return part.variants[Math.floor(Math.random() * part.variants.length)];
    }
    return part.base;
  };

  Ensemble.prototype.pickMotif = function () {
    const motifs = this.pat.callerMotifs;
    const cur = motifs.find(m => m.id === this.motifId) || motifs[1];

    // A user-armed call fires as soon as possible.
    if (this.pendingCall) {
      this.pendingCall = false;
      if (this.onCallFired) this.onCallFired();
      const calls = motifs.filter(m => m.call);
      const m = calls[Math.floor(Math.random() * calls.length)];
      this.motifId = m.id;
      return m;
    }

    // Otherwise: follow the phrase graph, weighted toward motifs whose
    // energy sits near the current heat; off-turn it favors settling.
    const heat = this.ctl.heat;
    const holds = this.turn === "caller";
    let best = null, bestW = -1;
    for (const m of motifs) {
      let w = (cur.after[m.id] || 0.4);
      w *= 1.6 - Math.abs(m.energy - heat);
      if (m.call) w *= (holds && heat > 0.6) ? 0.9 : 0.05;
      if (!holds) w *= 1 - m.energy * 0.5;
      w *= 0.5 + Math.random();
      if (w > bestW) { bestW = w; best = m; }
    }
    this.motifId = best.id;
    return best;
  };

  /* ---------- rendering: every pulse ---------- */

  Ensemble.prototype.renderPulse = function (pulse, when) {
    const H = L.Humanize, ctl = this.ctl;
    const pulseDur = this.sched.pulseDur();
    const tuning = this.pat.tuning;
    const step = this.pat.step || 3;

    for (const p of this.players) {
      const evs = this.plan[p.id] && this.plan[p.id].get(pulse);
      if (!evs || p.muted) continue;
      for (const ev of evs) {
        if (!ev.anchor) {
          if (ev.d !== undefined && ctl.density < ev.d) continue;
          if (ev.h !== undefined && ctl.heat < ev.h) continue;
        }
        const art = H.articulate(ev, pulse, ctl, step);
        if (!art) continue;

        let a = art.accent;
        if (this.responseNow && p.id === "drive") a = Math.min(1, a * 1.2);

        const vel = H.velocity(a, pulse, ctl);
        const off = H.offset(p.id, pulse, when, ctl, pulseDur, this.pat.feel);
        const t = Math.max(this.ctx.currentTime + 0.002, when + off);

        L.Voices.play(this.ctx, this.mixer.buses[p.id].gain, art.stroke, t, vel, tuning);
        this.lastHits.push({ player: p.id, pulse: pulse, time: t, a: vel });
      }
    }
    if (this.lastHits.length > 140) this.lastHits.splice(0, this.lastHits.length - 140);
  };

  /* ---------- conducting ---------- */

  Ensemble.prototype.cue = function (name) {
    const cur = this.sched.cycle;
    if (name === "call") this.pendingCall = true;
    if (name === "break") this.breakCycle = cur + 1;
    if (name === "lift") this.heatRamp = 0.07;
    if (name === "simmer") this.heatRamp = -0.07;
  };

  Ensemble.prototype.setControl = function (name, v) {
    this.ctl[name] = v;
    if (name === "heat") this.heatRamp = 0; // manual heat cancels ramps
  };

  Ensemble.prototype.setManualLead = function (on) {
    this.manualLead = on;
    if (on && this.plan.caller) this.plan.caller = new Map();
  };

  /* Swap the groove. While the ensemble is playing this lands on the next
   * cycle line so the change arrives in time; stopped, it applies at once
   * so the ring shows the new weave immediately. */
  Ensemble.prototype.setPatternSet = function (set) {
    if (this.sched.running) {
      this.pendingPat = set;
    } else {
      this.pat = set;
      this.motifId = "seed";
      this.respondCycle = -1;
      this.breakCycle = -1;
      if (this.onGrooveChange) this.onGrooveChange(set);
      this.planCycle(0);
    }
  };

  Ensemble.prototype.regenerate = function (seed) {
    const set = L.Generator.generate(seed);
    this.setPatternSet(set);
    return set;
  };

  // Live keyboard strokes — velocity life only; a human's timing needs
  // no extra humanizing.
  Ensemble.prototype.manual = function (playerId, stroke, accent) {
    const vel = Math.max(0.05, Math.min(1, accent * (0.92 + Math.random() * 0.16)));
    const t = this.ctx.currentTime + 0.003;
    L.Voices.play(this.ctx, this.mixer.buses[playerId].gain, stroke, t, vel, this.pat.tuning);
    const pos = Math.floor(this.sched.position(this.ctx.currentTime) * this.sched.ppc);
    this.lastHits.push({ player: playerId, pulse: pos, time: t, a: vel });
  };

  Ensemble.prototype.playerById = function (id) {
    return this.players.find(p => p.id === id);
  };

  function toMap(events) {
    const m = new Map();
    for (const e of events) {
      if (!m.has(e.p)) m.set(e.p, []);
      m.get(e.p).push({ stroke: e.stroke, accent: e.a, anchor: !!e.anchor,
                        soft: e.soft, d: e.d, h: e.h });
    }
    return m;
  }

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Ensemble = Ensemble;
  window.LATTICE.PLAYERS = PLAYERS;
  window.LATTICE.FAMILY = FAMILY;
})();
