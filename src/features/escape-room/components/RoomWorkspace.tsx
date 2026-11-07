"use client";

import { useCallback, useEffect, useReducer } from "react";
import type { AssessmentConfig, Challenge, Room, Session } from "@/lib/contracts";
import { useSessionStore } from "@/features/session";
import { AccentCard } from "@/components/ui";
import { RoomIntroCard } from "@/components/game";
import { t } from "@/lib/i18n";
import { useRoomTests } from "../hooks/useRoomTests";
import { deriveFlow, initialRoomUiState, roomUiReducer } from "../lib/flow";
import { codeHash, lastRunSummary, roomDurationSec } from "../lib/runSummary";
import { EditorPane } from "./EditorPane";
import { RoomHeader } from "./RoomHeader";
import { RightPanel } from "./RightPanel";
import { RunBar } from "./RunBar";

export function RoomWorkspace({ assessment, challenge, session }: { assessment: AssessmentConfig; challenge: Challenge; session: Session }) {
  const flow = deriveFlow(session.events, assessment, { startedAt: session.startedAt });
  const room: Room = flow.phase === "room3" && !flow.room3Entered ? 2 : flow.room === 0 ? 1 : flow.room;
  const unlocked = flow.completedRooms.includes(2);
  const [ui, dispatch] = useReducer(roomUiReducer, initialRoomUiState);
  const run = useRoomTests(session.id, challenge, room);
  const executeRun = run.run;
  const recorded = lastRunSummary(session);
  const hash = run.codeHash ?? recorded?.codeHash;
  const stale = Boolean(hash && hash !== codeHash(session.finalCode));
  const terminal = Boolean(session.endedAt);
  const locale = assessment.locale;
  const runTests = useCallback(() => {
    dispatch({ type: "select_tab", tab: "tests" });
    void executeRun();
  }, [executeRun]);
  const dismissIntro = useCallback(() => dispatch({ type: "dismiss_intro", room }), [room]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey) || terminal || unlocked || room === 3) return;
      event.preventDefault();
      event.stopPropagation();
      runTests();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [room, runTests, terminal, unlocked]);
  const next = () => {
    const store = useSessionStore.getState();
    const current = store.sessions[session.id];
    if (!current || current.endedAt) return;
    if (room === 1) {
      store.record(session.id, { type: "room_complete", room: 1, data: { room: 1, durationSec: roomDurationSec(current, 1, Date.now()) } });
      store.record(session.id, { type: "room_enter", room: 2, data: { room: 2 } });
    } else if (room === 2 && unlocked && !flow.room3Entered) store.record(session.id, { type: "room_enter", room: 3, data: { room: 3 } });
  };
  if (terminal) return <AccentCard accent="neutral"><h1>{t(locale, session.endReason === "escaped" ? "sessionEscaped" : session.endReason === "timeout" ? "sessionTimeout" : "sessionEnded")}</h1><p className="mt-4 text-he-muted">{t(locale, "sessionSaved")}</p></AccentCard>;
  return <div className="mx-auto min-w-0 max-w-[1920px] space-y-4 xl:min-w-[1232px]">
    <RoomHeader assessment={assessment} title={challenge.title} flow={{ ...flow, room }} />
    {!ui.dismissedIntros.includes(room) && <RoomIntroCard key={room} room={room} title={t(locale, `room${room}Name`)} goal={t(locale, `room${room}Goal`)}
      skipLabel={t(locale, "skipIntro")} continueLabel={t(locale, "dismissIntro")} onDismiss={dismissIntro} />}
    {room === 3 && <AccentCard accent="room3"><p>{t(locale, "defencePending")}</p></AccentCard>}
    {unlocked && room === 2 && <p role="status" className="text-he-green">{t(locale, "vaultOpen")} — {t(locale, "codeSealed")}</p>}
    {run.status === "error" && <p role="alert" className="text-he-red">{t(locale, "testExecutionError")}</p>}
    {stale && <p role="status" className="text-he-yellow">{t(locale, "testsChanged")}</p>}
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <EditorPane sessionId={session.id} readOnly={unlocked || room === 3} locale={locale} />
      <RightPanel room={room} aiAssistance={assessment.aiAssistance} title={challenge.title} brief={challenge.brief}
        visible={run.visible} hidden={run.hidden} running={run.status === "running"} recorded={recorded}
        activeTab={ui.activeTab} onTabChange={(tab) => dispatch({ type: "select_tab", tab })} locale={locale} />
    </div>
    <RunBar room={room} running={run.status === "running"} unlocked={unlocked} hidden={run.hidden} recorded={recorded}
      onRun={runTests} onContinue={room < 3 ? next : undefined} locale={locale} />
  </div>;
}
