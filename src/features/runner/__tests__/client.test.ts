import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RunRequest, RunResponse } from "../protocol";
import { runSuite } from "../harness";

const request = { code: "module.exports = { value: 1 };", testsSource: 'test("value", () => assert.strictEqual(mod.value, 1));', target: "visible" as const, perTestTimeoutMs: 1500 };

class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = [];
  sent: RunRequest[] = [];
  terminate = vi.fn();
  constructor() { super(); FakeWorker.instances.push(this); }
  postMessage(message: RunRequest) { this.sent.push(message); }
  async complete(index = 0) {
    const req = this.sent[index];
    const data: RunResponse = { kind: "result", requestId: req.requestId, result: await runSuite(req) };
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

beforeEach(() => { vi.resetModules(); FakeWorker.instances = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("runTests", () => {
  it("falls back to the same harness in SSR/Node", async () => {
    vi.stubGlobal("Worker", undefined);
    const { runTests } = await import("../client");
    const actual = await runTests(request);
    const expected = await runSuite(request);
    expect({ ...actual, runId: "", durationMs: 0, results: actual.results.map((r) => ({ ...r, durationMs: 0 })) })
      .toEqual({ ...expected, runId: "", durationMs: 0, results: expected.results.map((r) => ({ ...r, durationMs: 0 })) });
  });

  it("serialises two fallback calls", async () => {
    vi.stubGlobal("Worker", undefined);
    const { runTests } = await import("../client");
    const order: string[] = [];
    vi.stubGlobal("runnerOrder", order);
    const code = 'globalThis.runnerOrder.push("start"); module.exports = {};';
    const testsSource = 'test("wait", async () => { await new Promise(r => setTimeout(r, 10)); globalThis.runnerOrder.push("end"); });';
    await Promise.all([runTests({ ...request, code, testsSource }), runTests({ ...request, code, testsSource })]);
    expect(order).toEqual(["start", "end", "start", "end"]);
  });

  it("reuses one worker, queues requests, and ignores unrelated messages", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const { runTests } = await import("../client");
    const first = runTests(request);
    const second = runTests(request);
    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1));
    const worker = FakeWorker.instances[0];
    expect(worker.sent).toHaveLength(1);
    worker.dispatchEvent(new MessageEvent("message", { data: { kind: "result", requestId: "other" } }));
    expect(worker.sent).toHaveLength(1);
    await worker.complete();
    expect((await first).passed).toBe(1);
    await vi.waitFor(() => expect(worker.sent).toHaveLength(2));
    await worker.complete(1);
    expect((await second).passed).toBe(1);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(worker.terminate).not.toHaveBeenCalled();
  });

  it("terminates a hung worker at five seconds and recreates it for the next run", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", FakeWorker);
    const { runTests } = await import("../client");
    const first = runTests({ ...request, code: "while(true){}" });
    await vi.advanceTimersByTimeAsync(5000);
    expect(await first).toMatchObject({ timedOut: true, total: 0, runtimeError: "Tests did not finish in 5 s (possible infinite loop)" });
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    const second = runTests(request);
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeWorker.instances).toHaveLength(2);
    await FakeWorker.instances[1].complete();
    expect((await second).passed).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["error", "messageerror"])("handles worker %s and lets the queue recover", async (type) => {
    vi.stubGlobal("Worker", FakeWorker);
    const { runTests } = await import("../client");
    const first = runTests(request);
    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1));
    FakeWorker.instances[0].dispatchEvent(new Event(type, { cancelable: true }));
    expect((await first).runtimeError).toBeTruthy();
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    const second = runTests(request);
    await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(2));
    await FakeWorker.instances[1].complete();
    expect((await second).passed).toBe(1);
  });
});
