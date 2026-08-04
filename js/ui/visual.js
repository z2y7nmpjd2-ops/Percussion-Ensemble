/* LATTICE — visual.js
 * Concentric rings, one per player, oldest (Keel) outermost. Dots are
 * the planned strokes of the current cycle, sized by accent; a sweep
 * line is "now"; recent hits flare briefly where they actually landed.
 */
(function () {
  "use strict";


  function Visual(canvas, ensemble, sched, ctx) {
    this.cv = canvas;
    this.g = canvas.getContext("2d");
    this.ens = ensemble;
    this.sched = sched;
    this.actx = ctx;
    this.running = false;
  }

  Visual.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  Visual.prototype.stop = function () { this.running = false; };

  Visual.prototype.draw = function () {
    const g = this.g, W = this.cv.width, H = this.cv.height;
    const cx = W / 2, cy = H / 2;
    const players = this.ens.players;
    const rMax = Math.min(W, H) * 0.44;
    const rMin = rMax * 0.3;
    const now = this.actx.currentTime;
    const pos = this.sched.position(now); // 0..1 around the circle
    const ppc = (this.ens.pat && this.ens.pat.ppc) || 48;
    const ticks = ppc / 3;                // one spoke per sixteenth

    g.clearRect(0, 0, W, H);

    // faint sixteenth ticks, emphasized once per beat
    g.save();
    g.translate(cx, cy);
    for (let s = 0; s < ticks; s++) {
      const a = (s / ticks) * Math.PI * 2 - Math.PI / 2;
      const major = s % 4 === 0;
      g.strokeStyle = major ? "rgba(232,230,223,0.16)" : "rgba(232,230,223,0.05)";
      g.lineWidth = major ? 1.5 : 1;
      g.beginPath();
      g.moveTo(Math.cos(a) * rMin * 0.85, Math.sin(a) * rMin * 0.85);
      g.lineTo(Math.cos(a) * (rMax + 12), Math.sin(a) * (rMax + 12));
      g.stroke();
    }

    // player rings + planned strokes
    players.forEach((p, i) => {
      const r = rMax - (i / (players.length - 1)) * (rMax - rMin);
      g.strokeStyle = "rgba(232,230,223,0.08)";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();

      const plan = this.ens.plan[p.id];
      if (!plan) return;
      const dim = p.muted ? 0.18 : 1;
      plan.forEach((evs, pulse) => {
        const a = (pulse / ppc) * Math.PI * 2 - Math.PI / 2;
        const acc = Math.max.apply(null, evs.map(e => e.accent));
        const rad = 2 + acc * 4.5;
        g.fillStyle = hexA(p.color, (0.35 + acc * 0.55) * dim);
        g.beginPath();
        g.arc(Math.cos(a) * r, Math.sin(a) * r, rad, 0, Math.PI * 2);
        g.fill();
      });
    });

    // recent hit flares, where the humanized stroke actually landed
    const cycleDur = this.sched.pulseDur() * ppc;
    for (const h of this.ens.lastHits) {
      const age = now - h.time;
      if (age < 0 || age > 0.3) continue;
      const p = players.find(pl => pl.id === h.player);
      const i = players.indexOf(p);
      const r = rMax - (i / (players.length - 1)) * (rMax - rMin);
      // angle from the actual time within the cycle (micro-timing made visible)
      const cyclePos = pos - (age / cycleDur);
      const a = cyclePos * Math.PI * 2 - Math.PI / 2;
      const fade = 1 - age / 0.3;
      g.fillStyle = hexA(p.color, fade * 0.9);
      g.beginPath();
      g.arc(Math.cos(a) * r, Math.sin(a) * r, 3 + h.a * 7 * fade, 0, Math.PI * 2);
      g.fill();
    }

    // sweep line
    if (this.sched.running) {
      const a = pos * Math.PI * 2 - Math.PI / 2;
      g.strokeStyle = "rgba(224,164,88,0.85)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * rMin * 0.8, Math.sin(a) * rMin * 0.8);
      g.lineTo(Math.cos(a) * (rMax + 10), Math.sin(a) * (rMax + 10));
      g.stroke();
    }

    // center: heat gauge
    g.fillStyle = "rgba(232,230,223,0.5)";
    g.font = "11px sans-serif";
    g.textAlign = "center";
    g.fillText("heat", 0, -6);
    const heat = this.ens.ctl.heat;
    g.strokeStyle = "rgba(232,230,223,0.15)";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(0, 0, rMin * 0.5, -Math.PI / 2, Math.PI * 1.5);
    g.stroke();
    g.strokeStyle = "#d96c4f";
    g.beginPath();
    g.arc(0, 0, rMin * 0.5, -Math.PI / 2, -Math.PI / 2 + heat * Math.PI * 2);
    g.stroke();

    g.restore();
  };

  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const gg = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + gg + "," + b + "," + a + ")";
  }

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Visual = Visual;
})();
