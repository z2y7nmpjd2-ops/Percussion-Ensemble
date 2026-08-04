/* LATTICE — ensemble.js
 * The circle of players and everything between them: who varies when,
 * who answers whom, how heat moves through the group. Parts are planned
 * one full cycle at a time so relationships are decided *musically*
 * (per phrase), then rendered pulse-by-pulse with human timing.
 */
(function () {
  "use strict";

  const L = window.LATTICE;
  const PPC = 48;

  const PLAYERS = [
    { id: "keel",  label: "Keel",  desc: "guide line",   pan: -0.15, level: 0.75, color: "#e0a458" },
    { id: "root",  label: "Root",  desc: "low anchor",   pan:  0.0,  level: 0.95, color: "#d96c4f" },
    { id: "weave", label: "Weave", desc: "mid voice",    pan:  0.3,  level: 0.85, color: "#7fb5a0" },
    { id: "spark", label: "Spark", desc: "lead voice",   pan: -0.35, level: 0.8,  color: "#e8d56f" },
    { id: "grain", label: "Grain", desc: "texture",      pan:  0.5,  level: 0.6,  color: "#9a8fc7" },
    { id: "halo",  label: "Halo",  desc: "color",        pan: -0.55, level: 0.55, color: "#6fa8c9" }
  ];

  function Ensemble(ctx, mixer, sched) {
    this.ctx = ctx;
    this.mixer = mixer;
    this.sched = sched;
    this.players = PLAYERS.map(p => Object.assign({ muted: false, vary: 0.5 }, p));
    this.players.forEach(p => mixer.addBus(p.id, p.pan, p.level));

    // conductor controls (0..1)
    this.ctl = { heat: 0.35, density: 0.5, lilt: 0.4, spread: 0.6, loose: 0.45 };

    // conversation state
    this.turn = "spark";        // who holds variation privilege
    this.motifId = "seed";      // spark's current phrase
    this.pendingCall = false;   // user pressed Call & Answer
    this.respondCycle = -1;     // cycle in which the group answers
    this.breakCycle = -1;       // cycle in which everyone plays the break
    this.heatRamp = 0;          // per-cycle heat drift from Lift/Simmer
    this.manualLead = false;

    this.plan = {};             // playerId -> (pulse -> [ {stroke, a, anchor, soft} ])
    this.lastHits = [];         // for the visualizer: {player, pulse, time, a}

    sched.onCycle = (cycle, when) => this.planCycle(cycle);
    sched.onPulse = (pulse, cycle, when) => this.renderPulse(pulse, when);
  }

  /* ---------- planning: once per cycle ---------- */

  Ensemble.prototype.planCycle = function (cycle) {
    const Pt = L.Patterns, ctl = this.ctl;

    // Lift / Simmer ramps move heat a step per cycle toward their target.
    if (this.heatRamp !== 0) {
      ctl.heat = Math.max(0, Math.min(1, ctl.heat + this.heatRamp));
      if ((this.heatRamp > 0 && ctl.heat >= 0.95) ||
          (this.heatRamp < 0 && ctl.heat <= 0.2)) this.heatRamp = 0;
      if (this.onHeatChange) this.onHeatChange(ctl.heat);
    }

    // Conversation turn passes every two cycles: variation privilege
    // alternates between the lead and the middle voice, so they trade
    // phrases instead of talking over each other.
    if (cycle % 2 === 0) this.turn = (this.turn === "spark") ? "weave" : "spark";

    const plan = {};
    const isBreak = (cycle === this.breakCycle);
    const isResponse = (cycle === this.respondCycle);

    if (isBreak) {
      for (const p of this.players) plan[p.id] = toMap(Pt.breakFigure[p.id] || []);
      this.plan = plan;
      return;
    }

    // KEEL never varies — it is the reference everyone leans on.
    plan.keel = toMap(Pt.keel.base);

    // ROOT and WEAVE: response figure if answering a call, else base or
    // a variant when they hold the turn (or heat runs high).
    plan.root = toMap(this.pickSupport(Pt.root, isResponse, this.turn === "weave"));
    plan.weave = toMap(this.pickSupport(Pt.weave, isResponse, this.turn === "weave"));

    // GRAIN thickens with density/heat via event gating; on response
    // cycles it simply digs in (accent lift handled at render).
    plan.grain = toMap(Pt.grain.base);
    plan.halo = toMap(this.maybeVariant(Pt.halo));

    // SPARK: silent if the human took the lead; otherwise walk the
    // motif graph, energy-matched to heat, with mutation.
    if (this.manualLead) {
      plan.spark = new Map();
    } else {
      const motif = this.pickMotif();
      let ev = motif.ev.slice();
      const mutP = this.playerById("spark").vary * (0.25 + ctl.heat * 0.5);
      if (ev.length && Math.random() < mutP) {
        const keys = Object.keys(Pt.transforms);
        const t = keys[Math.floor(Math.random() * keys.length)];
        ev = Pt.transforms[t](ev);
      }
      plan.spark = toMap(ev);
      if (motif.call && !this.manualLead) this.respondCycle = cycle + 1;
    }

    this.responseNow = isResponse;
    this.plan = plan;
  };

  Ensemble.prototype.pickSupport = function (part, isResponse, holdsTurn) {
    if (isResponse && part.response) return part.response;
    const p = this.playerById(part === L.Patterns.root ? "root" : "weave");
    const varyP = (holdsTurn ? 0.45 : 0.12) * p.vary * (0.4 + this.ctl.heat);
    if (part.variants.length && Math.random() < varyP) {
      return part.variants[Math.floor(Math.random() * part.variants.length)];
    }
    return part.base;
  };

  Ensemble.prototype.maybeVariant = function (part) {
    if (part.variants.length && Math.random() < 0.15 * (0.5 + this.ctl.heat)) {
      return part.variants[Math.floor(Math.random() * part.variants.length)];
    }
    return part.base;
  };

  Ensemble.prototype.pickMotif = function () {
    const motifs = L.Patterns.sparkMotifs;
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
    // energy sits near the current heat; when the lead doesn't hold the
    // conversation turn it favors settling phrases. Spontaneous calls
    // only emerge from real heat.
    const heat = this.ctl.heat;
    const holds = this.turn === "spark";
    let best = null, bestW = -1;
    for (const m of motifs) {
      let w = (cur.after[m.id] || 0.4);
      w *= 1.6 - Math.abs(m.energy - heat);              // energy match
      if (m.call) w *= (holds && heat > 0.6) ? 0.9 : 0.05;
      if (!holds) w *= 1 - m.energy * 0.5;               // settle off-turn
      w *= 0.5 + Math.random();                          // taste
      if (w > bestW) { bestW = w; best = m; }
    }
    this.motifId = best.id;
    return best;
  };

  /* ---------- rendering: every pulse ---------- */

  Ensemble.prototype.renderPulse = function (pulse, when) {
    const H = L.Humanize, ctl = this.ctl;
    const pulseDur = this.sched.pulseDur();

    for (const p of this.players) {
      const evs = this.plan[p.id] && this.plan[p.id].get(pulse);
      if (!evs || p.muted) continue;
      for (const ev of evs) {
        // density / heat gating (anchors always sound)
        if (!ev.anchor) {
          if (ev.d !== undefined && ctl.density < ev.d) continue;
          if (ev.h !== undefined && ctl.heat < ev.h) continue;
        }
        const art = H.articulate(ev, pulse, ctl);
        if (!art) continue;

        let a = art.accent;
        if (this.responseNow && (p.id === "grain" || p.id === "halo")) a = Math.min(1, a * 1.25);

        const vel = H.velocity(a, pulse, ctl);
        const off = H.offset(p.id, pulse, when, ctl, pulseDur);
        const t = Math.max(this.ctx.currentTime + 0.002, when + off);

        L.Voices.play(this.ctx, this.mixer.buses[p.id].gain, art.stroke, t, vel);
        this.lastHits.push({ player: p.id, pulse: pulse, time: t, a: vel });
      }
    }
    // keep the hit trail short
    if (this.lastHits.length > 120) this.lastHits.splice(0, this.lastHits.length - 120);
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
    if (on && this.plan.spark) this.plan.spark = new Map();
  };

  // Live keyboard strokes — played immediately with velocity life only
  // (a human's timing needs no extra humanizing).
  Ensemble.prototype.manual = function (playerId, stroke, accent) {
    const vel = Math.max(0.05, Math.min(1, accent * (0.92 + Math.random() * 0.16)));
    const t = this.ctx.currentTime + 0.003;
    L.Voices.play(this.ctx, this.mixer.buses[playerId].gain, stroke, t, vel);
    const pos = Math.floor(this.sched.position(this.ctx.currentTime) * PPC);
    this.lastHits.push({ player: playerId, pulse: pos, time: t, a: vel });
  };

  Ensemble.prototype.playerById = function (id) {
    return this.players.find(p => p.id === id);
  };

  function toMap(events) {
    const m = new Map();
    for (const e of events) {
      if (!m.has(e.p)) m.set(e.p, []);
      m.get(e.p).push({ stroke: e.stroke, accent: e.a, anchor: !!e.anchor, soft: e.soft, d: e.d, h: e.h });
    }
    return m;
  }

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Ensemble = Ensemble;
  window.LATTICE.PLAYERS = PLAYERS;
})();
