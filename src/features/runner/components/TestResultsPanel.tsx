import type { RunResult } from "@/lib/contracts";

type Props = { visible: RunResult | null; hidden: RunResult | null; running: boolean };

function SuiteResults({ result, hidden }: { result: RunResult; hidden: boolean }) {
  return (
    <section aria-label={hidden ? "Hidden test results" : "Visible test results"} className="space-y-2">
      <h3 className="font-semibold">{hidden ? "Hidden tests" : "Visible tests"}</h3>
      {result.timedOut && <p role="alert" className="text-he-yellow">Tests timed out. Check for an infinite loop or an unresolved promise.</p>}
      {result.runtimeError && <p role="alert" className="text-he-red">{hidden ? "Hidden test suite could not complete. Check your code and run again." : result.runtimeError}</p>}
      <ul className="space-y-2">
        {result.results.map((test, index) => (
          <li key={`${index}-${test.name}`}>
            <p className={test.status === "pass" ? "text-he-green" : "text-he-red"}>
              <span aria-hidden="true">{test.status === "pass" ? "✓" : "✗"}</span>{" "}
              {test.name} — {test.status}
            </p>
            {!hidden && test.message && <p className="whitespace-pre-wrap break-words text-he-muted">{test.message}</p>}
          </li>
        ))}
      </ul>
      <p>{result.failed === 0 && !result.runtimeError && !result.timedOut ? "✓" : "✗"} {result.passed}/{result.total} {hidden ? "hidden" : "visible"} tests pass</p>
    </section>
  );
}

export function TestResultsPanel({ visible, hidden, running }: Props) {
  return (
    <div aria-label="Test results" aria-busy={running} aria-live="polite" className="space-y-4 rounded-xl border border-he-border bg-he-surface p-4 text-he-text">
      {running ? <p role="status" className="flex items-center gap-2 text-he-muted">
        <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />Running…
      </p> : <>
        {!visible && !hidden && <p className="text-he-muted">Run the tests to see results</p>}
        {visible && <SuiteResults result={visible} hidden={false} />}
        {hidden && <SuiteResults result={hidden} hidden />}
      </>}
    </div>
  );
}
