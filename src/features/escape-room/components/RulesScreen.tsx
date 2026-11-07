"use client";

import { useId, useState } from "react";
import type { AssessmentConfig } from "@/lib/contracts";
import { t } from "@/lib/i18n";

export function RulesScreen({ assessment, title, onStart }: { assessment: AssessmentConfig; title: string; onStart?: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const reasonId = useId();
  const locale = assessment.locale;
  const disabled = !acknowledged || !onStart;
  return <section className="mx-auto max-w-3xl space-y-6 rounded-xl border border-t-4 border-he-border border-t-he-blue bg-he-surface p-8 text-he-text">
    <p className="font-mono text-xs uppercase tracking-widest text-he-blue">{t(locale, "rulesTitle")}</p>
    <h1 className="text-3xl font-bold">{title}</h1>
    <p className="font-mono text-sm text-he-muted">{t(locale, "minutesAvailable", { minutes: assessment.durationMin })}</p>
    <ol className="grid gap-3 sm:grid-cols-3">
      {([1, 2, 3] as const).map((room) => <li key={room} className="space-y-2 rounded-lg border border-he-border bg-he-surface-2 p-4">
        <span className="font-mono text-sm text-he-blue">{String(room).padStart(2, "0")}</span>
        <h2 className="font-semibold">{t(locale, `room${room}Name`)}</h2>
        <p className="text-sm leading-6 text-he-muted">{t(locale, `room${room}Goal`)}</p>
      </li>)}
    </ol>
    <p className="rounded-lg border border-he-purple p-4 leading-6">{t(locale, assessment.aiAssistance ? "aiOnRule" : "aiOffRule")}</p>
    <p className="text-sm leading-6 text-he-muted">{t(locale, "inquisitorRule")}</p>
    {assessment.proctoring.mode !== "off" && <p className="text-sm text-he-muted">{t(locale, assessment.proctoring.mode === "browser" ? "browserSignals" : "mediaSignals")}</p>}
    <p className="text-sm leading-6">{t(locale, "humanReview")}</p>
    <label className="flex min-h-10 cursor-pointer items-center gap-3">
      <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="h-5 w-5 accent-he-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-he-blue" />
      {t(locale, "understand")}
    </label>
    <button type="button" disabled={disabled} onClick={onStart} aria-describedby={disabled ? reasonId : undefined}
      className="min-h-10 rounded-lg bg-he-orange px-6 py-2 font-semibold text-he-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-he-blue disabled:cursor-not-allowed disabled:opacity-60">{t(locale, "start")}</button>
    {disabled && <p id={reasonId} className="text-sm text-he-muted">{t(locale, onStart ? "acknowledgeFirst" : "unavailableBody")}</p>}
  </section>;
}
