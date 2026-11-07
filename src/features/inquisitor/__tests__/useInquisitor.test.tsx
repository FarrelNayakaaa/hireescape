// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { postAgent } from "@/lib/api-client";
import { useSessionStore, getSession } from "@/features/session";
import { useInquisitor } from "../hooks/useInquisitor";
import { mockQuestion } from "../lib/mockQuestion";
import type { InquisitorInput } from "../schema";
import type { Room } from "@/lib/contracts";
import { assessment, challenge } from "./fixtures";
vi.mock("@/lib/api-client", () => ({ postAgent: vi.fn() }));
const post = vi.mocked(postAgent);
const noEditor = () => null;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-07T03:00:00Z"));
  useSessionStore.setState({ sessions: {} });
  post.mockReset().mockImplementation(async (_url, body) => ({ result: mockQuestion(body as InquisitorInput), skippedReason: null, meta: { role: "inquisitor", model: "mock", mock: true, latencyMs: 1, attempts: 1, promptVersion: "test" } }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
function setup(room: Room = 2) {
  const id = useSessionStore.getState().start(assessment, challenge);
  const hook = renderHook(({ testing, typing }: { testing: boolean; typing: boolean }) => {
    const session = useSessionStore((state) => state.sessions[id]);
    return useInquisitor({ assessment, challenge, session, room, testing, assistantTyping: typing, getEditor: noEditor });
  }, { initialProps: { testing: false, typing: false } });
  return { ...hook, id };
}
it("waits for five seconds idle, rate limits automatic asks, bypasses on Check, caps six", async () => {
  const { result, id } = setup();
  await act(async () => { useSessionStore.getState().applyCode(id, challenge.starterCode + "\n// change one", "manual"); await vi.advanceTimersByTimeAsync(4999); });
  expect(post).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(1001); });
  expect(post).toHaveBeenCalledTimes(1);
  await act(async () => { useSessionStore.getState().applyCode(id, challenge.starterCode + "\n// change two", "manual"); window.dispatchEvent(new Event("input")); await vi.advanceTimersByTimeAsync(59_000); });
  expect(post).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(post).toHaveBeenCalledTimes(2);
  for (let index = 0; index < 7; index++) await act(async () => { await result.current.check(); });
  expect(post).toHaveBeenCalledTimes(6);
  expect(getSession(id)?.events.filter((event) => event.type === "inquisitor_question")).toHaveLength(6);
  expect(result.current.atLimit).toBe(true);
});
it("never interrupts tests or Assistant typing and sends no integrity or hidden source", async () => {
  const { result, rerender } = setup();
  rerender({ testing: true, typing: false });
  await act(async () => { await result.current.check(); });
  rerender({ testing: false, typing: true });
  await act(async () => { await result.current.check(); });
  expect(post).not.toHaveBeenCalled();
  rerender({ testing: false, typing: false });
  await act(async () => { await result.current.check(); });
  const sent = post.mock.calls[0][1];
  expect(sent).not.toHaveProperty("hiddenTests"); expect(sent).not.toHaveProperty("integrity"); expect(sent).not.toHaveProperty("referenceFix");
});
it("requests exactly three defence questions in order and recovers failures with per-focus fallbacks", async () => {
  post.mockRejectedValue(new Error("offline")); vi.spyOn(console, "error").mockImplementation(() => {});
  const { id } = setup(3);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  for (let index = 0; index < 3; index++) {
    const question = getSession(id)!.events.filter((event) => event.type === "inquisitor_question")[index];
    expect(question.data?.defenceIndex).toBe(index);
    await act(async () => { useSessionStore.getState().record(id, { type: "candidate_answer", room: 3, text: "My answer considers availability and evidence.", data: { questionEventId: question.id } }); await vi.advanceTimersByTimeAsync(1); });
  }
  expect(post).toHaveBeenCalledTimes(3);
  vi.restoreAllMocks();
});
