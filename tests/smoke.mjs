/* =====================================================================
 * smoke.mjs — headless boot/render check for app.js
 * ---------------------------------------------------------------------
 * app.js is the UI layer and normally needs a browser. This hand-rolled
 * minimal DOM shim is just enough to (a) load the module without throwing
 * and (b) render every screen + enter a lesson — catching render-time
 * reference/template errors that the unit tests (which only exercise
 * store.js logic) can't. Run with:  node tests/smoke.mjs
 * Exits non-zero on any failure, so it's CI-usable.
 * ===================================================================== */
let mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; }, clear: () => { mem = {}; }
};
if (!globalThis.structuredClone) globalThis.structuredClone = (o) => JSON.parse(JSON.stringify(o));

const NOOP = () => {};
function node() {
  return new Proxy({ _store: {} }, {
    get(t, p) {
      if (p === "classList") return { add: NOOP, remove: NOOP, toggle: NOOP, contains: () => false };
      if (p === "dataset") return {};
      if (p === "style") return {};
      if (p === "content" || p === "firstElementChild") return node();
      if (p === "querySelector") return () => node();
      if (p === "querySelectorAll") return () => [];
      if (["appendChild", "addEventListener", "removeAttribute", "setAttribute", "focus", "click", "remove", "insertBefore"].includes(p)) return NOOP;
      if (p === "offsetWidth") return 0;
      if (p in t._store) return t._store[p];
      return undefined;
    },
    set(t, p, v) { t._store[p] = v; return true; }
  });
}

let clickHandler = null;
const app = {
  _html: "",
  set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
  addEventListener(type, fn) { if (type === "click") clickHandler = fn; },
  appendChild: NOOP,
  querySelector(sel) { return sel === "[data-cooldown-until]" ? null : node(); },
  querySelectorAll() { return []; }
};

globalThis.document = {
  getElementById: (id) => (id === "app" ? app : node()),
  createElement: () => node(),
};
globalThis.window = { scrollTo: NOOP, addEventListener: NOOP };
globalThis.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
globalThis.setInterval = () => 0; globalThis.clearInterval = NOOP;
globalThis.confirm = () => true;

// Import app.js — this runs render() (home) at module load.
await import("../assets/js/app.js");
console.log("✓ module load + renderHome ok; html length:", app.innerHTML.length);

// Navigate to each screen via the captured click handler.
for (const route of ["dashboard", "history", "rewards", "profile", "home"]) {
  const ev = { target: { closest: (sel) => (sel === "[data-route]" ? { dataset: { route }, disabled: false } : null) } };
  clickHandler(ev);
  if (!app.innerHTML || app.innerHTML.length < 50) throw new Error(`route ${route} produced little/no html`);
  console.log(`✓ render ${route} ok (${app.innerHTML.length} chars)`);
}

// Enter the first lesson node — exercises startPart → runPart → shell + first step.
const lessonEv = { target: { closest: (sel) => (sel === "[data-part]" ? { dataset: { part: "u1l1p1" }, disabled: false } : null) } };
clickHandler(lessonEv);
if (!/lesson-shell/.test(app.innerHTML)) throw new Error("startPart did not render a lesson shell");
console.log("✓ startPart(u1l1p1) rendered a lesson shell");
console.log("ALL SMOKE CHECKS PASSED");
