/* LATTICE — main.js
 * Builds the whole instrument at load so the groove panel and the ring
 * are live before a note sounds. The audio context starts suspended;
 * the first press of Start resumes it, as browsers require.
 */
(function () {
  "use strict";

  const L = window.LATTICE;
  let ctx = null, mixer = null, sched = null, ens = null, visual = null,
      controls = null, grooves = null;

  function boot() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    mixer = new L.Mixer(ctx);
    sched = new L.Scheduler(ctx);
    ens = new L.Ensemble(ctx, mixer, sched);
    visual = new L.Visual(document.getElementById("ring"), ens, sched, ctx);
    controls = new L.Controls(ens, mixer, sched);
    grooves = new L.GrooveUI(ens, mixer, sched, controls);
    visual.start();

    // Console access for power users: conduct or reshape the ensemble live,
    // e.g. LATTICE.app.ens.cue("call") or LATTICE.app.ens.regenerate("tide")
    L.app = { ctx, mixer, sched, ens, visual, controls, grooves };

    const num = document.getElementById("cycle-num");
    setInterval(() => {
      num.textContent = sched.running ? ("cycle " + (sched.cycle + 1)) : "–";
    }, 250);

    const btn = document.getElementById("btn-power");
    btn.addEventListener("click", () => {
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
  }

  window.addEventListener("DOMContentLoaded", boot);
})();
