"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { postAgent } from "@/lib/api-client";
import type { AgentMeta, AssessmentConfig, Challenge, Room, Session, Suggestion } from "@/lib/contracts";
import { getSession, useSessionStore, type EditorRecorder } from "@/features/session";
import { AssistantOutput } from "../schema";
import { validateSuggestion } from "../lib/validateSuggestion";
import { suggestionChanges } from "../lib/suggestionChanges";
export function useAssistant({ assessment, challenge, session, room, disabled = false, getRecorder }: {
  assessment: AssessmentConfig; challenge: Challenge; session: Session; room: Room; disabled?: boolean; getRecorder(): EditorRecorder | null;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [meta, setMeta] = useState<AgentMeta | null>(null);
  const pending = useRef(false); const mounted = useRef(true); const failedPrompt = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const available = assessment.aiAssistance && room === 2 && !session.endedAt && !disabled;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => { if (room !== 2 || session.endedAt) controller.current?.abort(); }, [room, session.endedAt]);
  const send = useCallback(async (prompt: string) => {
    const current = getSession(session.id);
    if (!available || !current || current.endedAt || pending.current || !prompt.trim() || prompt.length > 2000) return false;
    pending.current = true; setStatus("sending"); failedPrompt.current = prompt; controller.current = new AbortController();
    const store = useSessionStore.getState();
    const history = current.events.filter((event) => event.type === "assistant_prompt" || event.type === "assistant_response").slice(-8).map((event) => ({ role: event.type === "assistant_prompt" ? "user" as const : "assistant" as const, text: event.text ?? "" }));
    const run = [...current.events].reverse().find((event) => event.type === "test_run")?.data;
    const promptEvent = store.record(session.id, { type: "assistant_prompt", room: 2, text: prompt, data: { chars: prompt.length } });
    try {
      const response = await postAgent<{ message: string; suggestion: { summary: string; code: string } | null; meta: AgentMeta }>("/api/assistant", {
        assessmentId: assessment.id, room: 2, locale: assessment.locale, brief: challenge.brief, currentCode: current.finalCode, visibleTests: challenge.visibleTests,
        lastRun: run ? { visible: run.visible, hidden: run.hidden } : null, history, prompt,
      }, { headers: { "x-assessment-token": assessment.token }, signal: controller.current.signal });
      const output = validateSuggestion(AssistantOutput.parse(response));
      const latest = getSession(session.id);
      if (!mounted.current || !latest || latest.endedAt || controller.current.signal.aborted) return false;
      // Both ids are sequential under H8. Record the response first so the saved
      // suggestion can cite a real response event; no async work splits these writes.
      const suggestionId = output.suggestion ? `s${Math.max(0, ...latest.suggestions.map((suggestion) => Number(suggestion.id.slice(1)))) + 1}` : null;
      const responseEvent = store.record(session.id, { type: "assistant_response", room: 2, text: output.message, data: { suggestionId, suggestionLines: output.suggestion?.code.split("\n").length ?? 0 } });
      if (output.suggestion) store.addSuggestion(session.id, { ...output.suggestion, promptEventId: promptEvent.id, responseEventId: responseEvent.id });
      setMeta(response.meta); setStatus("idle"); failedPrompt.current = null; return true;
    } catch {
      if (mounted.current && !getSession(session.id)?.endedAt) setStatus("error");
      return false;
    } finally { pending.current = false; }
  }, [assessment.id, assessment.locale, assessment.token, available, challenge.brief, challenge.visibleTests, session.id]);
  const review = useCallback((suggestion: Suggestion) => {
    const current = getSession(session.id);
    if (!available || !current || current.endedAt || !current.suggestions.some((item) => item.id === suggestion.id)) return false;
    useSessionStore.getState().record(session.id, { type: "ai_diff_view", room: 2, data: { suggestionId: suggestion.id } });
    return true;
  }, [available, session.id]);
  const apply = useCallback((suggestion: Suggestion) => {
    const current = getSession(session.id); const bridge = getRecorder();
    if (!available || !current || current.endedAt || !bridge?.getEditor() || !current.suggestions.some((item) => item.id === suggestion.id)) return false;
    const counts = suggestionChanges(current.finalCode, suggestion.code);
    try {
      bridge.applyExternalEdit("ai", suggestion.code);
      useSessionStore.getState().record(session.id, { type: "ai_apply", room: 2, data: { suggestionId: suggestion.id, ...counts,
        reviewedFirst: current.events.some((event) => event.type === "ai_diff_view" && event.data?.suggestionId === suggestion.id) } });
      return true;
    } catch { setStatus("error"); return false; }
  }, [available, getRecorder, session.id]);
  return { status, meta, available, send, review, apply, retry: () => failedPrompt.current ? send(failedPrompt.current) : Promise.resolve(false) };
}
