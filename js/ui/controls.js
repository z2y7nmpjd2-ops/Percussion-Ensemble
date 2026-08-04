/* LATTICE — controls.js
 * Wires sliders, cues, player strips and the computer keyboard to the
 * ensemble. Pure DOM, no dependencies.
 */
(function () {
  "use strict";

  const KEYMAP = {
    q: ["spark", "spark.open"], w: ["spark", "spark.crack"], e: ["spark", "spark.touch"],
    a: ["weave", "weave.tone"], s: ["weave", "weave.snap"], d: ["weave", "weave.touch"],
    z: ["root", "root.open"],  x: ["root", "root.press"],
    t: ["keel", "keel.tick"],  y: ["keel", "keel.tock"],
    g: ["grain", "grain.push"], h: ["grain", "grain.pull"],
    b: ["halo", "halo.ring"],  n: ["halo", "halo.damp"]
  };

  function Controls(ensemble, mixer, sched) {
    this.ens = ensemble;
    this.mixer = mixer;
    this.sched = sched;
    this.bindMacros();
    this.bindCues();
    this.buildPlayerStrips();
    this.bindKeyboard();
  }

  function $(id) { return document.getElementById(id); }

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

    this.heatEl = slider("heat", v => ens.setControl("heat", v / 100));
    slider("density", v => ens.setControl("density", v / 100));
    slider("lilt",    v => ens.setControl("lilt", v / 100));
    slider("spread",  v => ens.setControl("spread", v / 100));
    slider("loose",   v => ens.setControl("loose", v / 100));

    // Lift/Simmer move heat internally; reflect it back onto the slider.
    ens.onHeatChange = (h) => {
      this.heatEl.value = Math.round(h * 100);
      $("heat-val").textContent = this.heatEl.value;
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
      muteBtn.addEventListener("click", () => {
        p.muted = !p.muted;
        this.mixer.setMute(p.id, p.muted);
        muteBtn.classList.toggle("on", p.muted);
      });
      row.querySelector(".lvl").addEventListener("input", (e) => {
        this.mixer.setLevel(p.id, e.target.value / 100);
      });
      row.querySelector(".vry").addEventListener("input", (e) => {
        p.vary = e.target.value / 100;
      });
    }
  };

  Controls.prototype.bindKeyboard = function () {
    const down = new Set();
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const m = KEYMAP[e.key.toLowerCase()];
      if (!m) return;
      down.add(e.key.toLowerCase());
      const accent = e.shiftKey ? 1.0 : 0.65;
      this.ens.manual(m[0], m[1], accent);
      e.preventDefault();
    });
    window.addEventListener("keyup", (e) => down.delete(e.key.toLowerCase()));
  };

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.Controls = Controls;
})();
