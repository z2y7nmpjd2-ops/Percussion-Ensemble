/* LATTICE — humanize.js
 * Everything that separates a machine grid from a circle of players:
 *  - LILT: a shared, systematic lean of the subdivisions inside a beat
 *  - SPREAD: each player's personal placement (ahead / behind the beat)
 *  - LOOSE: gaussian jitter + slow drift + velocity life
 * All offsets are returned in SECONDS relative to the exact grid time.
 */
(function () {
  "use strict";

  const H = {};
  const PPB = 12;                 // pulses per beat

  // Box–Muller gaussian, mean 0, sigma 1.
  H.gauss = function () {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  /* LILT — the grid itself breathes.
   * A groove's feel carries a lean value per subdivision within the beat:
   * four values for a binary groove (subdivision every 3 pulses), three
   * for a ternary one (every 4). Pulses that fall between subdivisions
   * — the fast fills — inherit an interpolated lean, so dense passages
   * ride the same wave instead of snapping back to straight time.
   */
  const DEFAULT_LEAN = [0, 0.42, -0.08, 0.3];

  H.lilt = function (pulseInCycle, liltAmt, pulseDur, feel) {
    const lean = (feel && feel.lean) || DEFAULT_LEAN;
    const slots = lean.length;
    const step = PPB / slots;                  // 3 for binary, 4 for ternary
    const pos = (pulseInCycle % PPB) / step;   // 0..slots, fractional off-subdivision
    const i = Math.floor(pos) % slots;
    const j = (i + 1) % slots;
    const frac = pos - Math.floor(pos);
    const v = lean[i] * (1 - frac) + lean[j] * frac;
    // at full lilt, the largest lean is ~40% of a pulse
    return v * liltAmt * pulseDur * 0.4;
  };

  /* SPREAD — a persistent personality per player.
   * lean:  ms, negative = pushes ahead, positive = lays back
   * driftRate/driftAmt: a slow sinusoidal wander of that lean
   * jitter: per-stroke sigma in ms (scaled again by the Loose control)
   *
   * The timeline is the tightest thing in the circle; the low drum sits
   * furthest back; the lead leans forward into its phrases.
   */
  H.profiles = {
    spine:  { lean: -1.2, driftRate: 0.011, driftAmt: 0.8, jitter: 1.1 },
    floor:  { lean:  5.0, driftRate: 0.006, driftAmt: 2.2, jitter: 2.3 },
    column: { lean:  3.0, driftRate: 0.009, driftAmt: 1.8, jitter: 2.4 },
    arch:   { lean:  1.2, driftRate: 0.012, driftAmt: 1.5, jitter: 2.6 },
    drive:  { lean:  0.8, driftRate: 0.008, driftAmt: 1.2, jitter: 2.0 },
    caller: { lean: -3.2, driftRate: 0.017, driftAmt: 2.4, jitter: 2.9 }
  };

  // Full offset for one stroke of one player.
  H.offset = function (playerId, pulseInCycle, absTime, ctl, pulseDur, feel) {
    const p = H.profiles[playerId] || H.profiles.drive;
    // A groove may nudge a player's personal lean, so the same figures
    // sit differently against each other from one groove to the next.
    const ov = feel && feel.profiles && feel.profiles[playerId];
    const lean = (ov && typeof ov.lean === "number") ? ov.lean : p.lean;

    let off = H.lilt(pulseInCycle, ctl.lilt, pulseDur, feel);
    off += (lean / 1000) * ctl.spread * 2;                    // personal lean
    off += (p.driftAmt / 1000) * ctl.spread *
           Math.sin(absTime * p.driftRate * 2 * Math.PI);     // slow wander
    off += (p.jitter / 1000) * (0.25 + ctl.loose * 1.5) * H.gauss();
    return off;
  };

  /* Velocity life: accent stays the message, but no two strokes match.
   * Downbeats are kept steadier than weak positions (players guard the one).
   */
  H.velocity = function (accent, pulseInCycle, ctl) {
    const onBeat = (pulseInCycle % PPB) === 0;
    const sigma = (onBeat ? 0.05 : 0.1) * (0.4 + ctl.loose);
    let v = accent * (1 + sigma * H.gauss());
    v *= 0.82 + ctl.heat * 0.22;
    return Math.max(0.05, Math.min(1, v));
  };

  /* Stochastic articulation: sometimes swap a stroke for its quieter
   * neighbour, sometimes drop a weak-position stroke entirely. The
   * probabilities are tiny — the point is that the fabric frays at the
   * edges, never at the anchors.
   */
  H.articulate = function (ev, pulseInCycle, ctl, step) {
    const sub = step || 3;
    const weak = (pulseInCycle % (sub * 2)) !== 0;
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
