"use client";
import { useEffect, useRef, useState } from "react";
import type { AssessmentConfig, Challenge, Room, Session } from "@/lib/contracts";
import { getSession, useSessionStore } from "@/features/session";
import { runTests } from "@/features/runner";
import { useNow } from "@/lib/hooks";
import { codeHash } from "../lib/runSummary";
import { pendingWarnings, remainingMs } from "../lib/timer";

export function useSessionTimer(session: Session, assessment: AssessmentConfig, challenge: Challenge, room: Room) {
  const now = useNow(1000);
  const remaining = remainingMs(session.startedAt, assessment.durationMin, now);
  const ending = useRef(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const current = getSession(session.id);
    if (!current || current.endedAt) return;
    const store = useSessionStore.getState();
    for (const minutesLeft of pendingWarnings(current, remaining)) store.record(session.id, { type: "timer_warning", room, data: { minutesLeft } });
    if (remaining > 0 || ending.current) return;
    ending.current = true;
    void (async () => {
      try {
        const code = getSession(session.id)!.finalCode;
        if (room === 2) {
          const result = await runTests({ code, testsSource: challenge.hiddenTests, target: "hidden", perTestTimeoutMs: 1500 });
          if (getSession(session.id)?.endedAt) return;
          const event = store.record(session.id, { type: "test_run", room, data: {
            visible: { passed: 0, total: 0 }, hidden: { passed: result.passed, total: result.total, failedNames: result.results.filter((test) => test.status !== "pass").map((test) => test.name) },
            timedOut: result.timedOut, runtimeError: result.runtimeError ?? null, codeHash: codeHash(code),
          } });
          store.snapshot(session.id, event.id, code);
        }
        // finish records session_end itself; emitting it separately would duplicate evidence.
        store.finish(session.id, "timeout", code);
      } catch {
        console.error("Final timeout run unavailable");
        setError(true);
        const latest = getSession(session.id);
        if (latest && !latest.endedAt) store.finish(session.id, "timeout", latest.finalCode);
      }
    })();
  }, [assessment.durationMin, challenge.hiddenTests, remaining, room, session.id]);
  return { remaining, expired: remaining <= 0, error };
}
