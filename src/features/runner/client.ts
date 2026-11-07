import type { RunResult } from "@/lib/contracts";
import { runSuite } from "./harness";
import type { RunRequest, RunResponse } from "./protocol";

type RunInput = Omit<RunRequest, "kind" | "requestId">;
let worker: Worker | null = null;
let queue: Promise<unknown> = Promise.resolve();

function execute(req: RunInput, hardTimeoutMs: number): Promise<RunResult> {
  if (typeof Worker === "undefined") return runSuite(req);
  const started = Date.now();
  const failure = (runtimeError: string, timedOut = false): RunResult => ({
    runId: `run_${Math.random().toString(36).slice(2, 10)}`,
    target: req.target, total: 0, passed: 0, failed: 0, results: [],
    timedOut, runtimeError, durationMs: Date.now() - started,
  });
  let current: Worker;
  try {
    current = worker ??= new Worker(new URL("./runner.worker.ts", import.meta.url), { type: "module" });
  } catch (error) {
    return Promise.resolve(failure(`Unable to start test runner: ${error instanceof Error ? error.message : String(error)}`));
  }
  const requestId = crypto.randomUUID();
  return new Promise((resolve) => {
    const finish = (result: RunResult, terminate = false) => {
      clearTimeout(timer);
      current.removeEventListener("message", onMessage);
      current.removeEventListener("error", onError);
      current.removeEventListener("messageerror", onMessageError);
      if (terminate) {
        current.terminate();
        worker = null;
      }
      resolve(result);
    };
    const onMessage = ({ data }: MessageEvent<RunResponse>) => {
      if (data.kind === "result" && data.requestId === requestId) finish(data.result);
    };
    const onError = (event: ErrorEvent) => {
      event.preventDefault();
      finish(failure("Test runner stopped unexpectedly. Run the tests again."), true);
    };
    const onMessageError = () => finish(failure("Unable to read test runner results. Run the tests again."), true);
    const timer = setTimeout(() => finish(failure(
      `Tests did not finish in ${hardTimeoutMs / 1000} s (possible infinite loop)`, true,
    ), true), hardTimeoutMs);
    current.addEventListener("message", onMessage);
    current.addEventListener("error", onError);
    current.addEventListener("messageerror", onMessageError);
    try {
      current.postMessage({ ...req, kind: "run", requestId } satisfies RunRequest);
    } catch (error) {
      finish(failure(`Unable to send tests to runner: ${error instanceof Error ? error.message : String(error)}`), true);
    }
  });
}

export function runTests(req: RunInput, hardTimeoutMs = 5000): Promise<RunResult> {
  // A failed fallback must not prevent subsequent jobs from reaching the worker.
  const result = queue.then(() => execute(req, hardTimeoutMs));
  queue = result.catch(() => undefined);
  return result;
}
