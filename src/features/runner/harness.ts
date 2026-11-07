import type { RunResult } from "@/lib/contracts";

type ErrorMatcher = RegExp | (new (...args: never[]) => Error);
type AsyncOperation = (() => unknown) | PromiseLike<unknown>;
const errorMessage = (error: unknown): string =>
  typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : String(error);
const errorName = (error: unknown): unknown =>
  typeof error === "object" && error !== null && "name" in error ? error.name : undefined;

// harness.js — environment-agnostic test harness for HireEscape.
// Runs in a browser Web Worker AND in Node/Vitest. No DOM, no Node APIs.
// Candidate code: CommonJS-style file that assigns module.exports.
// Test source: plain JS using test(), assert.*, fakes.*, and mod (the candidate's module.exports).

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

// ---------- assert (subset of node:assert, so models write tests they already know) ----------
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
const show = (v: unknown) => { try { return JSON.stringify(v); } catch { return String(v); } };
class AssertionError extends Error { constructor(m: string) { super(m); this.name = "AssertionError"; } }
function matches(err: unknown, expected?: ErrorMatcher) {
  if (!expected) return true;
  if (expected instanceof RegExp) return expected.test(errorMessage(err));
  if (typeof expected === "function") return err instanceof expected;
  return true;
}
export function createAssert() {
  const fail = (msg: string | undefined, fallback: string) => { throw new AssertionError(msg || fallback); };
  return {
    ok: (v: unknown, msg?: string) => { if (!v) fail(msg, `Expected truthy value, got ${show(v)}`); },
    equal: (a: unknown, b: unknown, msg?: string) => { if (a != b) fail(msg, `Expected ${show(a)} == ${show(b)}`); },
    strictEqual: (a: unknown, b: unknown, msg?: string) => { if (!Object.is(a, b)) fail(msg, `Expected ${show(a)} === ${show(b)}`); },
    notStrictEqual: (a: unknown, b: unknown, msg?: string) => { if (Object.is(a, b)) fail(msg, `Expected values to differ: ${show(a)}`); },
    deepStrictEqual: (a: unknown, b: unknown, msg?: string) => { if (!deepEqual(a, b)) fail(msg, `Expected ${show(a)} to deep-equal ${show(b)}`); },
    throws: (fn: () => unknown, expected?: ErrorMatcher, msg?: string) => {
      try { fn(); } catch (e) { if (!matches(e, expected)) fail(msg, `Threw unexpected error: ${errorMessage(e)}`); return; }
      fail(msg, "Expected function to throw");
    },
    rejects: async (fnOrPromise: AsyncOperation, expected?: ErrorMatcher, msg?: string) => {
      try { await (typeof fnOrPromise === "function" ? fnOrPromise() : fnOrPromise); }
      catch (e) { if (!matches(e, expected)) fail(msg, `Rejected with unexpected error: ${errorMessage(e)}`); return; }
      fail(msg, "Expected promise to reject");
    },
    doesNotReject: async (fnOrPromise: AsyncOperation, msg?: string) => {
      try { await (typeof fnOrPromise === "function" ? fnOrPromise() : fnOrPromise); }
      catch (e) { fail(msg, `Expected no rejection, got: ${errorMessage(e)}`); }
    },
  };
}

// ---------- fakes (shared stubs so every generated test uses the same vocabulary) ----------
export function createFakes() {
  const memoryCache = () => {
    const store = new Map<unknown, unknown>();
    return {
      store,
      get: async (k: unknown) => store.get(k),
      set: async (k: unknown, v: unknown) => { store.set(k, v); },
      del: async (k: unknown) => { store.delete(k); },
    };
  };
  const failingCache = ({ failGet = false, failSet = false, error = "ETIMEDOUT cache" }: { failGet?: boolean; failSet?: boolean; error?: string } = {}) => {
    const inner = memoryCache();
    return {
      store: inner.store,
      get: async (k: unknown) => { if (failGet) throw new Error(error); return inner.get(k); },
      set: async (k: unknown, v: unknown) => { if (failSet) throw new Error(error); return inner.set(k, v); },
      del: inner.del,
    };
  };
  const silentLogger = () => ({ info() {}, warn() {}, error() {}, debug() {} });
  const spyLogger = () => {
    const calls: Record<"info" | "warn" | "error" | "debug", unknown[][]> = { info: [], warn: [], error: [], debug: [] };
    const make = (lvl: keyof typeof calls) => (...args: unknown[]) => { calls[lvl].push(args); };
    return { calls, info: make("info"), warn: make("warn"), error: make("error"), debug: make("debug") };
  };
  return { memoryCache, failingCache, silentLogger, spyLogger };
}

// ---------- module loading ----------
export function loadModule(code: string): Record<string, unknown> {
  const module = { exports: {} };
  const noRequire = () => { throw new Error("require() is not available in this sandbox"); };
  const fn = new Function("module", "exports", "require", `"use strict";\n${code}\n;return module.exports;`);
  return fn(module, module.exports, noRequire) as Record<string, unknown>;
}

function withTimeout(promise: Promise<unknown>, ms: number) {
  let id: ReturnType<typeof setTimeout>;
  const timer = new Promise((_, rej) => { id = setTimeout(() => rej(new Error(`Test timed out after ${ms}ms`)), ms); });
  return Promise.race([promise, timer]).finally(() => clearTimeout(id));
}

// ---------- runSuite ----------
export async function runSuite({ code, testsSource, target = "hidden", perTestTimeoutMs = 1500 }: {
  code: string; testsSource: string; target?: "visible" | "hidden"; perTestTimeoutMs?: number;
}): Promise<RunResult> {
  const started = now();
  const result: RunResult = {
    runId: `run_${Math.random().toString(36).slice(2, 10)}`,
    target, total: 0, passed: 0, failed: 0, results: [], timedOut: false, durationMs: 0,
  };
  let mod = {};
  let loadError: unknown;
  let failedToLoad = false;
  try { mod = loadModule(code); } catch (e) { loadError = e; failedToLoad = true; }

  const tests: { name: string; fn: () => unknown }[] = [];
  const assert = createAssert();
  const fakes = createFakes();
  try {
    new Function("test", "assert", "fakes", "mod", `"use strict";\n${testsSource}`)(
      (name: string, fn: () => unknown) => tests.push({ name, fn }), assert, fakes, mod,
    );
  } catch (e) {
    result.runtimeError = `Test file failed to load: ${errorMessage(e)}`;
    result.durationMs = Math.round(now() - started);
    return result;
  }

  result.total = tests.length;
  if (failedToLoad) {
    result.runtimeError = `Your code failed to load: ${errorMessage(loadError)}`;
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
      const isAssertion = errorName(e) === "AssertionError";
      if (/timed out/.test(errorMessage(e))) result.timedOut = true;
      result.results.push({
        name: t.name, status: isAssertion ? "fail" : "error",
        message: errorMessage(e).slice(0, 300), durationMs: Math.round(now() - s),
      });
    }
  }
  result.durationMs = Math.round(now() - started);
  return result;
}
