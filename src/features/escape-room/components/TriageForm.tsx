"use client";
import { useState } from "react";
import { AccentCard, Button } from "@/components/ui";
import type { AssessmentConfig, DefectType } from "@/lib/contracts";
import { t } from "@/lib/i18n";
import type { MarkedRange } from "../lib/triageCheck";
import { triageHints } from "../lib/triageHints";
export function TriageForm({ marked, attempts, defectType, onSubmit, disabled, locale }: {
  marked: MarkedRange | null; attempts: number; defectType: DefectType; onSubmit(hypothesis: string): void; disabled: boolean; locale: AssessmentConfig["locale"];
}) {
  const [hypothesis, setHypothesis] = useState("");
  const validRange = marked && marked[0] > 0 && marked[1] - marked[0] < 8;
  return <AccentCard accent="room1" className="space-y-3">
    <h2>{t(locale, "triageTitle")}</h2><p>{t(locale, "triageInstructions")}</p>
    <p>{t(locale, marked ? "triageRange" : "triageSelect", { start: marked?.[0] ?? 0, end: marked?.[1] ?? 0 })}</p>
    <label className="block space-y-2">{t(locale, "hypothesis")}<textarea value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} disabled={disabled} className="w-full rounded border border-he-border bg-he-surface-2 p-3" /></label>
    <Button disabled={disabled || !validRange || hypothesis.trim().length < 15} onClick={() => onSubmit(hypothesis.trim())}>{t(locale, "submitTriage")}</Button>
    {(!validRange || hypothesis.trim().length < 15) && <p className="text-sm text-he-muted">{t(locale, "triageRequirements")}</p>}
    {attempts > 0 && <p role="status">{t(locale, "triageHint", { hint: triageHints[defectType] })}</p>}
  </AccentCard>;
}
