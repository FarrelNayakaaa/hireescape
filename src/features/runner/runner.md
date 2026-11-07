# features/runner — AGENTS.md (in-browser test execution)

> **Owner: Dev B (Candidate Experience)** · Consumed by: `features/escape-room` and, via `runTests` / `runSuite` (H7), Dev A's `features/saboteur`.

> Inherits the root `AGENTS.md`. The runner executes candidate code against tests **for real** inside
> a Web Worker. Results here are the only source of "executed" truth in the report.

## Files

```text
features/runner/
  harness.ts        port of starter-kit/harness.js (environment-agnostic; DO NOT add DOM/Node APIs)
  protocol.ts       typed worker messages
  runner.worker.ts  Web Worker entry: receives RunRequest, calls runSuite, posts RunResult
  client.ts         runTests() — manages the worker, enforces the hard timeout, recreates on hang
  hooks/useRunTests.ts
  components/TestResultsPanel.tsx
  __tests__/harness.test.ts   runs in Node via vitest (same harness)
```

`starter-kit/harness.js` is already tested against all seeded challenges, syntax errors, `require()`
attempts, and hanging promises. Port it to TS with types from `contracts.ts`; keep behaviour identical.

## Protocol

```ts
export type RunRequest = {
  kind: "run"; requestId: string; code: string; testsSource: string;
  target: "visible" | "hidden"; perTestTimeoutMs: number;
};
export type RunResponse = { kind: "result"; requestId: string; result: RunResult };
```

## `runTests()` (client.ts)

```ts
let worker: Worker | null = null;
const getWorker = () =>
  (worker ??= new Worker(new URL("./runner.worker.ts", import.meta.url), { type: "module" }));

export async function runTests(
  req: Omit<RunRequest, "kind" | "requestId">,
  hardTimeoutMs = 5000,
): Promise<RunResult> {
  const requestId = crypto.randomUUID();
  const w = getWorker();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      w.terminate(); worker = null;                    // kills sync infinite loops
      resolve(timedOutResult(req.target, requestId));  // timedOut: true, all tests "error"
    }, hardTimeoutMs);
    const onMsg = (e: MessageEvent<RunResponse>) => {
      if (e.data.requestId !== requestId) return;
      clearTimeout(timer);
      w.removeEventListener("message", onMsg);
      resolve(e.data.result);
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ kind: "run", requestId, ...req } satisfies RunRequest);
  });
}
```

- Per-test timeout (harness): 1500ms. Whole-run hard timeout (worker kill): 5000ms.
- Runs are serialised: one at a time. Disable "Run tests" while running.

## What the candidate sees

- **Visible tests**: full names, status, and messages.
- **Hidden tests**: names + status only (e.g. "✗ logs the cache failure instead of hiding it").
  Messages are hidden to avoid leaking assertions. Counter "Hidden: 4/6 passing".
- "Run tests" (⌘/Ctrl+Enter) runs visible + hidden in one click (two `runTests` calls) and records
  **one** `test_run` event with both summaries.

## Recording

Every run records `test_run` with
`data: { visible: {passed,total}, hidden: {passed,total,failedNames}, timedOut, runtimeError, codeHash }`.
Room 2 completes when a run has `hidden.passed === hidden.total` and no runtime error.

## Security notes (be honest in Q&A)

- Code runs in a Worker: no DOM access, no cookies, no localStorage. `require` is stubbed.
- `fetch`/`importScripts` still exist in workers; the challenge never needs them and the Analyst may
  note their use. Production version: server-side isolated sandbox (e.g. gVisor/Firecracker) — out of scope today.
- Hidden test source is present in the worker message (devtools-visible). Documented limitation.

## Stretch: Python

Pyodide in a second worker with a pytest-like harness. Only after the full JS flow is demo-ready.
Do not start before 14:00.

## Definition of Done

- [ ] vitest: harness gives the same results on all eight seeded challenges as `validate-seeded.mjs`.
- [ ] Manual: `while(true){}` in candidate code → result returns at ~5s with `timedOut: true`, UI stays responsive, next run works.
- [ ] Manual: syntax error → all tests "error" with a readable message.
