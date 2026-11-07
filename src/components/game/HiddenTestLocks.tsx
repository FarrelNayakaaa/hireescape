import { LockKeyhole, UnlockKeyhole } from "lucide-react";
import type { RunResult } from "@/lib/contracts";

export function HiddenTestLocks({ results, recordedCounts, summary, emptyLabel, openLabel, statusLabels }: {
  results: RunResult | null; summary: string; emptyLabel: string; openLabel: string;
  recordedCounts?: Pick<RunResult, "passed" | "total">;
  statusLabels: { pass: string; fail: string; error: string };
}) {
  if (!results) return <p className="text-sm text-he-muted">{recordedCounts && recordedCounts.total > 0 ? summary : emptyLabel}</p>;
  const open = results.total > 0 && results.passed === results.total && !results.runtimeError && !results.timedOut;
  return <div className="space-y-2">
    <ul className="flex flex-wrap gap-2">
      {results.results.map((test, index) => {
        const Icon = test.status === "pass" ? UnlockKeyhole : LockKeyhole;
        const label = `${test.name} — ${statusLabels[test.status]}`;
        return <li key={`${index}-${test.name}`} title={label} className={test.status === "pass" ? "text-he-green" : "text-he-muted"}>
          <Icon size={18} aria-label={label} />
        </li>;
      })}
    </ul>
    <p className="text-sm text-he-text">{open ? "✓" : "○"} {summary}</p>
    {open && <p className="font-semibold text-he-green">{openLabel}</p>}
  </div>;
}
