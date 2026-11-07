import type { RunResult } from "@/lib/contracts";
import { runSuite } from "./harness";
import type { RunRequest, RunResponse } from "./protocol";

// Keep worker globals local: the application tsconfig also includes DOM globals.
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<RunRequest>) => void) | null;
  postMessage(message: RunResponse): void;
};

scope.onmessage = async ({ data }) => {
  if (data.kind !== "run") return;
  const started = Date.now();
  let result: RunResult;
  try {
    result = await runSuite(data);
  } catch (error) {
    result = {
      runId: `run_${Math.random().toString(36).slice(2, 10)}`,
      target: data.target, total: 0, passed: 0, failed: 0, results: [], timedOut: false,
      runtimeError: `Runner failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 300),
      durationMs: Date.now() - started,
    };
  }
  scope.postMessage({ kind: "result", requestId: data.requestId, result });
};
