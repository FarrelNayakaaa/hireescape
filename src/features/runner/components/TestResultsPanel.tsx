import type { AssessmentConfig, RunResult } from "@/lib/contracts";

import { t } from "@/lib/i18n";
type Props = { locale?: AssessmentConfig["locale"]; visible: RunResult | null; hidden: RunResult | null; running: boolean };

function SuiteResults({ result, hidden, locale }: { locale: AssessmentConfig["locale"]; result: RunResult; hidden: boolean }) {
  return (
    <section aria-label={t(locale, hidden ? "hiddenTestResults" : "visibleTestResults")} className="space-y-2">
      <h3 className="font-semibold">{t(locale, hidden ? "hiddenTestsTitle" : "visibleTestsTitle")}</h3>
      {result.timedOut && <p role="alert" className="text-he-yellow">{t(locale, "testTimeout")}</p>}
      {result.runtimeError && <p role="alert" className="text-he-red">{hidden ? t(locale, "hiddenRuntimeError") : result.runtimeError}</p>}
      <ul className="space-y-2">
        {result.results.map((test, index) => (
          <li key={`${index}-${test.name}`}>
            <p className={test.status === "pass" ? "text-he-green" : "text-he-red"}>
              <span aria-hidden="true">{test.status === "pass" ? "✓" : "✗"}</span>{" "}
              {test.name} — {t(locale, `test_${test.status}`)}
            </p>
            {!hidden && test.message && <p className="whitespace-pre-wrap break-words text-he-muted">{test.message}</p>}
          </li>
        ))}
      </ul>
      <p>{result.failed === 0 && !result.runtimeError && !result.timedOut ? "✓" : "✗"} {t(locale, "testSummary", { passed: result.passed, total: result.total, suite: t(locale, hidden ? "hiddenSuite" : "visibleSuite") })}</p>
    </section>
  );
}

export function TestResultsPanel({ visible, hidden, running, locale = "en" }: Props) {
  return (
    <div aria-label={t(locale, "testResultsLabel")} aria-busy={running} aria-live="polite" className="space-y-4 rounded-xl border border-he-border bg-he-surface p-4 text-he-text">
      {running ? <p role="status" className="flex items-center gap-2 text-he-muted">
        <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />{t(locale, "testsRunning")}
      </p> : <>
        {!visible && !hidden && <p className="text-he-muted">{t(locale, "testsEmpty")}</p>}
        {visible && <SuiteResults locale={locale} result={visible} hidden={false} />}
        {hidden && <SuiteResults locale={locale} result={hidden} hidden />}
      </>}
    </div>
  );
}
