import type { ObjectiveMetrics } from "@/lib/contracts";

// Free-text model summaries have no evidence locations, so only computed facts appear here.
export function summarizeEvidence(objective: ObjectiveMetrics, claimCount: number): string {
  const runs = `The session recorded ${objective.testRuns} test run${objective.testRuns === 1 ? "" : "s"}.`;
  const result = objective.hiddenTotal > 0
    ? `The recorded hidden-test result was ${objective.hiddenPassed} of ${objective.hiddenTotal} passing.`
    : "No hidden-test result was recorded.";
  return `${runs} ${result} ${claimCount} verified observation${claimCount === 1 ? " is" : "s are"} available below.`;
}
