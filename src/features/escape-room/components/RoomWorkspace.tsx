"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssessmentConfig, Challenge, Room, Session } from "@/lib/contracts";
import { getSession, useSessionStore, type EditorRecorder } from "@/features/session";
import { AssistantPanel, useAssistant } from "@/features/assistant";
import { InquisitorPanel, useInquisitor } from "@/features/inquisitor";
import { AccentCard, Button } from "@/components/ui";
import { DoorOpenTransition, RoomIntroCard, SignalMap } from "@/components/game";
import { t } from "@/lib/i18n";
import { useRoomPreferences } from "../hooks/useRoomPreferences";
import { useSignalNotice } from "../hooks/useSignalNotice";
import { capturedSignals } from "../lib/signals";
import { SessionExport } from "./SessionExport";
import { useRoomTests } from "../hooks/useRoomTests";
import { deriveFlow } from "../lib/flow";
import { codeHash, lastRunSummary, roomDurationSec } from "../lib/runSummary";
import { triageCheck, toggleMarkedLine, type MarkedRange } from "../lib/triageCheck";
import { useSessionTimer } from "../hooks/useSessionTimer";
import { TriageForm } from "./TriageForm";
import { DefencePanel, type DefenceQuestion } from "./DefencePanel";
import { EscapedScreen } from "./EscapedScreen";
import { TimeoutScreen } from "./TimeoutScreen";
import { EditorPane } from "./EditorPane";
import { RoomHeader } from "./RoomHeader";
import { RightPanel } from "./RightPanel";
import { RunBar } from "./RunBar";

export function RoomWorkspace({ assessment, challenge, session }: { assessment: AssessmentConfig; challenge: Challenge; session: Session }) {
  const flow = deriveFlow(session.events, assessment, { startedAt: session.startedAt });
  const room: Room = flow.phase === "room3" && !flow.room3Entered ? 2 : flow.room === 0 ? 1 : flow.room;
  const lastMark = [...session.events].reverse().find((event) => event.type === "triage_mark");
  const [marked, setMarked] = useState<MarkedRange | null>(() => lastMark ? [Number(lastMark.data?.start), Number(lastMark.data?.end)] : null);
  const [transitioning, setTransitioning] = useState(false);
  const [visualTransition, setVisualTransition] = useState<Room | "escaped" | null>(() => session.events.length <= 3 && Date.now() - Date.parse(session.startedAt) < 1000 ? 1 : null);
  const clearVisualTransition = useCallback(() => setVisualTransition(null), [setVisualTransition]);
  const [showDiff, setShowDiff] = useState(false);
  const markLine = useCallback((line: number) => setMarked((current) => toggleMarkedLine(current, line)), []);
  const timer = useSessionTimer(session, assessment, challenge, room);
  const triageResults = session.events.filter((event) => event.type === "triage_result");
  const assisted = triageResults.some((event) => event.data?.assisted === true);
  const questions: DefenceQuestion[] = session.events.filter((event) => event.type === "inquisitor_question" && event.data?.mode === "defence").map((event) => ({ eventId: event.id, question: event.text ?? "" }));
  const answers = Object.fromEntries(session.events.filter((event) => event.type === "candidate_answer").map((event) => [String(event.data?.questionEventId), event.text ?? ""]));
  const unlocked = flow.completedRooms.includes(2);
  const [ui, dispatch] = useRoomPreferences(session.id);
  const signals = capturedSignals(session, challenge);
  useSignalNotice(signals, session.id, assessment.locale);
  const run = useRoomTests(session.id, challenge, room);
  const editorBridge = useRef<EditorRecorder | null>(null);
  const editorReady = useCallback((bridge: EditorRecorder | null) => { editorBridge.current = bridge; }, []);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const getRecorder = useCallback(() => editorBridge.current, []);
  const assistant = useAssistant({ assessment, challenge, session, room, disabled: unlocked || run.status === "running" || timer.expired, getRecorder });
  const getEditor = useCallback(() => editorBridge.current?.getEditor() ?? null, []);
  const inquisitor = useInquisitor({ assessment, challenge, session, room, testing: run.status === "running" || timer.expired, assistantTyping: assistantTyping && ui.activeTab === "assistant" && room === 2, getEditor });
  const executeRun = run.run;
  const recorded = lastRunSummary(session);
  const hash = run.codeHash ?? recorded?.codeHash;
  const stale = Boolean(hash && hash !== codeHash(session.finalCode));
  const terminal = Boolean(session.endedAt);
  const locale = assessment.locale;
  const runTests = useCallback(() => {
    dispatch({ type: "select_tab", tab: "tests" });
    void executeRun();
  }, [dispatch, executeRun]);
  const dismissIntro = () => dispatch({ type: "dismiss_intro", room });
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
  const enteredRoom2 = useCallback(() => {
    const current = getSession(session.id);
    if (current && !current.endedAt && !current.events.some((event) => event.type === "room_enter" && event.data?.room === 2)) useSessionStore.getState().record(session.id, { type: "room_enter", room: 2, data: { room: 2 } });
    setTransitioning(false);
  }, [session.id, setTransitioning]);
  useEffect(() => {
    if (room === 2 && !transitioning && !session.endedAt && !session.events.some((event) => event.type === "room_enter" && event.data?.room === 2)) useSessionStore.getState().record(session.id, { type: "room_enter", room: 2, data: { room: 2 } });
  }, [room, session.id, session.endedAt, session.events, transitioning]);
  const submitTriage = (hypothesis: string) => {
    const current = getSession(session.id);
    if (!current || current.endedAt || timer.expired || transitioning || triageResults.length >= 3 || hypothesis.trim().length < 15) return;
    const check = triageCheck(marked, challenge.defectLines);
    if (!check.valid || !marked) return;
    const store = useSessionStore.getState();
    store.record(session.id, { type: "triage_mark", room: 1, text: hypothesis, data: { start: marked[0], end: marked[1] } });
    const attempt = triageResults.length + 1;
    store.record(session.id, { type: "triage_result", room: 1, data: { correct: check.correct, assisted: !check.correct && attempt === 3, attempt } });
    if (check.correct || attempt === 3) {
      setTransitioning(true);
      store.record(session.id, { type: "room_complete", room: 1, data: { room: 1, durationSec: roomDurationSec(current, 1, Date.now()) } });
    }
  };
  const answer = (questionEventId: string, text: string) => {
    const current = getSession(session.id);
    if (!current || current.endedAt || timer.expired || text.trim().length < 30 || !questions.some((question) => question.eventId === questionEventId) || answers[questionEventId]) return;
    const store = useSessionStore.getState();
    store.record(session.id, { type: "candidate_answer", room: 3, text, data: { questionEventId } });
    if (questions.filter((question) => question.eventId === questionEventId || answers[question.eventId]).length >= 3) {
      store.record(session.id, { type: "room_complete", room: 3, data: { room: 3, durationSec: roomDurationSec(current, 3, Date.now()) } });
      setVisualTransition("escaped");
      store.finish(session.id, "escaped", current.finalCode);
    }
  };
  const next = () => {
    const store = useSessionStore.getState();
    const current = store.sessions[session.id];
    if (!current || current.endedAt) return;
    if (room === 1) {
      store.record(session.id, { type: "room_complete", room: 1, data: { room: 1, durationSec: roomDurationSec(current, 1, Date.now()) } });
      store.record(session.id, { type: "room_enter", room: 2, data: { room: 2 } });
    } else if (room === 2 && unlocked && !flow.room3Entered) { setVisualTransition(3); store.record(session.id, { type: "room_enter", room: 3, data: { room: 3 } }); }
  };
  const door = transitioning || visualTransition !== null ? <DoorOpenTransition key={transitioning ? "triage" : visualTransition} room={flow.completedRooms.at(-1) ?? 1} keyEarned={flow.completedRooms.length > 0} onComplete={transitioning ? enteredRoom2 : clearVisualTransition} label={t(locale, "enteringRoom")} /> : null;
  const debugExport = <SessionExport sessionId={session.id} locale={locale} />;
  if (session.endReason === "escaped") return <>{door}<EscapedScreen session={session} locale={locale} />{debugExport}</>;
  if (session.endReason === "timeout") return <><TimeoutScreen locale={locale} />{debugExport}</>;
  if (terminal) return <AccentCard accent="neutral"><h1>{t(locale, "sessionEnded")}</h1><p className="mt-4 text-he-muted">{t(locale, "sessionSaved")}</p></AccentCard>;
  return <div className="mx-auto min-w-0 max-w-[1920px] space-y-4 xl:min-w-[1232px]">
    {door}
    {debugExport}
    <RoomHeader assessment={assessment} title={challenge.title} flow={{ ...flow, room }} />
    {!ui.dismissedIntros.includes(room) && <RoomIntroCard key={room} room={room} title={t(locale, `room${room}Name`)} goal={t(locale, `room${room}Goal`)}
      skipLabel={t(locale, "skipIntro")} continueLabel={t(locale, "dismissIntro")} onDismiss={dismissIntro} />}
    {room === 1 && <TriageForm marked={marked} attempts={triageResults.length} defectType={challenge.defectType} onSubmit={submitTriage} disabled={timer.expired || transitioning} locale={locale} />}
    {room === 3 && <><Button variant="secondary" onClick={() => setShowDiff((current) => !current)}>{t(locale, showDiff ? "viewCode" : "viewDiff")}</Button><DefencePanel questions={questions} answers={answers} onAnswer={answer} disabled={timer.expired} locale={locale} /></>}
    {timer.expired && <p role="status">{t(locale, "savingFinal")}</p>}
    {unlocked && room === 2 && <p role="status" className="text-he-green">{t(locale, "vaultOpen")} — {t(locale, "codeSealed")}</p>}
    {run.status === "error" && <p role="alert" className="text-he-red">{t(locale, "testExecutionError")}</p>}
    {stale && <p role="status" className="text-he-yellow">{t(locale, "testsChanged")}</p>}
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <EditorPane sessionId={session.id} readOnly={unlocked || room === 3 || timer.expired} locale={locale} markedRange={room === 1 ? marked : null} revealRange={assisted && session.finalCode === challenge.starterCode ? challenge.defectLines : null} onMarkLine={room === 1 ? markLine : undefined} showDiff={room === 3 && showDiff} starterCode={challenge.starterCode} onReady={editorReady} />
      <RightPanel room={room} aiAssistance={assessment.aiAssistance} title={challenge.title} brief={challenge.brief}
        visible={run.visible} hidden={run.hidden} running={run.status === "running"} recorded={recorded}
        assistantPanel={<AssistantPanel session={session} assessment={assessment} room={room} assistant={assistant} onTyping={setAssistantTyping} />}
        inquisitorPanel={<InquisitorPanel locale={assessment.locale} session={session} thinking={inquisitor.thinking} meta={inquisitor.meta} onLine={inquisitor.focusLine} />} lastQuestionId={inquisitor.questions.at(-1)?.id}
        activeTab={ui.activeTab} onTabChange={(tab) => dispatch({ type: "select_tab", tab })} locale={locale} />
    </div>
    <SignalMap counts={signals} labels={{ debugging: t(locale, "debugging"), design: t(locale, "design"), communication: t(locale, "communication"), ai_supervision: t(locale, "ai_supervision") }} title={t(locale, "signalsTitle")} tooltip={t(locale, "signalsTooltip")} notAssessed={t(locale, "notAssessed")} />
    <RunBar room={room} running={run.status === "running" || timer.expired} unlocked={unlocked} hidden={run.hidden} recorded={recorded}
      onCheck={() => { dispatch({ type: "select_tab", tab: "inquisitor" }); void inquisitor.check(); }} checking={inquisitor.thinking} checkLimit={inquisitor.atLimit}
      onRun={runTests} onContinue={room < 3 ? next : undefined} locale={locale} />
  </div>;
}
