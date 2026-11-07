"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Challenge, Room, RunResult } from "@/lib/contracts";
import { runTests } from "@/features/runner";
import { getSession, useSessionStore } from "@/features/session";
import { codeHash, roomDurationSec } from "../lib/runSummary";

type RunState = {
  status: "idle" | "running" | "success" | "error";
  visible: RunResult | null;
  hidden: RunResult | null;
  codeHash: string | null;
};
const initialState: RunState = { status: "idle", visible: null, hidden: null, codeHash: null };

export function useRoomTests(sessionId: string, challenge: Challenge, room: Room) {
  const [state, setState] = useState(initialState);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const run = useCallback(async () => {
    const initial = getSession(sessionId);
    if (pending.current || !initial || initial.endedAt || room === 3 || initial.events.some((event) => event.type === "room_complete" && event.data?.room === 2)) return;
    pending.current = true;
    setState((current) => ({ ...current, status: "running" }));
    try {
      // Allow the recorder's synchronous Monaco change/paste notifications to drain.
      await Promise.resolve();
      const code = getSession(sessionId)!.finalCode;
      const hash = codeHash(code);
      const visible = await runTests({ code, testsSource: challenge.visibleTests, target: "visible", perTestTimeoutMs: 1500 });
      const hidden = room === 2 ? await runTests({ code, testsSource: challenge.hiddenTests, target: "hidden", perTestTimeoutMs: 1500 }) : null;
      const current = getSession(sessionId);
      if (!current || current.endedAt) return;
      const store = useSessionStore.getState();
      const event = store.record(sessionId, { type: "test_run", room, data: {
        visible: { passed: visible.passed, total: visible.total },
        hidden: { passed: hidden?.passed ?? 0, total: hidden?.total ?? 0, failedNames: hidden?.results.filter((test) => test.status !== "pass").map((test) => test.name) ?? [] },
        timedOut: visible.timedOut || Boolean(hidden?.timedOut),
        runtimeError: visible.runtimeError ?? hidden?.runtimeError ?? null, codeHash: hash,
      } });
      // The evidence snapshot must show the executed code, even if typing continued.
      store.snapshot(sessionId, event.id, code);
      if (hidden && hidden.total > 0 && hidden.passed === hidden.total && !hidden.timedOut && !visible.timedOut && !hidden.runtimeError && !visible.runtimeError && current.finalCode === code) {
        store.record(sessionId, { type: "room_complete", room: 2, data: { room: 2, durationSec: roomDurationSec(current, 2, Date.now()) } });
      }
      if (mounted.current) setState({ visible, hidden, codeHash: hash, status: visible.runtimeError || hidden?.runtimeError || visible.timedOut || hidden?.timedOut ? "error" : "success" });
    } catch {
      console.error("Test execution could not complete");
      if (mounted.current) setState((current) => ({ ...current, status: "error" }));
    } finally {
      pending.current = false;
    }
  }, [challenge, room, sessionId]);
  return { ...state, run };
}
