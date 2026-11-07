"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import type { AgentMeta, AssessmentConfig, Challenge, Room, Session } from "@/lib/contracts";
import { postAgent } from "@/lib/api-client";
import { useIdle, useNow } from "@/lib/hooks";
import { diffLineOps, getSession, useSessionStore } from "@/features/session";
import { InquisitorResponse, type QuestionOutput } from "../schema";
import { canAskNudge, questionCodeHash } from "../lib/rateLimit";
import { fallbackQuestion } from "../lib/fallbackQuestions";
import { validateQuestion } from "../lib/validateQuestion";

export function useInquisitor({ assessment, challenge, session, room, testing, assistantTyping = false, getEditor }: {
  assessment: AssessmentConfig; challenge: Challenge; session: Session; room: Room; testing: boolean; assistantTyping?: boolean; getEditor(): editor.IStandaloneCodeEditor | null;
}) {
  const idle = useIdle(5000); const now = useNow(1000);
  const [thinking, setThinking] = useState(false); const [meta, setMeta] = useState<AgentMeta | null>(null);
  const pending = useRef(false); const mounted = useRef(true);
  const questions = session.events.filter((event) => event.type === "inquisitor_question");
  const nudge = questions.filter((event) => event.data?.mode === "nudge");
  const last = nudge.at(-1);
  const askedCode = useRef(session.snapshots.find((snapshot) => snapshot.eventId === last?.id)?.code ?? session.finalCode);
  const askedAt = useRef(last ? Date.parse(session.startedAt) + last.t : -Infinity);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decoration = useRef<editor.IEditorDecorationsCollection | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (highlightTimer.current) clearTimeout(highlightTimer.current); decoration.current?.clear(); }; }, []);
  const focusLine = useCallback((line: number) => {
    const instance = getEditor(); if (!instance || !instance.getModel()) return;
    instance.revealLineInCenter(line); instance.setPosition({ lineNumber: line, column: 1 });
    decoration.current?.clear();
    decoration.current = instance.createDecorationsCollection([{ range: { startLineNumber: line, endLineNumber: line, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: "he-triage-mark" } }]);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => { decoration.current?.clear(); }, 3000);
  }, [getEditor]);
  const ask = useCallback(async (mode: "nudge" | "defence", index: number | null, automatic = false) => {
    const current = getSession(session.id);
    if (!mounted.current || !current || current.endedAt || pending.current || testing || assistantTyping) return;
    const all = current.events.filter((event) => event.type === "inquisitor_question");
    const history = all.slice(-6).map((event) => ({ q: event.text ?? "", a: current.events.find((answer) => answer.type === "candidate_answer" && answer.data?.questionEventId === event.id)?.text ?? null }));
    const changed = questionCodeHash(current.finalCode) !== questionCodeHash(askedCode.current) && diffLineOps(askedCode.current.split("\n"), current.finalCode.split("\n")).some((op) => op.type !== "equal");
    if (mode === "nudge" && (room !== 2 || !canAskNudge({ count: all.filter((event) => event.data?.mode === "nudge").length, automatic, now: Date.now(), lastAskedAt: askedAt.current, changed, idle, busy: testing || assistantTyping }))) return;
    pending.current = true; setThinking(true); askedCode.current = current.finalCode;
    if (mode === "nudge") askedAt.current = Date.now();
    let output: QuestionOutput | null = null;
    try {
      const response = await postAgent<{ result: QuestionOutput | null; skippedReason: string | null; meta: AgentMeta }>("/api/inquisitor", {
        assessmentId: assessment.id, mode, locale: assessment.locale, challenge: { brief: challenge.brief, defectType: challenge.defectType, rubricHints: challenge.rubricHints },
        starterCode: challenge.starterCode, currentCode: current.finalCode, recentQA: history, defenceIndex: index,
      }, { headers: { "x-assessment-token": assessment.token } });
      output = InquisitorResponse.parse(response).result;
      if (mounted.current) setMeta(response.meta);
    } catch { console.error("Inquisitor unavailable; continuing the session"); }
    const latest = getSession(session.id);
    if (latest && !latest.endedAt && mounted.current) {
      if (mode === "defence" && !output) output = fallbackQuestion(latest.finalCode, index ?? 0, assessment.locale);
      if (output && validateQuestion(output, latest.finalCode, history).length === 0) {
        useSessionStore.getState().record(session.id, { type: "inquisitor_question", room: mode === "defence" ? 3 : 2, text: output.question,
          data: { mode, intent: output.intent, line: output.groundedIn.line, quote: output.groundedIn.quote, defenceIndex: index } });
        focusLine(output.groundedIn.line);
      }
    }
    pending.current = false; if (mounted.current) setThinking(false);
  }, [assessment, assistantTyping, challenge, focusLine, idle, room, session.id, testing]);
  useEffect(() => {
    if (room === 2 && !session.endedAt && idle && session.finalCode !== askedCode.current && now - askedAt.current >= 60_000) void ask("nudge", null, true);
  }, [ask, idle, now, room, session.endedAt, session.finalCode]);
  useEffect(() => {
    if (room !== 3 || session.endedAt) return;
    const defence = session.events.filter((event) => event.type === "inquisitor_question" && event.data?.mode === "defence");
    const answered = defence.filter((question) => session.events.some((event) => event.type === "candidate_answer" && event.data?.questionEventId === question.id)).length;
    if (answered < 3 && !defence.some((event) => event.data?.defenceIndex === answered)) queueMicrotask(() => { void ask("defence", answered); });
  }, [ask, room, session.endedAt, session.events]);
  return { questions, thinking, meta, focusLine, check: () => ask("nudge", null), atLimit: nudge.length >= 6 };
}
