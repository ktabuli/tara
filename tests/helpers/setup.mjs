/* Test setup — provides the browser globals the app modules expect when
 * they're imported under Node. Imported first by every test file. */
let mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
  clear: () => { mem = {}; }
};
globalThis.window = globalThis.window || {};
if (!globalThis.structuredClone) globalThis.structuredClone = (o) => JSON.parse(JSON.stringify(o));
