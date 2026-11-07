"use client";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui";
import type { AssessmentConfig, Dimension } from "@/lib/contracts";
import { t } from "@/lib/i18n";
import type { SignalCounts } from "../lib/signals";
export function useSignalNotice(counts: SignalCounts, sessionId: string, locale: AssessmentConfig["locale"]) {
  const previous = useRef(counts); const last = useRef(-Infinity); const { push } = useToast();
  useEffect(() => {
    const changed = (Object.keys(counts) as Dimension[]).find((axis) => counts[axis] !== null && (counts[axis] ?? 0) > (previous.current[axis] ?? 0));
    previous.current = counts;
    if (!changed) return;
    try { last.current = Math.max(last.current, Number(localStorage.getItem(`he:signal-notice:${sessionId}`)) || -Infinity); } catch { /* UI-only preference may be unavailable. */ }
    if (Date.now() - last.current < 20_000) return;
    last.current = Date.now();
    try { localStorage.setItem(`he:signal-notice:${sessionId}`, String(last.current)); } catch { /* Counts remain visible without UI preferences. */ }
    push({ tone: "info", title: t(locale, "signalNotice", { axis: t(locale, changed) }) });
  }, [counts, locale, push, sessionId]);
}
