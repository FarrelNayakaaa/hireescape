"use client";
import { t } from "@/lib/i18n";
import { useState } from "react";
import type { AssessmentConfig, Room, Session, Suggestion } from "@/lib/contracts";
import { AgentAvatar, AgentChip, Button } from "@/components/ui";
import type { useAssistant } from "../hooks/useAssistant";
import { suggestionChanges } from "../lib/suggestionChanges";
import { ReviewModal } from "./ReviewModal";
export function AssistantPanel({ session, assessment, room, assistant, onTyping }: {
  session: Session; assessment: AssessmentConfig; room: Room; assistant: ReturnType<typeof useAssistant>; onTyping(typing: boolean): void;
}) {
  const [prompt, setPrompt] = useState(""); const [reviewing, setReviewing] = useState<Suggestion | null>(null);
  const reason = !assessment.aiAssistance ? "Off for this assessment" : room === 1 ? "Unlocks in Room 2 — triage is yours" : room === 3 ? "The defence is in your own words" : null;
  if (reason) return <div className="space-y-4 rounded border border-he-border p-5"><AgentAvatar agent="assistant" size="lg" /><p className="text-he-muted">{reason}</p></div>;
  const submit = async () => { const sent = await assistant.send(prompt); if (sent) { setPrompt(""); onTyping(false); } };
  return <section className="space-y-4"><div className="he-panel-mascot"><AgentAvatar agent="assistant" size="lg" state={assistant.status === "sending" ? "thinking" : assistant.status === "error" ? "error" : assistant.meta ? "done" : "idle"} /><AgentChip agent="assistant" status={assistant.status === "sending" ? "typing…" : assistant.status === "error" ? "unavailable" : undefined} mock={assistant.meta?.mock} latencyMs={assistant.meta?.latencyMs} /></div>
    {!session.events.some((event) => event.type === "assistant_prompt") && <p className="text-he-muted">Ask about the code, or request a fix to review.</p>}
    {session.events.filter((event) => event.type === "assistant_prompt" || event.type === "assistant_response").map((event) => {
      const suggestion = session.suggestions.find((item) => item.id === event.data?.suggestionId);
      const counts = suggestion ? suggestionChanges(session.finalCode, suggestion.code) : null;
      return <div key={event.id} className="space-y-3 rounded border border-he-border p-4">{event.type === "assistant_response" && <AgentAvatar agent="assistant" size="sm" />}<p className="whitespace-pre-wrap">{event.text}</p>
        {suggestion && counts && <div className="space-y-3 rounded border border-he-purple p-3"><p>+{counts.linesAdded} −{counts.linesRemoved} {t(locale, "linesUnit")} · {suggestion.summary}</p><div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!assistant.available} onClick={() => { if (assistant.review(suggestion)) setReviewing(suggestion); }}>{t(locale, "reviewDiff")}</Button>
          <Button disabled={!assistant.available} onClick={() => assistant.apply(suggestion)}>{t(locale, "applySuggestion")}</Button>
        </div></div>}
      </div>;
    })}
    {assistant.status === "sending" && <p role="status">{t(locale, "assistantTyping")}</p>}
    {assistant.status === "error" && <div role="alert"><p>{t(locale, "assistantUnavailable")}</p><Button variant="secondary" disabled={!assistant.available} onClick={() => void assistant.retry()}>{t(locale, "assistantRetry")}</Button></div>}
    <label className="block">{t(locale, "askAssistant")}<textarea aria-label={t(locale, "askAssistant")} value={prompt} maxLength={2000} disabled={!assistant.available || assistant.status === "sending"}
      className="mt-2 block w-full rounded border border-he-border bg-he-surface-2 p-3" onFocus={() => onTyping(true)} onBlur={() => onTyping(false)} onChange={(event) => { setPrompt(event.target.value); onTyping(true); }}
      onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!event.nativeEvent.isComposing) void submit(); } }} /></label>
    <p className="font-mono text-xs text-he-muted">{prompt.length}/2000</p><Button disabled={!assistant.available || !prompt.trim()} loading={assistant.status === "sending"} onClick={() => void submit()}>{t(locale, "send")}</Button>
    {reviewing && <ReviewModal locale={locale} original={session.finalCode} modified={reviewing.code} onClose={() => setReviewing(null)} />}
  </section>;
}
