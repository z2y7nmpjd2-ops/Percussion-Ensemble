/* LATTICE — mixer.js
 * One bus per player (gain + stereo position), a shared master chain:
 *   players → tiny synthetic "room glue" (very low, keeps everything dry)
 *           → tone lowpass → gentle compressor → master gain → speakers
 */
(function () {
  "use strict";

  function Mixer(ctx) {
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.8;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 20;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.006;
    this.comp.release.value = 0.18;

    this.tone = ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = 9000;
    this.tone.Q.value = 0.4;

    this.sum = ctx.createGain();

    // Tiny 60 ms decaying-noise impulse: enough to seat the ensemble in
    // one space, small enough that the sound stays close and dry.
    this.room = ctx.createConvolver();
    this.room.buffer = this._impulse(0.06, 3.5);
    this.roomSend = ctx.createGain();
    this.roomSend.gain.value = 0.12;

    this.sum.connect(this.tone);
    this.sum.connect(this.roomSend);
    this.roomSend.connect(this.room);
    this.room.connect(this.tone);
    this.tone.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(ctx.destination);

    this.buses = {};
  }

  Mixer.prototype._impulse = function (seconds, decay) {
    const len = Math.max(64, Math.floor(this.ctx.sampleRate * seconds));
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  };

  // pan −1..1: where the player "sits" on the imaginary stage.
  Mixer.prototype.addBus = function (name, pan, level) {
    const g = this.ctx.createGain();
    g.gain.value = level;
    const p = this.ctx.createStereoPanner
      ? this.ctx.createStereoPanner()
      : this.ctx.createGain();
    if (p.pan) p.pan.value = pan;
    g.connect(p);
    p.connect(this.sum);
    this.buses[name] = { gain: g, pan: p, level: level, muted: false };
    return g;
  };

  Mixer.prototype.setLevel = function (name, level) {
    const b = this.buses[name];
    if (!b) return;
    b.level = level;
    if (!b.muted) b.gain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.02);
  };

  Mixer.prototype.setMute = function (name, muted) {
    const b = this.buses[name];
    if (!b) return;
    b.muted = muted;
    b.gain.gain.setTargetAtTime(muted ? 0 : b.level, this.ctx.currentTime, 0.02);
  };

  Mixer.prototype.setMaster = function (v) {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  };

  // 0..1 → 2 kHz (dark) … 12 kHz (open)
  Mixer.prototype.setTone = function (v) {
    const f = 2000 * Math.pow(6, v);
    this.tone.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
  };

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Mixer = Mixer;
})();
