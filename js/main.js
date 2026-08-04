/* LATTICE — main.js
 * Bootstraps audio on the first user gesture (browsers require it),
 * builds the ensemble, and runs the transport.
 */
(function () {
  "use strict";

  const L = window.LATTICE;
  let ctx = null, mixer = null, sched = null, ens = null, visual = null, controls = null;

  function boot() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    mixer = new L.Mixer(ctx);
    sched = new L.Scheduler(ctx);
    ens = new L.Ensemble(ctx, mixer, sched);
    visual = new L.Visual(document.getElementById("ring"), ens, sched, ctx);
    controls = new L.Controls(ens, mixer, sched);
    visual.start();

    // Console access for power users: conduct or reshape the ensemble live,
    // e.g. LATTICE.app.ens.cue("call") or LATTICE.app.ens.setControl("heat", 0.9)
    L.app = { ctx, mixer, sched, ens, visual, controls };

    // cycle counter readout
    const num = document.getElementById("cycle-num");
    setInterval(() => {
      num.textContent = sched.running ? ("cycle " + (sched.cycle + 1)) : "–";
    }, 250);
  }

  window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-power");
    btn.addEventListener("click", () => {
      if (!ctx) boot();
      if (ctx.state === "suspended") ctx.resume();
      if (sched.running) {
        sched.stop();
        btn.textContent = "Start";
        btn.classList.remove("running");
      } else {
        sched.start();
        btn.textContent = "Stop";
        btn.classList.add("running");
      }
    });
  });
})();
