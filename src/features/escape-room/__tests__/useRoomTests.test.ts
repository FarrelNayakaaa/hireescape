// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { RunResult } from "@/lib/contracts";
import { useSessionStore } from "@/features/session";
import { runTests } from "@/features/runner";
import { useRoomTests } from "../hooks/useRoomTests";
import { codeHash, lastRunSummary } from "../lib/runSummary";
import { assessment, challenge } from "./integrationFixtures";

vi.mock("@/features/runner", async (original) => ({ ...await original<typeof import("@/features/runner")>(), runTests: vi.fn() }));
const mockRun = vi.mocked(runTests);
function result(target: "visible" | "hidden", overrides: Partial<RunResult> = {}): RunResult {
  return { runId: "fixture", target, total: 1, passed: 1, failed: 0, results: [{ name: "fixture test", status: "pass", durationMs: 1 }], timedOut: false, durationMs: 1, ...overrides };
}
function start() {
  const store = useSessionStore.getState();
  const id = store.start(assessment, challenge);
  store.record(id, { type: "rules_ack", room: 0, data: {} });
  store.record(id, { type: "room_enter", room: 2, data: { room: 2 } });
  return id;
}
beforeEach(() => { mockRun.mockReset(); localStorage.clear(); useSessionStore.setState({ sessions: {} }); });
afterEach(cleanup);

it("runs visible then hidden, records one event and seals matching green code once", async () => {
  const id = start();
  mockRun.mockResolvedValueOnce(result("visible")).mockResolvedValueOnce(result("hidden"));
  const { result: hook } = renderHook(() => useRoomTests(id, challenge, 2));
  await act(async () => { await Promise.all([hook.current.run(), hook.current.run()]); });
  expect(mockRun).toHaveBeenCalledTimes(2);
  expect(mockRun.mock.calls.map(([input]) => input.target)).toEqual(["visible", "hidden"]);
  expect(mockRun.mock.calls[1][0].testsSource).toBe(challenge.hiddenTests);
  const session = useSessionStore.getState().sessions[id];
  expect(session.events.filter((event) => event.type === "test_run")).toHaveLength(1);
  expect(lastRunSummary(session)).toMatchObject({ visible: { passed: 1, total: 1 }, hidden: { passed: 1, total: 1, failedNames: [] }, codeHash: codeHash(challenge.starterCode) });
  expect(session.events.filter((event) => event.type === "room_complete")).toHaveLength(1);
  expect(hook.current.status).toBe("success");
  await act(async () => { await hook.current.run(); });
  expect(mockRun).toHaveBeenCalledTimes(2);
});

it("records failed names, while zero-test, runtime-error and timeout results never unlock", async () => {
  for (const failure of [
    { total: 0, passed: 0, results: [] },
    { runtimeError: "Worker failed", total: 0, passed: 0, results: [] },
    { timedOut: true },
    { passed: 0, failed: 1, results: [{ name: "fallback", status: "fail" as const, message: "not rendered", durationMs: 1 }] },
  ]) {
    const id = start();
    mockRun.mockResolvedValueOnce(result("visible")).mockResolvedValueOnce(result("hidden", failure));
    const { result: hook, unmount } = renderHook(() => useRoomTests(id, challenge, 2));
    await act(async () => { await hook.current.run(); });
    const session = useSessionStore.getState().sessions[id];
    expect(session.events.some((event) => event.type === "room_complete")).toBe(false);
    expect(session.events.filter((event) => event.type === "test_run")).toHaveLength(1);
    if (failure.failed) expect(lastRunSummary(session)?.hidden.failedNames).toEqual(["fallback"]);
    unmount();
  }
});

it("keeps the executed snapshot and prevents stale green results from unlocking changed code", async () => {
  const id = start();
  let finish!: (value: RunResult) => void;
  mockRun.mockResolvedValueOnce(result("visible")).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const { result: hook } = renderHook(() => useRoomTests(id, challenge, 2));
  let pending!: Promise<void>;
  await act(async () => { pending = hook.current.run(); await Promise.resolve(); await Promise.resolve(); });
  expect(hook.current.status).toBe("running");
  useSessionStore.getState().applyCode(id, "changed during run", "manual");
  await act(async () => { finish(result("hidden")); await pending; });
  const session = useSessionStore.getState().sessions[id];
  expect(session.finalCode).toBe("changed during run");
  expect(session.snapshots.at(-1)?.code).toBe(challenge.starterCode);
  expect(session.events.some((event) => event.type === "room_complete")).toBe(false);
});

it("runs only visible tests in Room 1 and never unlocks Room 2", async () => {
  const id = start();
  mockRun.mockResolvedValueOnce(result("visible"));
  const { result: hook } = renderHook(() => useRoomTests(id, challenge, 1));
  await act(async () => { await hook.current.run(); });
  expect(mockRun).toHaveBeenCalledOnce();
  expect(lastRunSummary(useSessionStore.getState().sessions[id])?.hidden).toEqual({ passed: 0, total: 0, failedNames: [] });
  expect(hook.current.hidden).toBeNull();
});

it("shows an explicit error for unexpected runner rejection", async () => {
  const id = start();
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mockRun.mockRejectedValueOnce(new Error("runner unavailable"));
  const { result: hook } = renderHook(() => useRoomTests(id, challenge, 2));
  await act(async () => { await hook.current.run(); });
  expect(hook.current.status).toBe("error");
  expect(log).toHaveBeenCalledWith("Test execution could not complete");
  expect(useSessionStore.getState().sessions[id].events.some((event) => event.type === "room_complete")).toBe(false);
  log.mockRestore();
});
