"use client";
import { useState } from "react";
import { AccentCard, AgentAvatar, Button } from "@/components/ui";
import type { AssessmentConfig } from "@/lib/contracts";
import { t } from "@/lib/i18n";
export type DefenceQuestion = { eventId: string; question: string };
function Answer({ question, onAnswer, disabled, locale }: { question: DefenceQuestion; onAnswer(id: string, answer: string): void; disabled: boolean; locale: AssessmentConfig["locale"] }) {
  const [text, setText] = useState("");
  return <div className="space-y-3"><p>{question.question}</p><label className="block">{t(locale, "defenceAnswer")}<textarea className="mt-2 w-full rounded border border-he-border bg-he-surface-2 p-3" value={text} disabled={disabled} onChange={(event) => setText(event.target.value)} /></label>
    <p className="text-sm text-he-muted">{text.length}/800 · {t(locale, text.length > 800 ? "answerLong" : "answerMinimum")}</p>
    <Button disabled={disabled || text.trim().length < 30} onClick={() => onAnswer(question.eventId, text.trim())}>{t(locale, "submitAnswer")}</Button></div>;
}
export function DefencePanel({ questions, answers, onAnswer, disabled = false, locale }: { questions: DefenceQuestion[]; answers: Record<string, string>; onAnswer(id: string, answer: string): void; disabled?: boolean; locale: AssessmentConfig["locale"] }) {
  const next = questions.find((question) => !answers[question.eventId]);
  return <AccentCard accent="room3" className="space-y-4"><div className="he-panel-mascot"><AgentAvatar agent="inquisitor" size="lg" state={next ? "idle" : questions.length >= 3 ? "done" : "thinking"} /><h2>{t(locale, "room3Name")}</h2></div>
    {questions.filter((question) => answers[question.eventId]).map((question) => <div key={question.eventId}><p>{question.question}</p><p className="whitespace-pre-wrap text-he-muted">{answers[question.eventId]}</p></div>)}
    {next ? <Answer key={next.eventId} question={next} onAnswer={onAnswer} disabled={disabled} locale={locale} /> : <p role="status">{t(locale, "preparingQuestion")}</p>}
  </AccentCard>;
}
