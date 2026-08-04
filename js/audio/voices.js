/* LATTICE — voices.js
 * Every voice here is a drum. The ensemble is built from two families:
 *
 *   - a family of three tuned stick drums (Floor, Column, Arch), each
 *     carrying a small hand striker, whose parts interlock into one
 *     composite melody;
 *   - two hand drums (Drive, Caller) with a bass / tone / slap / ghost
 *     stroke vocabulary;
 *
 *   plus Spine, a hard dry striker line that the whole circle hangs on.
 *
 * The house style stays DRY and SUBDUED at the attack — every stroke is
 * ramped over 2–6 ms rather than clicked, and noise components are
 * band-limited and mixed low. What drums are allowed that the earlier
 * voices were not is BODY: a real fundamental with a pitch drop into it,
 * inharmonic membrane modes above it, and a resonant shell behind it.
 * Dryness lives in the transient and the absence of any wash, not in
 * starving the low end.
 */
(function () {
  "use strict";

  const V = {};

  // Frequencies the ensemble is tuned to when a groove doesn't say otherwise.
  const DEFAULT_TUNING = {
    floor: 74, column: 99, arch: 148,   // the stick-drum family
    drive: 88, caller: 104              // the hand drums (bass pitch)
  };

  let noiseBuf = null;
  function getNoise(ctx) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  let satCurve = null;
  function getSat() {
    if (!satCurve) {
      satCurve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 511.5) - 1;
        satCurve[i] = Math.tanh(1.7 * x);
      }
    }
    return satCurve;
  }

  /* ---------- building blocks ---------- */

  /* The membrane: a fundamental that falls into pitch, plus inharmonic
   * modes above it that die away faster. This is what gives a struck
   * skin its "boo" rather than a synthesizer's flat sine thud. */
  function membrane(ctx, out, when, o) {
    const modes = o.modes || [1, 1.59, 2.14];
    const decay = o.decay || 0.3;
    for (let i = 0; i < modes.length; i++) {
      const f = o.f0 * modes[i];
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? (o.type || "sine") : "sine";
      osc.frequency.setValueAtTime(f * (o.drop || 1.3), when);
      osc.frequency.exponentialRampToValueAtTime(f, when + (o.dropTime || 0.035));

      const g = ctx.createGain();
      const peak = i === 0 ? o.peak : o.peak * (o.modeLevel || 0.18) / i;
      const d = decay / (1 + i * 1.15);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(peak, when + (o.attack || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, when + d);

      if (i === 0 && o.sat) {
        const ws = ctx.createWaveShaper();
        ws.curve = getSat();
        osc.connect(ws); ws.connect(g);
      } else {
        osc.connect(g);
      }
      g.connect(out);
      osc.start(when);
      osc.stop(when + d + 0.05);
    }
  }

  /* The moment of contact — stick on skin, or the heel and fingers of a
   * hand. Band-limited, brief, and mixed well under the body. */
  function contact(ctx, out, when, o) {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    src.playbackRate.value = o.rate || 1;

    const bp = ctx.createBiquadFilter();
    bp.type = o.filter || "bandpass";
    bp.frequency.setValueAtTime(o.freq, when);
    if (o.freqEnd) bp.frequency.exponentialRampToValueAtTime(o.freqEnd, when + (o.decay || 0.05));
    bp.Q.value = o.q || 1;

    // A second pole keeps slaps from ever turning into a hiss.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = o.ceiling || 5200;
    lp.Q.value = 0.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(o.peak, when + (o.attack || 0.0028));
    g.gain.exponentialRampToValueAtTime(0.0001, when + (o.decay || 0.05));

    src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(out);
    src.start(when, Math.random() * 1.2);
    src.stop(when + (o.decay || 0.05) + 0.05);
  }

  /* The shell behind the skin: a short resonant ring that reads as wood. */
  function shell(ctx, out, when, o) {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = o.freq;
    bp.Q.value = o.q || 7;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(o.peak, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + (o.decay || 0.09));

    src.connect(bp); bp.connect(g); g.connect(out);
    src.start(when, Math.random() * 1.2);
    src.stop(when + (o.decay || 0.09) + 0.05);
  }

  /* A small struck striker mounted on a drum: inharmonic, tight, dry. */
  function striker(ctx, out, when, o) {
    const ratios = o.ratios || [1, 2.76, 5.12];
    for (let i = 0; i < ratios.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(o.f0 * ratios[i], when);
      const g = ctx.createGain();
      const peak = o.peak / (1 + i * 1.5);
      const d = (o.decay || 0.13) / (1 + i * 0.7);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(peak, when + (o.attack || 0.003));
      g.gain.exponentialRampToValueAtTime(0.0001, when + d);
      osc.connect(g); g.connect(out);
      osc.start(when);
      osc.stop(when + d + 0.04);
    }
    contact(ctx, out, when, {
      freq: o.f0 * 4.5, q: 1.4, peak: o.peak * 0.22,
      attack: 0.002, decay: 0.022, ceiling: 7000
    });
  }

  /* ---------- the stick-drum family ----------
   * One recipe, three tunings. The lowest drum rings longest; the
   * highest speaks quickest, so the family's composite line has shape
   * as well as pitch. */

  function familyOpen(ctx, out, when, vel, f0, size) {
    membrane(ctx, out, when, {
      f0: f0, drop: 1.22, dropTime: 0.03 + size * 0.02,
      modes: [1, 1.61, 2.19], modeLevel: 0.14,
      peak: 0.62 * vel, attack: 0.0045, decay: 0.3 + size * 0.34, sat: true
    });
    contact(ctx, out, when, {
      freq: 2300 - size * 700, q: 0.9, peak: 0.07 * vel,
      attack: 0.003, decay: 0.03, ceiling: 5000
    });
    shell(ctx, out, when, {
      freq: 300 + (1 - size) * 340, q: 6, peak: 0.05 * vel, decay: 0.07
    });
  }

  function familyMute(ctx, out, when, vel, f0, size) {
    membrane(ctx, out, when, {
      f0: f0 * 1.06, drop: 1.15, dropTime: 0.015,
      modes: [1, 1.59], modeLevel: 0.2,
      peak: 0.34 * vel, attack: 0.0035, decay: 0.075 + size * 0.03, sat: true
    });
    contact(ctx, out, when, {
      freq: 2600 - size * 600, q: 1.1, peak: 0.09 * vel,
      attack: 0.0025, decay: 0.035, ceiling: 5400
    });
  }

  /* ---------- the hand drums ---------- */

  function handBass(ctx, out, when, vel, f0) {
    membrane(ctx, out, when, {
      f0: f0, drop: 1.42, dropTime: 0.042,
      modes: [1, 1.58, 2.12], modeLevel: 0.12,
      peak: 0.6 * vel, attack: 0.005, decay: 0.42, sat: true
    });
    contact(ctx, out, when, {
      freq: 700, q: 0.7, peak: 0.045 * vel, attack: 0.004, decay: 0.04, ceiling: 3000
    });
  }

  function handTone(ctx, out, when, vel, f0) {
    membrane(ctx, out, when, {
      f0: f0 * 2.4, drop: 1.2, dropTime: 0.022,
      modes: [1, 1.6, 2.2], modeLevel: 0.22,
      peak: 0.36 * vel, attack: 0.0035, decay: 0.17
    });
    contact(ctx, out, when, {
      freq: 1500, q: 0.9, peak: 0.06 * vel, attack: 0.003, decay: 0.032, ceiling: 4800
    });
    shell(ctx, out, when, { freq: 520, q: 6, peak: 0.03 * vel, decay: 0.055 });
  }

  /* The slap: the ensemble's brightest sound, and the one most at risk
   * of turning into a click. Its noise is swept downward, double-poled
   * and kept short; a pitched knock underneath gives it a body to sit on. */
  function handSlap(ctx, out, when, vel, f0) {
    membrane(ctx, out, when, {
      f0: f0 * 3.5, drop: 1.3, dropTime: 0.014,
      modes: [1, 1.72], modeLevel: 0.3,
      peak: 0.2 * vel, attack: 0.0028, decay: 0.075
    });
    contact(ctx, out, when, {
      freq: 3000, freqEnd: 1250, q: 1.25, peak: 0.19 * vel,
      attack: 0.0025, decay: 0.06, ceiling: 5600
    });
    shell(ctx, out, when, { freq: 780, q: 5, peak: 0.035 * vel, decay: 0.04 });
  }

  function handGhost(ctx, out, when, vel, f0) {
    membrane(ctx, out, when, {
      f0: f0 * 2.3, drop: 1.1, dropTime: 0.012,
      modes: [1], peak: 0.1 * vel, attack: 0.004, decay: 0.055
    });
    contact(ctx, out, when, {
      freq: 1900, q: 1.2, peak: 0.035 * vel, attack: 0.003, decay: 0.025, ceiling: 4600
    });
  }

  /* ---------- the stroke table ---------- */

  const STROKES = {

    /* SPINE — the timeline. Hard, dry, and pitched just enough to carry
     * two voices; the shortest sound in the ensemble. */
    "spine.high": (ctx, out, when, vel) => {
      membrane(ctx, out, when, {
        f0: 1240, drop: 1.18, dropTime: 0.008, modes: [1, 2.9], modeLevel: 0.25,
        peak: 0.26 * vel, attack: 0.0022, decay: 0.05, type: "triangle"
      });
      contact(ctx, out, when, {
        freq: 3100, q: 2.2, peak: 0.06 * vel, attack: 0.002, decay: 0.022, ceiling: 6500
      });
    },
    "spine.low": (ctx, out, when, vel) => {
      membrane(ctx, out, when, {
        f0: 880, drop: 1.18, dropTime: 0.009, modes: [1, 2.9], modeLevel: 0.25,
        peak: 0.26 * vel, attack: 0.0024, decay: 0.06, type: "triangle"
      });
      contact(ctx, out, when, {
        freq: 2200, q: 2.2, peak: 0.055 * vel, attack: 0.002, decay: 0.026, ceiling: 6000
      });
    },

    /* FLOOR / COLUMN / ARCH — the tuned family. size 1 = lowest. */
    "floor.open":  (c, o, w, v, T) => familyOpen(c, o, w, v, T.floor, 1),
    "floor.mute":  (c, o, w, v, T) => familyMute(c, o, w, v, T.floor, 1),
    "floor.bell":  (c, o, w, v, T) => striker(c, o, w, {
      f0: 620, ratios: [1, 2.74, 5.1], peak: 0.17 * v, decay: 0.16 }),

    "column.open": (c, o, w, v, T) => familyOpen(c, o, w, v, T.column, 0.55),
    "column.mute": (c, o, w, v, T) => familyMute(c, o, w, v, T.column, 0.55),
    "column.bell": (c, o, w, v, T) => striker(c, o, w, {
      f0: 790, ratios: [1, 2.8, 5.3], peak: 0.16 * v, decay: 0.13 }),

    "arch.open":   (c, o, w, v, T) => familyOpen(c, o, w, v, T.arch, 0.15),
    "arch.mute":   (c, o, w, v, T) => familyMute(c, o, w, v, T.arch, 0.15),
    "arch.bell":   (c, o, w, v, T) => striker(c, o, w, {
      f0: 1010, ratios: [1, 2.86, 5.5], peak: 0.15 * v, decay: 0.1 }),

    /* DRIVE — the accompaniment hand drum, the ensemble's engine. */
    "drive.bass":  (c, o, w, v, T) => handBass(c, o, w, v, T.drive),
    "drive.tone":  (c, o, w, v, T) => handTone(c, o, w, v, T.drive),
    "drive.slap":  (c, o, w, v, T) => handSlap(c, o, w, v, T.drive),
    "drive.ghost": (c, o, w, v, T) => handGhost(c, o, w, v, T.drive),

    /* CALLER — the lead hand drum. Smaller, so it speaks faster. */
    "caller.bass":  (c, o, w, v, T) => handBass(c, o, w, v * 0.95, T.caller),
    "caller.tone":  (c, o, w, v, T) => handTone(c, o, w, v, T.caller),
    "caller.slap":  (c, o, w, v, T) => handSlap(c, o, w, v, T.caller),
    "caller.ghost": (c, o, w, v, T) => handGhost(c, o, w, v, T.caller)
  };

  /* ---------- public API ---------- */

  V.play = function (ctx, out, strokeName, when, vel, tuning) {
    const fn = STROKES[strokeName];
    if (!fn) return;
    const T = tuning || DEFAULT_TUNING;
    fn(ctx, out, when, Math.max(0.02, Math.min(1, vel)),
       {
         floor:  T.floor  || DEFAULT_TUNING.floor,
         column: T.column || DEFAULT_TUNING.column,
         arch:   T.arch   || DEFAULT_TUNING.arch,
         drive:  T.drive  || DEFAULT_TUNING.drive,
         caller: T.caller || DEFAULT_TUNING.caller
       });
  };

  V.strokeNames = Object.keys(STROKES);
  V.DEFAULT_TUNING = DEFAULT_TUNING;

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Voices = V;
})();
