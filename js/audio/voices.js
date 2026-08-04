/* LATTICE — voices.js
 * Every voice here is a drum, and every drum is MUTED and ATONAL.
 *
 * Atonal: nothing in the circle states a pitch. Each stroke is a burst of
 * noise shaped by a bank of bandpass resonators whose centres sit at
 * inharmonic ratios (1 : 1.62 : 2.51 …) and whose Q is kept low enough
 * that no partial ever narrows into a note. There is not one oscillator
 * in the instrument: where weight is needed it comes from noise driven
 * through a resonant lowpass whose cutoff falls fast, which has heft and
 * a sense of "low" but no frequency to name. The drums differ from each
 * other by REGISTER, not by interval:
 * the family ascends in spectral centre, which is what lets its composite
 * line still read as a contour, but no two of them form a tuned interval.
 *
 * Muted: everything is damped. The longest sound in the circle decays in
 * well under 100 ms and most are far shorter; there is no ring anywhere.
 *
 * Attacks stay dry and subdued — ramped over 2–6 ms, never clicked.
 */
(function () {
  "use strict";

  const V = {};

  // Spectral centres the circle sits at when a groove doesn't say otherwise.
  // These are registers, not tunings: the ratios between them are
  // deliberately not simple, and the spectra are too broad to imply one.
  const DEFAULT_REGISTER = {
    floor: 84, column: 132, arch: 205,   // the family, low to high
    drive: 98, caller: 152               // the hand drums
  };

  // Inharmonic partial ratios — no integer or simple-fraction relationships.
  const INHARM = [1, 1.62, 2.51, 3.77];

  /* Broad, low-Q noise resonators put out far less peak amplitude than
   * the narrow ones (or the oscillators) they replaced, so the whole
   * instrument is trimmed back up here rather than in twenty places. */
  const TRIM = 2.7;

  let noiseBuf = null;
  function getNoise(ctx) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  /* ---------- building blocks ---------- */

  /* A struck body: one noise burst through a bank of inharmonic
   * resonators, each with its own decay. Higher bands die first, the way
   * a damped head behaves. Q stays modest — high Q would ring a partial
   * into a pitch, which is exactly what we are avoiding. */
  function resonant(ctx, out, when, o) {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    src.playbackRate.value = o.rate || 1;

    // Every stroke sits somewhere slightly different. A drum that landed
    // on the same frequency twice would start to sound like a note.
    const spread = (o.jitter === undefined ? 0.11 : o.jitter);
    const shift = 1 + (Math.random() * 2 - 1) * spread;

    let longest = 0;
    for (let i = 0; i < o.bands.length; i++) {
      const b = o.bands[i];
      const f = o.base * b.r * shift * (1 + (Math.random() * 2 - 1) * 0.04);
      if (f > 15000) continue;

      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = b.q;

      const g = ctx.createGain();
      const d = o.decay * (b.dec || 1);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(o.peak * b.lvl * TRIM, when + (o.attack || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, when + d);
      if (d > longest) longest = d;

      src.connect(bp); bp.connect(g); g.connect(out);
    }
    src.start(when, Math.random() * 1.2);
    src.stop(when + longest + 0.05);
  }

  /* Weight without pitch. An oscillator — even a sweeping one — is
   * locally periodic and the ear reads that as a note, so the low end is
   * noise driven through a resonant lowpass whose cutoff falls fast. The
   * result has heft and a sense of "low" but no frequency to name. */
  function body(ctx, out, when, o) {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);

    const shift = 1 + (Math.random() * 2 - 1) * 0.11;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(o.from * shift, when);
    lp.frequency.exponentialRampToValueAtTime(o.to * shift, when + (o.sweep || 0.05));
    lp.Q.value = o.q || 0.7;   // at or below Butterworth: no resonant peak

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 32;              // keep subsonic rumble out
    hp.Q.value = 0.6;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(o.peak * TRIM, when + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, when + o.decay);

    src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(out);
    src.start(when, Math.random() * 1.2);
    src.stop(when + o.decay + 0.04);
  }

  /* The moment of contact — stick or hand landing. Band-limited and
   * double-poled so nothing here can turn into a hiss or a click. */
  function contact(ctx, out, when, o) {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(o.freq, when);
    if (o.freqEnd) bp.frequency.exponentialRampToValueAtTime(o.freqEnd, when + o.decay);
    bp.Q.value = o.q || 1;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = o.ceiling || 5200;
    lp.Q.value = 0.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(o.peak * TRIM, when + (o.attack || 0.0028));
    g.gain.exponentialRampToValueAtTime(0.0001, when + o.decay);

    src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(out);
    src.start(when, Math.random() * 1.2);
    src.stop(when + o.decay + 0.04);
  }

  /* ---------- the family: three registers of one damped drum ---------- */

  const OPEN_BANDS = [
    { r: INHARM[0], q: 1.0, lvl: 1.0,  dec: 1.0 },
    { r: INHARM[1], q: 1.5, lvl: 0.5,  dec: 0.62 },
    { r: INHARM[2], q: 1.5, lvl: 0.26, dec: 0.4 },
    { r: INHARM[3], q: 1.4, lvl: 0.12, dec: 0.26 }
  ];
  const MUTE_BANDS = [
    { r: INHARM[0], q: 1.7, lvl: 1.0,  dec: 1.0 },
    { r: INHARM[1], q: 1.6, lvl: 0.55, dec: 0.7 },
    { r: INHARM[2], q: 1.5, lvl: 0.3,  dec: 0.5 }
  ];

  // size 1 = lowest of the family, 0 = highest
  function familyOpen(ctx, out, when, vel, base, size) {
    resonant(ctx, out, when, {
      base: base, bands: OPEN_BANDS, jitter: 0.1 + size * 0.07,
      peak: 0.76 * vel, attack: 0.0045, decay: 0.07 + size * 0.03
    });
    if (size > 0.4) {
      body(ctx, out, when, {
        from: base * 4.2, to: base * 1.35, sweep: 0.045, q: 0.7,
        peak: 0.62 * vel * size, attack: 0.005, decay: 0.05 + size * 0.02
      });
    }
    contact(ctx, out, when, {
      freq: 2300 - size * 700, q: 0.9, peak: 0.07 * vel,
      attack: 0.003, decay: 0.028, ceiling: 5000
    });
  }

  function familyMute(ctx, out, when, vel, base, size) {
    resonant(ctx, out, when, {
      base: base * 1.09, bands: MUTE_BANDS,
      peak: 0.44 * vel, attack: 0.0035, decay: 0.032 + size * 0.014
    });
    contact(ctx, out, when, {
      freq: 2600 - size * 600, q: 1.1, peak: 0.09 * vel,
      attack: 0.0025, decay: 0.03, ceiling: 5400
    });
  }

  // The striker: a dry clank, inharmonic and short. No bell tone.
  function strikerHit(ctx, out, when, vel, base) {
    resonant(ctx, out, when, {
      base: base,
      bands: [
        { r: 1,    q: 3.0, lvl: 1.0,  dec: 1.0 },
        { r: 1.74, q: 2.7, lvl: 0.62, dec: 0.72 },
        { r: 2.83, q: 2.4, lvl: 0.4,  dec: 0.5 },
        { r: 4.11, q: 2.1, lvl: 0.2,  dec: 0.34 }
      ],
      peak: 0.3 * vel, attack: 0.003, decay: 0.05
    });
    contact(ctx, out, when, {
      freq: base * 3.6, q: 1.6, peak: 0.05 * vel,
      attack: 0.002, decay: 0.02, ceiling: 7000
    });
  }

  /* ---------- the hand drums ---------- */

  function handBass(ctx, out, when, vel, base) {
    resonant(ctx, out, when, {
      base: base * 0.86, bands: OPEN_BANDS,
      peak: 0.7 * vel, attack: 0.005, decay: 0.07
    });
    body(ctx, out, when, {
      from: base * 4.4, to: base * 1.3, sweep: 0.05, q: 0.7,
      peak: 0.78 * vel, attack: 0.005, decay: 0.062
    });
    contact(ctx, out, when, {
      freq: 700, q: 0.7, peak: 0.045 * vel, attack: 0.004, decay: 0.035, ceiling: 3000
    });
  }

  function handTone(ctx, out, when, vel, base) {
    resonant(ctx, out, when, {
      base: base * 2.1,
      bands: [
        { r: 1,    q: 1.7, lvl: 1.0,  dec: 1.0 },
        { r: 1.62, q: 1.55, lvl: 0.52, dec: 0.66 },
        { r: 2.51, q: 1.4, lvl: 0.28, dec: 0.44 }
      ],
      peak: 0.42 * vel, attack: 0.0035, decay: 0.062
    });
    contact(ctx, out, when, {
      freq: 1500, q: 0.9, peak: 0.06 * vel, attack: 0.003, decay: 0.028, ceiling: 4800
    });
  }

  /* The slap: the brightest sound in the circle and the one most at risk
   * of becoming a click. Its noise is swept downward, double-poled, and
   * kept short; a broad low resonance underneath gives it something to
   * sit on without giving it a note. */
  function handSlap(ctx, out, when, vel, base) {
    resonant(ctx, out, when, {
      base: base * 3.2,
      bands: [
        { r: 1,    q: 2.6, lvl: 1.0,  dec: 1.0 },
        { r: 1.62, q: 2.2, lvl: 0.6,  dec: 0.7 },
        { r: 2.51, q: 1.8, lvl: 0.34, dec: 0.48 }
      ],
      peak: 0.26 * vel, attack: 0.0028, decay: 0.04
    });
    contact(ctx, out, when, {
      freq: 3000, freqEnd: 1250, q: 1.25, peak: 0.19 * vel,
      attack: 0.0025, decay: 0.045, ceiling: 5600
    });
    resonant(ctx, out, when, {
      base: base * 0.95, bands: [{ r: 1, q: 1.1, lvl: 1, dec: 1 }],
      peak: 0.1 * vel, attack: 0.004, decay: 0.035
    });
  }

  function handGhost(ctx, out, when, vel, base) {
    resonant(ctx, out, when, {
      base: base * 2.0,
      bands: [
        { r: 1,    q: 1.55, lvl: 1.0, dec: 1.0 },
        { r: 1.62, q: 1.4, lvl: 0.5, dec: 0.6 }
      ],
      peak: 0.14 * vel, attack: 0.004, decay: 0.028
    });
    contact(ctx, out, when, {
      freq: 1900, q: 1.2, peak: 0.035 * vel, attack: 0.003, decay: 0.02, ceiling: 4600
    });
  }

  /* ---------- the stroke table ---------- */

  const STROKES = {

    /* SPINE — the timeline. Two registers of the same dry knock, the
     * shortest sound in the circle. */
    "spine.high": (ctx, out, when, vel) => {
      resonant(ctx, out, when, {
        base: 1180,
        bands: [
          { r: 1,    q: 2.0, lvl: 1.0,  dec: 1.0 },
          { r: 1.62, q: 1.7, lvl: 0.5,  dec: 0.6 },
          { r: 2.51, q: 1.5, lvl: 0.22, dec: 0.4 }
        ],
        peak: 0.34 * vel, attack: 0.0034, decay: 0.03
      });
      contact(ctx, out, when, {
        freq: 3100, q: 2.2, peak: 0.055 * vel, attack: 0.0032, decay: 0.018, ceiling: 6500
      });
    },
    "spine.low": (ctx, out, when, vel) => {
      resonant(ctx, out, when, {
        base: 830,
        bands: [
          { r: 1,    q: 2.0, lvl: 1.0,  dec: 1.0 },
          { r: 1.62, q: 1.7, lvl: 0.5,  dec: 0.6 },
          { r: 2.51, q: 1.5, lvl: 0.22, dec: 0.4 }
        ],
        peak: 0.34 * vel, attack: 0.0036, decay: 0.036
      });
      contact(ctx, out, when, {
        freq: 2200, q: 2.2, peak: 0.05 * vel, attack: 0.0034, decay: 0.02, ceiling: 6000
      });
    },

    /* FLOOR / COLUMN / ARCH — one damped drum in three registers. */
    "floor.open":  (c, o, w, v, R) => familyOpen(c, o, w, v, R.floor, 1),
    "floor.mute":  (c, o, w, v, R) => familyMute(c, o, w, v, R.floor, 1),
    "floor.bell":  (c, o, w, v, R) => strikerHit(c, o, w, v, 560),

    "column.open": (c, o, w, v, R) => familyOpen(c, o, w, v, R.column, 0.55),
    "column.mute": (c, o, w, v, R) => familyMute(c, o, w, v, R.column, 0.55),
    "column.bell": (c, o, w, v, R) => strikerHit(c, o, w, v, 730),

    "arch.open":   (c, o, w, v, R) => familyOpen(c, o, w, v, R.arch, 0.15),
    "arch.mute":   (c, o, w, v, R) => familyMute(c, o, w, v, R.arch, 0.15),
    "arch.bell":   (c, o, w, v, R) => strikerHit(c, o, w, v, 950),

    /* DRIVE — the accompaniment hand drum, the circle's engine. */
    "drive.bass":  (c, o, w, v, R) => handBass(c, o, w, v, R.drive),
    "drive.tone":  (c, o, w, v, R) => handTone(c, o, w, v, R.drive),
    "drive.slap":  (c, o, w, v, R) => handSlap(c, o, w, v, R.drive),
    "drive.ghost": (c, o, w, v, R) => handGhost(c, o, w, v, R.drive),

    /* CALLER — the lead hand drum. Smaller, so it speaks faster. */
    "caller.bass":  (c, o, w, v, R) => handBass(c, o, w, v * 0.95, R.caller),
    "caller.tone":  (c, o, w, v, R) => handTone(c, o, w, v, R.caller),
    "caller.slap":  (c, o, w, v, R) => handSlap(c, o, w, v, R.caller),
    "caller.ghost": (c, o, w, v, R) => handGhost(c, o, w, v, R.caller)
  };

  /* ---------- public API ---------- */

  V.play = function (ctx, out, strokeName, when, vel, register) {
    const fn = STROKES[strokeName];
    if (!fn) return;
    const R = register || DEFAULT_REGISTER;
    fn(ctx, out, when, Math.max(0.02, Math.min(1, vel)),
       {
         floor:  R.floor  || DEFAULT_REGISTER.floor,
         column: R.column || DEFAULT_REGISTER.column,
         arch:   R.arch   || DEFAULT_REGISTER.arch,
         drive:  R.drive  || DEFAULT_REGISTER.drive,
         caller: R.caller || DEFAULT_REGISTER.caller
       });
  };

  V.strokeNames = Object.keys(STROKES);
  V.DEFAULT_REGISTER = DEFAULT_REGISTER;

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Voices = V;
})();
