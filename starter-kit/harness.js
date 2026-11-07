// harness.js — environment-agnostic test harness for HireEscape.
// Runs in a browser Web Worker AND in Node/Vitest. No DOM, no Node APIs.
// Candidate code: CommonJS-style file that assigns module.exports.
// Test source: plain JS using test(), assert.*, fakes.*, and mod (the candidate's module.exports).

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

// ---------- assert (subset of node:assert, so models write tests they already know) ----------
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}
const show = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };
class AssertionError extends Error { constructor(m) { super(m); this.name = "AssertionError"; } }
function matches(err, expected) {
  if (!expected) return true;
  if (expected instanceof RegExp) return expected.test(err && err.message ? err.message : String(err));
  if (typeof expected === "function") return err instanceof expected;
  return true;
}
export function createAssert() {
  const fail = (msg, fallback) => { throw new AssertionError(msg || fallback); };
  return {
    ok: (v, msg) => { if (!v) fail(msg, `Expected truthy value, got ${show(v)}`); },
    equal: (a, b, msg) => { if (a != b) fail(msg, `Expected ${show(a)} == ${show(b)}`); },
    strictEqual: (a, b, msg) => { if (!Object.is(a, b)) fail(msg, `Expected ${show(a)} === ${show(b)}`); },
    notStrictEqual: (a, b, msg) => { if (Object.is(a, b)) fail(msg, `Expected values to differ: ${show(a)}`); },
    deepStrictEqual: (a, b, msg) => { if (!deepEqual(a, b)) fail(msg, `Expected ${show(a)} to deep-equal ${show(b)}`); },
    throws: (fn, expected, msg) => {
      try { fn(); } catch (e) { if (!matches(e, expected)) fail(msg, `Threw unexpected error: ${e && e.message}`); return; }
      fail(msg, "Expected function to throw");
    },
    rejects: async (fnOrPromise, expected, msg) => {
      try { await (typeof fnOrPromise === "function" ? fnOrPromise() : fnOrPromise); }
      catch (e) { if (!matches(e, expected)) fail(msg, `Rejected with unexpected error: ${e && e.message}`); return; }
      fail(msg, "Expected promise to reject");
    },
    doesNotReject: async (fnOrPromise, msg) => {
      try { await (typeof fnOrPromise === "function" ? fnOrPromise() : fnOrPromise); }
      catch (e) { fail(msg, `Expected no rejection, got: ${e && e.message}`); }
    },
  };
}

// ---------- fakes (shared stubs so every generated test uses the same vocabulary) ----------
export function createFakes() {
  const memoryCache = () => {
    const store = new Map();
    return {
      store,
      get: async (k) => store.get(k),
      set: async (k, v) => { store.set(k, v); },
      del: async (k) => { store.delete(k); },
    };
  };
  const failingCache = ({ failGet = false, failSet = false, error = "ETIMEDOUT cache" } = {}) => {
    const inner = memoryCache();
    return {
      store: inner.store,
      get: async (k) => { if (failGet) throw new Error(error); return inner.get(k); },
      set: async (k, v) => { if (failSet) throw new Error(error); return inner.set(k, v); },
      del: inner.del,
    };
  };
  const silentLogger = () => ({ info() {}, warn() {}, error() {}, debug() {} });
  const spyLogger = () => {
    const calls = { info: [], warn: [], error: [], debug: [] };
    const make = (lvl) => (...args) => { calls[lvl].push(args); };
    return { calls, info: make("info"), warn: make("warn"), error: make("error"), debug: make("debug") };
  };
  return { memoryCache, failingCache, silentLogger, spyLogger };
}

// ---------- module loading ----------
export function loadModule(code) {
  const module = { exports: {} };
  const noRequire = () => { throw new Error("require() is not available in this sandbox"); };
  const fn = new Function("module", "exports", "require", `"use strict";\n${code}\n;return module.exports;`);
  return fn(module, module.exports, noRequire);
}

function withTimeout(promise, ms) {
  let id;
  const timer = new Promise((_, rej) => { id = setTimeout(() => rej(new Error(`Test timed out after ${ms}ms`)), ms); });
  return Promise.race([promise, timer]).finally(() => clearTimeout(id));
}

// ---------- runSuite ----------
export async function runSuite({ code, testsSource, target = "hidden", perTestTimeoutMs = 1500 }) {
  const started = now();
  const result = {
    runId: `run_${Math.random().toString(36).slice(2, 10)}`,
    target, total: 0, passed: 0, failed: 0, results: [], timedOut: false, durationMs: 0,
  };
  let mod = {};
  let loadError = null;
  try { mod = loadModule(code); } catch (e) { loadError = e; }

  const tests = [];
  const assert = createAssert();
  const fakes = createFakes();
  try {
    new Function("test", "assert", "fakes", "mod", `"use strict";\n${testsSource}`)(
      (name, fn) => tests.push({ name, fn }), assert, fakes, mod,
    );
  } catch (e) {
    result.runtimeError = `Test file failed to load: ${e.message}`;
    result.durationMs = Math.round(now() - started);
    return result;
  }

  result.total = tests.length;
  if (loadError) {
    result.runtimeError = `Your code failed to load: ${loadError.message}`;
    result.failed = tests.length;
    result.results = tests.map((t) => ({ name: t.name, status: "error", message: result.runtimeError, durationMs: 0 }));
    result.durationMs = Math.round(now() - started);
    return result;
  }

  for (const t of tests) {
    const s = now();
    try {
      await withTimeout(Promise.resolve().then(() => t.fn()), perTestTimeoutMs);
      result.passed++;
      result.results.push({ name: t.name, status: "pass", durationMs: Math.round(now() - s) });
    } catch (e) {
      result.failed++;
      const isAssertion = e && e.name === "AssertionError";
      if (e && /timed out/.test(e.message)) result.timedOut = true;
      result.results.push({
        name: t.name, status: isAssertion ? "fail" : "error",
        message: String((e && e.message) || e).slice(0, 300), durationMs: Math.round(now() - s),
      });
    }
  }
  result.durationMs = Math.round(now() - started);
  return result;
}
