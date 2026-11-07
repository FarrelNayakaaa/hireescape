"use client";
import { t } from "@/lib/i18n";
import type { AssessmentConfig } from "@/lib/contracts";
import dynamic from "next/dynamic";
import { createContext, useContext, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui";
const LocaleContext = createContext<AssessmentConfig["locale"]>("en");
function DiffLoading() { return <p role="status">{t(useContext(LocaleContext), "diffLoading")}</p>; }
const LocalDiff = dynamic(() => import("./AssistantDiff").then((module) => module.AssistantDiff), { ssr: false, loading: DiffLoading });
export function ReviewModal({ original, modified, onClose, locale = "en" }: { locale?: AssessmentConfig["locale"]; original: string; modified: string; onClose(): void }) {
  const dialog = useRef<HTMLDialogElement | null>(null); const title = useId();
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} aria-labelledby={title} onCancel={onClose} onClose={onClose} className="w-[min(95vw,1200px)] rounded-xl border border-he-border bg-he-surface p-6 text-he-text backdrop:bg-black/70">
    <div className="mb-4 flex items-center justify-between gap-4"><h2 id={title}>{t(locale, "reviewTitle")}</h2><Button variant="secondary" onClick={onClose}>{t(locale, "closeReview")}</Button></div>
    <LocaleContext value={locale}><LocalDiff label={t(locale, "reviewTitle")} original={original} modified={modified} /></LocaleContext>
  </dialog>;
}
