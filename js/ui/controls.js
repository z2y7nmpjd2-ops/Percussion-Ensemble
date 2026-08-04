/* LATTICE — controls.js
 * Wires sliders, cues, player strips and the computer keyboard to the
 * ensemble. Pure DOM, no dependencies.
 */
(function () {
  "use strict";

  const KEYMAP = {
    // Caller — the lead hand drum
    q: ["caller", "caller.bass"], w: ["caller", "caller.tone"],
    e: ["caller", "caller.slap"], r: ["caller", "caller.ghost"],
    // Drive — the engine
    a: ["drive", "drive.bass"],  s: ["drive", "drive.tone"],
    d: ["drive", "drive.slap"],  f: ["drive", "drive.ghost"],
    // The family: open / muted / striker, low to high
    z: ["floor", "floor.open"],   x: ["floor", "floor.mute"],   c: ["floor", "floor.bell"],
    v: ["column", "column.open"], b: ["column", "column.mute"], n: ["column", "column.bell"],
    g: ["arch", "arch.open"],     h: ["arch", "arch.mute"],     j: ["arch", "arch.bell"],
    // Spine — the timeline
    t: ["spine", "spine.high"],  y: ["spine", "spine.low"]
  };

  const MACROS = ["heat", "density", "lilt", "spread", "loose"];

  function $(id) { return document.getElementById(id); }

  function Controls(ensemble, mixer, sched) {
    this.ens = ensemble;
    this.mixer = mixer;
    this.sched = sched;
    this.strips = {};
    this.bindMacros();
    this.bindCues();
    this.buildPlayerStrips();
    this.bindKeyboard();
  }

  function slider(id, onChange) {
    const el = $(id), val = $(id + "-val");
    const apply = () => {
      if (val) val.textContent = el.value;
      onChange(parseFloat(el.value));
    };
    el.addEventListener("input", apply);
    apply();
    return el;
  }

  Controls.prototype.bindMacros = function () {
    const ens = this.ens, mixer = this.mixer, sched = this.sched;

    slider("tempo",  v => sched.setBpm(v));
    slider("master", v => mixer.setMaster(v / 100));
    slider("tone",   v => mixer.setTone(v / 100));

    MACROS.forEach(name => slider(name, v => ens.setControl(name, v / 100)));

    // Lift/Simmer move heat internally; reflect it back onto the slider.
    ens.onHeatChange = (h) => {
      const el = $("heat");
      el.value = Math.round(h * 100);
      $("heat-val").textContent = el.value;
    };
  };

  Controls.prototype.bindCues = function () {
    const ens = this.ens;
    const callBtn = $("cue-call");
    callBtn.addEventListener("click", () => {
      ens.cue("call");
      callBtn.classList.add("armed");
    });
    ens.onCallFired = () => callBtn.classList.remove("armed");

    $("cue-break").addEventListener("click", () => ens.cue("break"));
    $("cue-lift").addEventListener("click", () => ens.cue("lift"));
    $("cue-simmer").addEventListener("click", () => ens.cue("simmer"));

    $("take-lead").addEventListener("change", (e) => {
      ens.setManualLead(e.target.checked);
    });
  };

  Controls.prototype.buildPlayerStrips = function () {
    const host = $("players");
    for (const p of this.ens.players) {
      const row = document.createElement("div");
      row.className = "player-strip";
      row.innerHTML =
        '<div class="player-name"><span class="swatch" style="background:' + p.color + '"></span>' +
        p.label + '<small>' + p.desc + '</small></div>' +
        '<button class="mute">Mute</button>' +
        '<div class="mini"><label>Level</label>' +
        '<input type="range" class="lvl" min="0" max="100" value="' + Math.round(p.level * 100) + '"></div>' +
        '<div class="mini"><label>Vary</label>' +
        '<input type="range" class="vry" min="0" max="100" value="' + Math.round(p.vary * 100) + '"></div>';
      host.appendChild(row);

      const muteBtn = row.querySelector(".mute");
      const lvl = row.querySelector(".lvl");
      const vry = row.querySelector(".vry");
      this.strips[p.id] = { muteBtn: muteBtn, lvl: lvl, vry: vry };

      muteBtn.addEventListener("click", () => {
        p.muted = !p.muted;
        this.mixer.setMute(p.id, p.muted);
        muteBtn.classList.toggle("on", p.muted);
      });
      lvl.addEventListener("input", (e) => this.mixer.setLevel(p.id, e.target.value / 100));
      vry.addEventListener("input", (e) => { p.vary = e.target.value / 100; });
    }
  };

  Controls.prototype.bindKeyboard = function () {
    window.addEventListener("keydown", (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const m = KEYMAP[e.key.toLowerCase()];
      if (!m) return;
      this.ens.manual(m[0], m[1], e.shiftKey ? 1.0 : 0.65);
      e.preventDefault();
    });
  };

  /* Pull every control back into line with the engine — used after a
   * saved groove is loaded and brings its own settings with it. */
  Controls.prototype.refresh = function () {
    const set = (id, v) => {
      const el = $(id);
      if (!el) return;
      el.value = Math.round(v);
      const lab = $(id + "-val");
      if (lab) lab.textContent = el.value;
    };
    set("tempo", this.sched.bpm);
    MACROS.forEach(name => set(name, this.ens.ctl[name] * 100));

    for (const p of this.ens.players) {
      const s = this.strips[p.id];
      if (!s) continue;
      s.lvl.value = Math.round(this.mixer.buses[p.id].level * 100);
      s.vry.value = Math.round(p.vary * 100);
      s.muteBtn.classList.toggle("on", p.muted);
    }
  };

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Controls = Controls;
})();
