/* LATTICE — voices.js
 * All percussion is synthesized. The house style is DRY and SUBDUED:
 *  - attacks are ramped over 2–8 ms (never instantaneous clicks)
 *  - noise components are band-limited and mixed low
 *  - decays are short; there is no long ring anywhere
 */
(function () {
  "use strict";

  const V = {};

  // Shared noise buffer (2 s of white noise, reused by every stroke).
  let noiseBuf = null;
  function getNoise(ctx) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  // Soft-saturation curve shared by drum voices — rounds peaks, keeps transients polite.
  let satCurve = null;
  function getSat() {
    if (!satCurve) {
      satCurve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 511.5) - 1;
        satCurve[i] = Math.tanh(1.6 * x);
      }
    }
    return satCurve;
  }

  /* ---------- building blocks ---------- */

  // A pitched body: sine/triangle partial with a downward pitch sweep and
  // an amp envelope whose attack is deliberately slowed.
  function body(ctx, out, when, o) {
    const osc = ctx.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f0, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), when + (o.sweep || 0.05));

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(o.peak, when + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, when + (o.decay || 0.2));

    let node = g;
    if (o.sat) {
      const ws = ctx.createWaveShaper();
      ws.curve = getSat();
      osc.connect(ws); ws.connect(g);
    } else {
      osc.connect(g);
    }
    node.connect(out);
    osc.start(when);
    osc.stop(when + (o.decay || 0.2) + 0.05);
  }

  // A band-limited noise puff: the "skin/texture" of a stroke, never a harsh click.
  function puff(ctx, out, when, o) {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    src.playbackRate.value = o.rate || 1;

    const bp = ctx.createBiquadFilter();
    bp.type = o.filter || "bandpass";
    bp.frequency.setValueAtTime(o.freq, when);
    if (o.freqEnd) bp.frequency.exponentialRampToValueAtTime(o.freqEnd, when + (o.decay || 0.08));
    bp.Q.value = o.q || 1;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(o.peak, when + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, when + (o.decay || 0.08));

    src.connect(bp); bp.connect(g); g.connect(out);
    src.start(when, Math.random() * 1.2);
    src.stop(when + (o.decay || 0.08) + 0.05);
  }

  // A pair of slightly inharmonic partials for the metal voice — quickly damped.
  function shimmer(ctx, out, when, o) {
    const ratios = o.ratios || [1, 1.483, 2.21];
    ratios.forEach((r, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(o.f0 * r, when);
      const g = ctx.createGain();
      const p = o.peak / (i + 1.4);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(p, when + (o.attack || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, when + o.decay / (1 + i * 0.35));
      osc.connect(g); g.connect(out);
      osc.start(when);
      osc.stop(when + o.decay + 0.05);
    });
  }

  /* ---------- the six voices ----------
   * Every stroke fn: (ctx, out, when, vel) with vel in 0..1.
   * vel scales level AND brightens/sharpens slightly, like a real hand.
   */

  const STROKES = {

    /* ROOT — the low anchor. Round, warm, almost no noise. */
    "root.open": (ctx, out, when, vel) => {
      body(ctx, out, when, {
        f0: 105 + vel * 18, f1: 54, sweep: 0.06, type: "sine", sat: true,
        peak: 0.55 * vel, attack: 0.006, decay: 0.34 + vel * 0.08
      });
      puff(ctx, out, when, { freq: 260, q: 0.8, peak: 0.05 * vel, attack: 0.005, decay: 0.05 });
    },
    "root.press": (ctx, out, when, vel) => {
      body(ctx, out, when, {
        f0: 92, f1: 58, sweep: 0.03, type: "sine", sat: true,
        peak: 0.4 * vel, attack: 0.004, decay: 0.11
      });
      puff(ctx, out, when, { freq: 200, q: 1, peak: 0.06 * vel, attack: 0.003, decay: 0.04 });
    },

    /* WEAVE — the middle conversation drum. Woodier, a bit of skin noise. */
    "weave.tone": (ctx, out, when, vel) => {
      body(ctx, out, when, {
        f0: 205 + vel * 25, f1: 148, sweep: 0.04, type: "triangle", sat: true,
        peak: 0.4 * vel, attack: 0.004, decay: 0.19
      });
      puff(ctx, out, when, { freq: 900, q: 0.9, peak: 0.045 * vel, attack: 0.003, decay: 0.035 });
    },
    "weave.snap": (ctx, out, when, vel) => {
      body(ctx, out, when, {
        f0: 260, f1: 190, sweep: 0.02, type: "triangle",
        peak: 0.26 * vel, attack: 0.003, decay: 0.09
      });
      // The "slap" is here — but lowpassed and short, so it stays subdued.
      puff(ctx, out, when, {
        freq: 1500, freqEnd: 700, q: 1.4, peak: 0.16 * vel, attack: 0.0025, decay: 0.06
      });
    },
    "weave.touch": (ctx, out, when, vel) => {
      body(ctx, out, when, {
        f0: 190, f1: 150, sweep: 0.02, type: "triangle",
        peak: 0.13 * vel, attack: 0.004, decay: 0.07
      });
    },

    /* SPARK — the high lead drum. Speaks fastest, still soft-edged. */
    "spark.open": (ctx, out, when, vel) => {
      body(ctx, out, when, {
        f0: 330 + vel * 40, f1: 238, sweep: 0.035, type: "triangle", sat: true,
        peak: 0.36 * vel, attack: 0.0035, decay: 0.16
      });
      puff(ctx, out, when, { freq: 1300, q: 1, peak: 0.05 * vel, attack: 0.003, decay: 0.03 });
    },
    "spark.crack": (ctx, out, when, vel) => {
      body(ctx, out, when, {
        f0: 400, f1: 285, sweep: 0.02, type: "triangle",
        peak: 0.22 * vel, attack: 0.0025, decay: 0.08
      });
      puff(ctx, out, when, {
        freq: 2100, freqEnd: 950, q: 1.6, peak: 0.15 * vel, attack: 0.002, decay: 0.05
      });
    },
    "spark.touch": (ctx, out, when, vel) => {
      body(ctx, out, when, {
        f0: 300, f1: 240, sweep: 0.02, type: "triangle",
        peak: 0.11 * vel, attack: 0.0035, decay: 0.06
      });
    },

    /* KEEL — the guide voice. A woody, dry "tick" everyone hangs on. */
    "keel.tick": (ctx, out, when, vel) => {
      body(ctx, out, when, {
        f0: 1150, f1: 820, sweep: 0.012, type: "sine",
        peak: 0.3 * vel, attack: 0.002, decay: 0.055
      });
      puff(ctx, out, when, { freq: 2400, q: 2.5, peak: 0.05 * vel, attack: 0.002, decay: 0.025 });
    },
    "keel.tock": (ctx, out, when, vel) => {
      body(ctx, out, when, {
        f0: 800, f1: 600, sweep: 0.012, type: "sine",
        peak: 0.3 * vel, attack: 0.002, decay: 0.065
      });
      puff(ctx, out, when, { freq: 1700, q: 2.5, peak: 0.05 * vel, attack: 0.002, decay: 0.03 });
    },

    /* GRAIN — the texture voice. Two stroke directions, like a hand moving. */
    "grain.push": (ctx, out, when, vel) => {
      puff(ctx, out, when, {
        freq: 4200, freqEnd: 2600, q: 0.7, filter: "bandpass",
        peak: 0.16 * vel, attack: 0.004, decay: 0.07
      });
    },
    "grain.pull": (ctx, out, when, vel) => {
      puff(ctx, out, when, {
        freq: 3000, freqEnd: 4400, q: 0.7, filter: "bandpass",
        peak: 0.11 * vel, attack: 0.008, decay: 0.09
      });
    },

    /* HALO — sparse metallic color. Inharmonic, damped fast: glow, not clang. */
    "halo.ring": (ctx, out, when, vel) => {
      shimmer(ctx, out, when, {
        f0: 540, ratios: [1, 1.483, 2.21], peak: 0.2 * vel,
        attack: 0.004, decay: 0.5
      });
    },
    "halo.damp": (ctx, out, when, vel) => {
      shimmer(ctx, out, when, {
        f0: 540, ratios: [1, 1.51], peak: 0.16 * vel,
        attack: 0.003, decay: 0.12
      });
    }
  };

  /* ---------- public API ---------- */

  V.play = function (ctx, out, strokeName, when, vel) {
    const fn = STROKES[strokeName];
    if (!fn) return;
    fn(ctx, out, when, Math.max(0.02, Math.min(1, vel)));
  };

  V.strokeNames = Object.keys(STROKES);

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Voices = V;
})();
