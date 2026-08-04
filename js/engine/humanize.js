/* LATTICE — humanize.js
 * Everything that separates a machine grid from a circle of players:
 *  - LILT: a shared, systematic lean of certain grid positions
 *  - SPREAD: each player's personal placement (ahead / behind the beat)
 *  - LOOSE: gaussian jitter + slow drift + velocity life
 * All offsets are returned in SECONDS relative to the exact grid time.
 */
(function () {
  "use strict";

  const H = {};

  // Box–Muller gaussian, mean 0, sigma 1.
  H.gauss = function () {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  /* LILT — the grid itself breathes.
   * Cycle = 48 pulses, beat = 12 pulses. Within each beat, the four
   * 16th positions (0,3,6,9) get a lean profile: the 2nd and 4th 16ths
   * arrive late, the 3rd slightly early — a rolling, non-even feel that
   * morphs continuously with the lilt control. Off-grid pulses (sextuplet
   * positions) inherit an interpolated lean, so dense fills ride the
   * same wave instead of snapping straight.
   */
  const LEAN_16 = [0.0, 0.42, -0.08, 0.3]; // per 16th within a beat, in fractions of max lean
  H.lilt = function (pulseInCycle, liltAmt, pulseDur) {
    const inBeat = pulseInCycle % 12;          // 0..11
    const pos = inBeat / 3;                    // 0..4 (fractional for off-16th pulses)
    const i = Math.floor(pos) % 4;
    const j = (i + 1) % 4;
    const frac = pos - Math.floor(pos);
    const lean = LEAN_16[i] * (1 - frac) + LEAN_16[j] * frac;
    // max lean at full lilt: ~40% of a pulse
    return lean * liltAmt * pulseDur * 0.4;
  };

  /* SPREAD — a persistent personality per player.
   * lean:  ms, negative = pushes ahead, positive = lays back
   * driftRate/driftAmt: a slow sinusoidal wander of that lean
   * jitter: per-stroke sigma in ms (scaled again by the Loose control)
   */
  H.profiles = {
    keel:  { lean: -1.5, driftRate: 0.011, driftAmt: 1.0, jitter: 1.2 },
    root:  { lean:  4.5, driftRate: 0.007, driftAmt: 2.0, jitter: 2.2 },
    weave: { lean:  1.5, driftRate: 0.013, driftAmt: 1.6, jitter: 2.6 },
    spark: { lean: -3.0, driftRate: 0.017, driftAmt: 2.2, jitter: 2.8 },
    grain: { lean:  2.5, driftRate: 0.009, driftAmt: 1.4, jitter: 3.2 },
    halo:  { lean:  6.0, driftRate: 0.005, driftAmt: 2.4, jitter: 3.5 }
  };

  // Full offset for one stroke of one player.
  H.offset = function (playerId, pulseInCycle, absTime, ctl, pulseDur) {
    const p = H.profiles[playerId] || H.profiles.weave;
    let off = H.lilt(pulseInCycle, ctl.lilt, pulseDur);
    off += (p.lean / 1000) * ctl.spread * 2;                 // personal lean
    off += (p.driftAmt / 1000) * ctl.spread *
           Math.sin(absTime * p.driftRate * 2 * Math.PI);    // slow wander
    off += (p.jitter / 1000) * (0.25 + ctl.loose * 1.5) * H.gauss(); // per-stroke jitter
    return off;
  };

  /* Velocity life: accent stays the message, but no two strokes match.
   * Downbeats are kept steadier than weak positions (players guard the one).
   */
  H.velocity = function (accent, pulseInCycle, ctl) {
    const onBeat = (pulseInCycle % 12) === 0;
    const sigma = (onBeat ? 0.05 : 0.1) * (0.4 + ctl.loose);
    let v = accent * (1 + sigma * H.gauss());
    // heat opens the dynamic ceiling a little
    v *= 0.82 + ctl.heat * 0.22;
    return Math.max(0.05, Math.min(1, v));
  };

  /* Stochastic articulation: sometimes swap a stroke for its quieter
   * neighbour, sometimes drop a weak-position stroke entirely. The
   * probabilities are tiny — the point is that the fabric frays at the
   * edges, never at the anchors.
   */
  H.articulate = function (ev, pulseInCycle, ctl) {
    const weak = (pulseInCycle % 6) !== 0;
    if (weak && !ev.anchor) {
      if (Math.random() < 0.015 + ctl.loose * 0.03) return null; // breath
      if (ev.soft && Math.random() < 0.05 + ctl.loose * 0.1) {
        return { stroke: ev.soft, accent: ev.accent * 0.6 };
      }
    }
    return { stroke: ev.stroke, accent: ev.accent };
  };

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Humanize = H;
})();
