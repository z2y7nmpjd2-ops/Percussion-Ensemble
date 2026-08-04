/* LATTICE — scheduler.js
 * Lookahead clock: a 25 ms setInterval walks pulse-by-pulse ~140 ms
 * ahead of the audio clock and hands each pulse to the ensemble, which
 * schedules strokes at sample-accurate times (plus human offsets, which
 * may be negative — the lookahead margin absorbs pushes ahead of the beat).
 */
(function () {
  "use strict";

  const PPC = 48;       // pulses per cycle
  const PPB = 12;       // pulses per beat (beat = quarter note)

  function Scheduler(ctx) {
    this.ctx = ctx;
    this.bpm = 96;
    this.running = false;
    this.pulse = 0;          // 0..47 within the cycle
    this.cycle = 0;
    this.nextTime = 0;       // audio-clock time of the next pulse
    this.lookahead = 0.14;   // seconds scheduled ahead
    this.interval = null;
    this.onPulse = null;     // (pulseInCycle, cycle, when) => void
    this.onCycle = null;     // (cycle, when) => void — fired before pulse 0
  }

  Scheduler.prototype.pulseDur = function () {
    return 60 / this.bpm / PPB;
  };

  Scheduler.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this.pulse = 0;
    this.cycle = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    const tick = () => {
      while (this.nextTime < this.ctx.currentTime + this.lookahead) {
        if (this.pulse === 0 && this.onCycle) this.onCycle(this.cycle, this.nextTime);
        if (this.onPulse) this.onPulse(this.pulse, this.cycle, this.nextTime);
        this.nextTime += this.pulseDur();
        this.pulse++;
        if (this.pulse >= PPC) { this.pulse = 0; this.cycle++; }
      }
    };
    this.interval = setInterval(tick, 25);
    tick();
  };

  Scheduler.prototype.stop = function () {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  };

  Scheduler.prototype.setBpm = function (bpm) {
    this.bpm = bpm;
  };

  // Continuous cycle position 0..1 at audio time t (for the visualizer).
  Scheduler.prototype.position = function (t) {
    if (!this.running) return 0;
    const dur = this.pulseDur();
    const pulsesAhead = (this.nextTime - t) / dur;
    let pos = (this.pulse - pulsesAhead) / PPC;
    pos = pos - Math.floor(pos);
    return pos;
  };

  Scheduler.PPC = PPC;
  Scheduler.PPB = PPB;

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Scheduler = Scheduler;
})();
