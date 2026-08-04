/* LATTICE — grooves.js
 * The groove library: roll a new weave, grow one from a seed, and keep
 * the ones worth keeping. A saved groove stores the whole pattern set
 * plus the settings it was played with, so it comes back exactly as it
 * left — even if the generator itself changes later.
 */
(function () {
  "use strict";

  const L = window.LATTICE;
  const KEY = "lattice.grooves.v1";
  const MAX = 40;

  function $(id) { return document.getElementById(id); }

  function GrooveUI(ens, mixer, sched, controls) {
    this.ens = ens;
    this.mixer = mixer;
    this.sched = sched;
    this.controls = controls;
    this.memory = null;          // fallback when storage is unavailable
    this.currentId = null;       // which saved groove is loaded, if any

    this.items = this.read();
    this.bind();

    ens.onGrooveChange = (set) => this.showCurrent(set);
    this.showCurrent(ens.pat);
    this.renderList();
  }

  /* ---------- storage ---------- */

  GrooveUI.prototype.read = function () {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data.items) ? data.items : [];
    } catch (e) {
      this.memory = this.memory || [];
      return this.memory;
    }
  };

  GrooveUI.prototype.write = function () {
    this.memory = this.items;
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, items: this.items }));
      this.note("");
      return true;
    } catch (e) {
      this.note("Saved for this session only — browser storage is unavailable here.");
      return false;
    }
  };

  GrooveUI.prototype.note = function (msg) {
    const el = $("saved-note");
    if (el) el.textContent = msg;
  };

  /* ---------- current groove display ---------- */

  GrooveUI.prototype.showCurrent = function (set) {
    $("groove-name").textContent = set.name || "Untitled";
    const chips = $("groove-chips");
    chips.textContent = "";
    const m = set.meta || {};
    const add = (text, cls) => {
      const s = document.createElement("span");
      s.className = "chip" + (cls ? " " + cls : "");
      s.textContent = text;
      chips.appendChild(s);
    };
    add(set.seed || "—", "seed");
    if (m.meter) add(m.meter);
    if (m.beats) add(m.beats + "-beat cycle");
    if (m.key) add("timeline " + m.key);
    if (m.archetype) add(m.archetype);
    if (m.feel) add(m.feel + " feel");
    if (m.tuning) add("tuned in " + m.tuning);
    if (m.contour) add("line: " + m.contour);
    if (m.bells) add("strikers: " + m.bells);
    if (m.engine) add("engine: " + m.engine);
    this.markCurrentRow();
  };

  /* ---------- actions ---------- */

  GrooveUI.prototype.bind = function () {
    $("btn-regen").addEventListener("click", () => {
      this.currentId = null;
      this.ens.regenerate(L.Generator.newSeed());
      this.flashPending();
    });

    $("btn-house").addEventListener("click", () => {
      this.currentId = null;
      this.ens.setPatternSet(L.Patterns.houseSet());
      this.flashPending();
    });

    const grow = () => {
      const el = $("seed-input");
      const seed = el.value.trim();
      if (!seed) { el.focus(); return; }
      this.currentId = null;
      this.ens.regenerate(seed);
      this.flashPending();
    };
    $("btn-seed").addEventListener("click", grow);
    $("seed-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); grow(); }
    });

    $("btn-save").addEventListener("click", () => this.saveCurrent());
  };

  // While playing, a new groove lands on the next cycle line. Say so.
  GrooveUI.prototype.flashPending = function () {
    if (!this.sched.running) return;
    const name = $("groove-name");
    name.textContent = "…coming in on the next cycle";
  };

  GrooveUI.prototype.snapshot = function () {
    // If a fresh groove is queued for the next cycle, that's the one being saved.
    const set = this.ens.pendingPat || this.ens.pat;
    return {
      id: "g" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      name: set.name || "Untitled",
      seed: set.seed || "—",
      savedAt: new Date().toISOString(),
      tempo: this.sched.bpm,
      tone: parseFloat($("tone").value),
      ctl: Object.assign({}, this.ens.ctl),
      players: this.ens.players.map(p => ({
        id: p.id,
        level: this.mixer.buses[p.id].level,
        vary: p.vary,
        muted: !!p.muted
      })),
      meta: set.meta || {},
      set: set
    };
  };

  GrooveUI.prototype.saveCurrent = function () {
    const item = this.snapshot();
    this.items.unshift(item);
    if (this.items.length > MAX) this.items.length = MAX;
    this.currentId = item.id;
    this.write();
    this.renderList();
  };

  GrooveUI.prototype.apply = function (item) {
    // The groove itself
    this.ens.setPatternSet(item.set);
    this.currentId = item.id;

    // …and the settings it was played with
    if (item.ctl) {
      for (const k in item.ctl) this.ens.setControl(k, item.ctl[k]);
    }
    if (item.tempo) this.sched.setBpm(item.tempo);
    if (typeof item.tone === "number") {
      $("tone").value = item.tone;
      $("tone-val").textContent = Math.round(item.tone);
      this.mixer.setTone(item.tone / 100);
    }
    if (item.players) {
      for (const ps of item.players) {
        const p = this.ens.playerById(ps.id);
        if (!p) continue;
        p.vary = ps.vary;
        p.muted = ps.muted;
        this.mixer.setLevel(ps.id, ps.level);
        this.mixer.setMute(ps.id, ps.muted);
      }
    }
    this.controls.refresh();
    if (this.sched.running) this.flashPending();
    else this.showCurrent(item.set);
    this.markCurrentRow();
  };

  GrooveUI.prototype.remove = function (id) {
    this.items = this.items.filter(x => x.id !== id);
    if (this.currentId === id) this.currentId = null;
    this.write();
    this.renderList();
  };

  /* ---------- the saved list ---------- */

  GrooveUI.prototype.renderList = function () {
    const host = $("saved-list");
    host.textContent = "";

    if (!this.items.length) {
      const p = document.createElement("p");
      p.className = "saved-empty";
      p.textContent = "Nothing saved yet. Roll a groove you like, then press Save this groove.";
      host.appendChild(p);
      return;
    }

    for (const item of this.items) {
      const row = document.createElement("div");
      row.className = "saved-row";
      row.dataset.id = item.id;

      const name = document.createElement("input");
      name.type = "text";
      name.className = "rename";
      name.value = item.name;
      name.setAttribute("aria-label", "Groove name");
      name.addEventListener("change", () => {
        item.name = name.value.trim() || "Untitled";
        item.set.name = item.name;
        this.write();
        if (this.currentId === item.id) this.showCurrent(item.set);
      });

      const meta = document.createElement("div");
      meta.className = "saved-meta";
      const m = item.meta || {};
      const seed = document.createElement("code");
      seed.textContent = item.seed;
      meta.appendChild(seed);
      const rest = [m.meter || null,
                    m.beats ? m.beats + " beats" : null,
                    m.key ? "timeline " + m.key : null,
                    m.tuning ? "tuned in " + m.tuning : null,
                    item.tempo ? item.tempo + " bpm" : null]
                   .filter(Boolean).join("  ·  ");
      meta.appendChild(document.createTextNode(rest ? "  ·  " + rest : ""));

      const loadBtn = document.createElement("button");
      loadBtn.textContent = "Load";
      loadBtn.addEventListener("click", () => this.apply(item));

      const delBtn = document.createElement("button");
      delBtn.className = "del";
      delBtn.textContent = "Delete";
      delBtn.setAttribute("aria-label", "Delete " + item.name);
      delBtn.addEventListener("click", () => this.remove(item.id));

      row.appendChild(name);
      row.appendChild(meta);
      row.appendChild(loadBtn);
      row.appendChild(delBtn);
      host.appendChild(row);
    }
    this.markCurrentRow();
  };

  GrooveUI.prototype.markCurrentRow = function () {
    const rows = document.querySelectorAll(".saved-row");
    for (const r of rows) r.classList.toggle("current", r.dataset.id === this.currentId);
  };

  window.LATTICE = window.LATTICE || {};
  window.LATTICE.GrooveUI = GrooveUI;
})();
