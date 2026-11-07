// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useSessionStore } from "@/features/session";
import { runTests } from "@/features/runner";
import { assessment, challenge } from "./integrationFixtures";
import { useSessionTimer } from "../hooks/useSessionTimer";
import { pendingWarnings, remainingMs } from "../lib/timer";
vi.mock("@/features/runner", async (load) => ({ ...await load<typeof import("@/features/runner")>(), runTests: vi.fn() }));
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-07T03:00:00.000Z")); useSessionStore.setState({ sessions: {} }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("computes remaining time and warnings from recorded events", () => {
  const id = useSessionStore.getState().start(assessment, challenge);
  const session = useSessionStore.getState().sessions[id];
  expect(remainingMs(session.startedAt, 45, Date.now())).toBe(2_700_000);
  expect(pendingWarnings(session, 120_000)).toEqual([10, 2]);
  useSessionStore.getState().record(id, { type: "timer_warning", room: 2, data: { minutesLeft: 10 } });
  expect(pendingWarnings(useSessionStore.getState().sessions[id], 120_000)).toEqual([2]);
});
it("records warnings once across remounts", () => {
  const id = useSessionStore.getState().start(assessment, challenge);
  vi.advanceTimersByTime(35 * 60_000);
  const useTimerHook = () => { const session = useSessionStore((s) => s.sessions[id]); return useSessionTimer(session, assessment, challenge, 2); };
  const first = renderHook(useTimerHook); first.unmount(); renderHook(useTimerHook);
  act(() => vi.advanceTimersByTime(8 * 60_000));
  expect(useSessionStore.getState().sessions[id].events.filter((event) => event.type === "timer_warning").map((event) => event.data?.minutesLeft)).toEqual([10, 2]);
});
it("records final hidden execution before exactly one timeout ending", async () => {
  const id = useSessionStore.getState().start(assessment, challenge);
  vi.advanceTimersByTime(61_000);
  vi.mocked(runTests).mockResolvedValue({ runId: "r1", target: "hidden", passed: 0, total: 1, failed: 1, timedOut: false, durationMs: 1, results: [{ name: "fallback", status: "fail", durationMs: 1 }] });
  await act(async () => { renderHook(() => { const session = useSessionStore((s) => s.sessions[id]); return useSessionTimer(session, { ...assessment, durationMin: 1 }, challenge, 2); }); await Promise.resolve(); });
  const session = useSessionStore.getState().sessions[id];
  expect(session.endReason).toBe("timeout");
  expect(session.events.slice(-2).map((event) => event.type)).toEqual(["test_run", "session_end"]);
  expect(session.events.filter((event) => event.type === "session_end")).toHaveLength(1);
});
