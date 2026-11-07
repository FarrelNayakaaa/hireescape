import Link from "next/link";
import { t } from "@/lib/i18n";
import type { AssessmentConfig } from "@/lib/contracts";

export function AssessmentState({ state, locale = "en", onRetry }: {
  state: "loading" | "unavailable" | "not_found" | "error"; locale?: AssessmentConfig["locale"]; onRetry?: () => void;
}) {
  const copy = {
    loading: { title: "loading", body: null },
    unavailable: { title: "unavailableTitle", body: "unavailableBody" },
    not_found: { title: "notFoundTitle", body: "notFoundBody" },
    error: { title: "errorTitle", body: "errorBody" },
  } as const;
  const content = copy[state];
  return <section aria-busy={state === "loading"} aria-live="polite" className="mx-auto max-w-xl space-y-5 rounded-xl border border-t-4 border-he-border border-t-he-blue bg-he-surface p-8 text-he-text">
    <p className="font-mono text-xs uppercase tracking-widest text-he-blue">HireEscape</p>
    <h1 className="text-2xl font-bold" role={state === "loading" ? "status" : undefined}>{t(locale, content.title)}</h1>
    {content.body && <p className="leading-6 text-he-muted">{t(locale, content.body)}</p>}
    {state === "error" && onRetry && <button type="button" onClick={onRetry} className="min-h-10 rounded-lg bg-he-orange px-5 font-semibold text-he-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-he-blue">{t(locale, "retry")}</button>}
    {state !== "loading" && <Link href="/manager" className="inline-flex min-h-10 items-center text-he-blue underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-he-blue">{t(locale, "backToManager")}</Link>}
  </section>;
}
