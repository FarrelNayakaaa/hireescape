import type { RunResult } from "@/lib/contracts";

export type RunRequest = {
  kind: "run";
  requestId: string;
  code: string;
  testsSource: string;
  target: "visible" | "hidden";
  perTestTimeoutMs: number;
};

export type RunResponse = { kind: "result"; requestId: string; result: RunResult };
