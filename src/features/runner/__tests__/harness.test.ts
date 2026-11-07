import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createAssert, createFakes, loadModule, runSuite } from "../harness";

describe("assert helpers", () => {
  const assert = createAssert();
  it("checks truthiness, loose equality, identity, and deep equality", () => {
    assert.ok(1);
    assert.equal(1, "1");
    assert.strictEqual(NaN, NaN);
    assert.notStrictEqual({}, {});
    assert.deepStrictEqual({ a: [1, { b: true }], c: null }, { c: null, a: [1, { b: true }] });
    const failures = [
      () => assert.ok(false), () => assert.equal(1, 2),
      () => assert.strictEqual(1, "1"), () => assert.notStrictEqual(1, 1),
      () => assert.deepStrictEqual([1, 2], [2, 1]),
      () => assert.deepStrictEqual([], {}),
      () => assert.deepStrictEqual({ a: undefined }, {}),
      () => assert.deepStrictEqual(null, {}),
    ];
    for (const failure of failures) expect(failure).toThrowError(expect.objectContaining({ name: "AssertionError" }));
    expect(() => assert.ok(false, "custom")).toThrow("custom");
  });

  it("matches thrown errors by regexp or class", () => {
    const throws = () => { throw new TypeError("broken"); };
    assert.throws(throws, /broken/);
    assert.throws(throws, TypeError);
    assert.throws(throws);
    expect(() => assert.throws(() => {})).toThrow("Expected function to throw");
    expect(() => assert.throws(throws, RangeError)).toThrow("unexpected error");
    expect(() => assert.throws(throws, /different/)).toThrow("unexpected error");
  });

  it("matches rejections by regexp or class and accepts promises", async () => {
    const rejects = async () => { throw new TypeError("broken"); };
    await assert.rejects(rejects, /broken/);
    await assert.rejects(rejects(), TypeError);
    await assert.rejects(rejects);
    await expect(assert.rejects(Promise.resolve())).rejects.toThrow("Expected promise to reject");
    await expect(assert.rejects(rejects, RangeError)).rejects.toThrow("unexpected error");
    await expect(assert.rejects(rejects, /different/)).rejects.toThrow("unexpected error");
    await assert.doesNotReject(Promise.resolve());
    await assert.doesNotReject(async () => 1);
    await expect(assert.doesNotReject(rejects)).rejects.toThrow("Expected no rejection");
  });
});

describe("fakes and module loader", () => {
  it("supports cache CRUD and configurable get/set failures", async () => {
    const { memoryCache, failingCache } = createFakes();
    for (const cache of [memoryCache(), failingCache()]) {
      await cache.set("key", { value: 1 });
      expect(await cache.get("key")).toEqual({ value: 1 });
      await cache.del("key");
      expect(await cache.get("key")).toBeUndefined();
    }
    await expect(failingCache({ failGet: true }).get("key")).rejects.toThrow("ETIMEDOUT cache");
    await expect(failingCache({ failSet: true, error: "offline" }).set("key", 1)).rejects.toThrow("offline");
    await failingCache({ failGet: true }).set("key", 1);
    expect(await failingCache({ failSet: true }).get("key")).toBeUndefined();
  });

  it("records all logger arguments separately by level", () => {
    const { spyLogger, silentLogger } = createFakes();
    const logger = spyLogger();
    for (const level of ["warn", "error", "info", "debug"] as const) {
      logger[level]("message", { context: 1 });
      expect(logger.calls[level]).toEqual([["message", { context: 1 }]]);
      expect(silentLogger()[level]()).toBeUndefined();
    }
  });

  it("loads CommonJS exports and blocks require", () => {
    expect(loadModule("exports.value = 1;")).toEqual({ value: 1 });
    expect(loadModule("module.exports = { value: 2 };")).toEqual({ value: 2 });
    expect(() => loadModule('require("fs");')).toThrow("require() is not available in this sandbox");
  });
});

describe("runSuite", () => {
  const testsSource = 'test("one", () => assert.ok(true)); test("two", () => assert.ok(true));';

  it.each(["function {", 'require("fs")'])("reports candidate load errors for every registered test: %s", async (code) => {
    const result = await runSuite({ code, testsSource, target: "visible" });
    expect(result).toMatchObject({ total: 2, failed: 2, passed: 0, target: "visible" });
    expect(result.runtimeError).toContain("Your code failed to load:");
    expect(result.results.every((test) => test.status === "error" && test.message === result.runtimeError)).toBe(true);
    expect(result.runId).toMatch(/^run_[a-z0-9]{8}$/);
  });

  it("reports test file load errors", async () => {
    const result = await runSuite({ code: "", testsSource: "test(", target: "hidden" });
    expect(result.runtimeError).toContain("Test file failed to load:");
    expect(result.total).toBe(0);
  });

  it("distinguishes assertion failures and runtime errors and truncates messages", async () => {
    const result = await runSuite({ code: "", target: "hidden", testsSource: `
      test("pass", () => assert.ok(true));
      test("fail", () => assert.ok(false, "x".repeat(400)));
      test("error", () => { throw new TypeError("broken"); });
    ` });
    expect(result).toMatchObject({ total: 3, passed: 1, failed: 2, timedOut: false });
    expect(result.results.map((test) => test.status)).toEqual(["pass", "fail", "error"]);
    expect(result.results[1].message).toHaveLength(300);
  });

  it("times out a never-resolving test and continues the suite", async () => {
    const result = await runSuite({ code: "", target: "hidden", perTestTimeoutMs: 300,
      testsSource: 'test("hang", () => new Promise(() => {})); test("next", () => assert.ok(true));' });
    expect(result).toMatchObject({ timedOut: true, passed: 1, failed: 1 });
    expect(result.results[0]).toMatchObject({ status: "error", message: "Test timed out after 300ms" });
  });

  it("validates all eight seeded challenges using the ported harness", async () => {
    const directory = new URL("../../../../starter-kit/seeded/", import.meta.url);
    const files = (await readdir(directory)).filter((file) => file.endsWith(".js"));
    expect(files).toHaveLength(8);
    for (const file of files) {
      // Seed fixtures are read as data; candidate-facing code never imports secrets.
      const source = await readFile(new URL(file, directory), "utf8");
      const fixture = loadModule(source.replace(/export const /g, "const ") + "\nmodule.exports = { challenge, secret };") as {
        challenge: { starterCode: string; visibleTests: string; hiddenTests: string };
        secret: { referenceFix: string };
      };
      const { challenge: c, secret } = fixture;
      for (const code of [c.starterCode, secret.referenceFix]) {
        const visible = await runSuite({ code, testsSource: c.visibleTests, target: "visible" });
        expect(visible.runtimeError, file).toBeUndefined();
        expect(visible.failed, file).toBe(0);
        expect(visible.total, file).toBeGreaterThan(0);
      }
      const broken = await runSuite({ code: c.starterCode, testsSource: c.hiddenTests, target: "hidden" });
      const fixed = await runSuite({ code: secret.referenceFix, testsSource: c.hiddenTests, target: "hidden" });
      expect(broken.runtimeError, file).toBeUndefined();
      expect(broken.failed, file).toBeGreaterThan(0);
      expect(fixed.runtimeError, file).toBeUndefined();
      expect(fixed.failed, file).toBe(0);
      expect(fixed.total, file).toBeGreaterThan(0);
    }
  });
});
