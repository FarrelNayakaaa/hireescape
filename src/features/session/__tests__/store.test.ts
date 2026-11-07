// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { exportSessions, getSession, importSessions, listSessions } from "../index";
import { findActiveSession, useSessionStore } from "../store";
import { assessment, challenge } from "./fixtures";

beforeEach(() => {
  localStorage.clear();
  useSessionStore.setState({ sessions: {} });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T02:30:00.000Z"));
});
afterEach(() => vi.useRealTimers());

it("starts a session and records sequential ids, monotonic times, and code snapshots", () => {
  const id = useSessionStore.getState().start(assessment, challenge);
  expect(getSession(id)).toMatchObject({ finalCode: challenge.starterCode, lineOrigins: ["starter", "starter", "starter"], suggestions: [] });
  expect(getSession(id)?.events[0]).toMatchObject({ id: "e1", t: 0, type: "session_start", data: { aiAssistance: true, level: "mid", defectType: "cache_no_fallback" } });
  vi.advanceTimersByTime(100);
  const event = useSessionStore.getState().record(id, { type: "rules_ack", room: 0, data: {} });
  expect(event).toMatchObject({ id: "e2", t: 100 });
  vi.setSystemTime(new Date("2026-11-07T02:29:00.000Z"));
  expect(useSessionStore.getState().record(id, { type: "room_enter", room: 1, data: { room: 1 } }).t).toBe(100);
  expect(getSession(id)?.snapshots[1]).toEqual({ eventId: "e2", t: 100, code: challenge.starterCode });
  useSessionStore.getState().applyCode(id, "replacement", "ai");
  useSessionStore.getState().snapshot(id, "e2", "replacement");
  expect(getSession(id)?.snapshots.find((snapshot) => snapshot.eventId === "e2")?.code).toBe("replacement");
  expect(() => useSessionStore.getState().snapshot(id, "missing", "code")).toThrow("Snapshot event not found");
});

it("compacts edit snapshots while preserving every non-edit snapshot", () => {
  const id = useSessionStore.getState().start(assessment, challenge);
  const protectedIds = ["e1"];
  for (let index = 0; index < 450; index++) {
    const store = useSessionStore.getState();
    store.record(id, { type: "edit", room: 2, data: { linesChanged: 1, source: "manual" } });
    if (index % 50 === 0) protectedIds.push(store.record(id, { type: "candidate_answer", room: 2, text: "A fictional answer", data: { questionEventId: "fixture-question" } }).id);
  }
  const session = getSession(id)!;
  expect(session.snapshots.length).toBeLessThanOrEqual(400);
  for (const eventId of protectedIds) expect(session.snapshots.some((snapshot) => snapshot.eventId === eventId)).toBe(true);
  expect(new Set(session.events.map((event) => event.id)).size).toBe(session.events.length);
});

it("assigns suggestion ids, updates provenance, finishes once, and finds the newest active session", () => {
  const store = useSessionStore.getState();
  const first = store.start(assessment, challenge);
  vi.advanceTimersByTime(100);
  const second = store.start(assessment, challenge);
  expect(findActiveSession(assessment.id)?.id).toBe(second);
  const suggestion = { code: "AI code", summary: "fallback", promptEventId: "e2", responseEventId: "e3" };
  expect(store.addSuggestion(second, suggestion).id).toBe("s1");
  expect(store.addSuggestion(second, suggestion).id).toBe("s2");
  store.applyCode(second, "AI code", "ai");
  store.applyCode(second, "verified code", "manual");
  expect(getSession(second)?.lineOrigins).toEqual(["ai_edited"]);
  store.finish(second, "escaped", "verified code");
  expect(getSession(second)).toMatchObject({ endedAt: "2026-11-07T02:30:00.100Z", endReason: "escaped", finalCode: "verified code" });
  const count = getSession(second)!.events.length;
  store.finish(second, "abandoned", "changed");
  store.applyCode(second, "late change", "manual");
  expect(getSession(second)?.events).toHaveLength(count);
  expect(getSession(second)?.finalCode).toBe("verified code");
  expect(findActiveSession(assessment.id)?.id).toBe(first);
  expect(findActiveSession("missing")).toBeNull();
});

it("persists and rehydrates complete evidence and suggestions", async () => {
  const store = useSessionStore.getState();
  const id = store.start(assessment, challenge);
  store.addSuggestion(id, { code: "AI code", summary: "fallback", promptEventId: "e2", responseEventId: "e3" });
  const saved = localStorage.getItem("he:sessions")!;
  const exported = exportSessions();
  useSessionStore.setState({ sessions: {} });
  localStorage.setItem("he:sessions", saved);
  await useSessionStore.persist.rehydrate();
  expect(exportSessions()).toEqual(exported);
  expect(Object.keys(JSON.parse(saved).state)).toEqual(["sessions"]);
  expect(listSessions()).toHaveLength(1);
  expect(getSession("missing")).toBeNull();
  exported[0].finalCode = "external mutation";
  expect(getSession(id)?.finalCode).toBe(challenge.starterCode);
});

it("imports valid sessions atomically, keeps the newest, and rejects malformed or integrity data", () => {
  const id = useSessionStore.getState().start(assessment, challenge);
  const original = exportSessions()[0];
  expect(importSessions([original])).toBe(0);
  const newer = { ...original, finalCode: "newer", events: [...original.events, { id: "e2", t: 200, room: 0 as const, type: "rules_ack" as const, data: {} }] };
  expect(importSessions([newer])).toBe(1);
  expect(importSessions([original])).toBe(0);
  expect(getSession(id)?.finalCode).toBe("newer");
  for (const invalid of [null, [{}], [{ ...original, integrity: {} }], [{ ...original, events: [{ ...original.events[0], data: { integrity: "forbidden" } }] }]]) {
    expect(() => importSessions(invalid)).toThrow();
  }
  expect(() => importSessions([{ ...original, id: "another" }, {}])).toThrow();
  expect(getSession("another")).toBeNull();
  const invalidPayload = { integrity: "forbidden" } as unknown as Record<string, never>;
  expect(() => useSessionStore.getState().record(id, { type: "rules_ack", room: 0, data: invalidPayload })).toThrow();
  expect(localStorage.getItem("he:sessions")).not.toContain("integrity");
});
