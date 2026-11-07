"use client";
import { useState } from "react";
import type { AgentMeta, AssessmentConfig, Session } from "@/lib/contracts";
import { AgentAvatar, AgentChip, Button, EvidenceChip } from "@/components/ui";
import { t } from "@/lib/i18n";
import { useSessionStore } from "@/features/session";
export function InquisitorPanel({ session, thinking, meta, onLine, locale = "en" }: { locale?: AssessmentConfig["locale"]; session: Session; thinking: boolean; meta: AgentMeta | null; onLine(line: number): void }) {
  const [answer, setAnswer] = useState("");
  const questions = session.events.filter((event) => event.type === "inquisitor_question");
  const last = questions.at(-1);
  const canAnswer = last && last.data?.mode === "nudge" && !session.events.some((event) => event.type === "candidate_answer" && event.data?.questionEventId === last.id);
  return <section className="space-y-4"><div className="he-panel-mascot"><AgentAvatar agent="inquisitor" size="lg" state={thinking ? "thinking" : last ? "done" : "idle"} /><AgentChip agent="inquisitor" status={thinking ? "thinking…" : undefined} mock={meta?.mock} latencyMs={meta?.latencyMs} /></div>
    {!questions.length && <p className="text-he-muted">The Inquisitor is watching your changes. Press Check ✦ anytime.</p>}
    {questions.map((question) => <div key={question.id} className="space-y-2 rounded border border-he-border p-4"><AgentAvatar agent="inquisitor" size="sm" /><p>{question.text}</p><EvidenceChip kind="code_line" label={`L${question.data?.line}`} onClick={() => onLine(Number(question.data?.line))} />
      <blockquote className="whitespace-pre-wrap font-mono text-xs text-he-muted">{String(question.data?.quote ?? "")}</blockquote>
      {session.events.filter((event) => event.type === "candidate_answer" && event.data?.questionEventId === question.id).map((event) => <p key={event.id} className="whitespace-pre-wrap">{event.text}</p>)}
    </div>)}
    {thinking && <p role="status">{t(locale, "inquisitorThinking")}</p>}
    {canAnswer && <div><label>{t(locale, "answerOptional")}<textarea className="block w-full rounded border border-he-border bg-he-surface-2 p-3" value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>
      <Button disabled={!answer.trim()} onClick={() => { useSessionStore.getState().record(session.id, { type: "candidate_answer", room: 2, text: answer.trim(), data: { questionEventId: last.id } }); setAnswer(""); }}>{t(locale, "sendAnswer")}</Button></div>}
  </section>;
}
