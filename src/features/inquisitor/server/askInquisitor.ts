import "server-only";
import { callStructured } from "@/lib/codex/client";
import { INQUISITOR_SYSTEM, INQUISITOR_VERSION, buildInquisitorInput } from "@/lib/codex/prompts/inquisitor";
import type { AgentMeta } from "@/lib/contracts";
import { InquisitorOutput, type InquisitorInput } from "../schema";
import { mockQuestion } from "../lib/mockQuestion";
import { validateQuestion } from "../lib/validateQuestion";
export async function askInquisitor(input: InquisitorInput) {
  const started = Date.now();
  let meta: AgentMeta = { role: "inquisitor", model: "unavailable", promptVersion: INQUISITOR_VERSION, latencyMs: 0, attempts: 0, mock: process.env.CODEX_MOCK === "1" };
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await callStructured({ role: "inquisitor", promptVersion: INQUISITOR_VERSION, system: INQUISITOR_SYSTEM(input.locale),
        input: buildInquisitorInput({ mode: input.mode, brief: input.challenge.brief, defectType: input.challenge.defectType, rubricHints: input.challenge.rubricHints,
          starterCode: input.starterCode, currentCode: input.currentCode, recentQA: input.recentQA, defenceIndex: input.defenceIndex }),
        schema: InquisitorOutput, schemaName: "inquisitor_question", timeoutMs: 12_000, retries: 0, mockFixture: mockQuestion(input) });
      meta = { ...response.meta, attempts: attempt, latencyMs: Date.now() - started };
      if (response.data.skip && input.mode === "nudge") return { result: null, skippedReason: "model_skip" as const, meta };
      if (!response.data.skip && validateQuestion(response.data, input.currentCode, input.recentQA).length === 0) return { result: response.data, skippedReason: null, meta };
    } catch { console.error("Inquisitor attempt unavailable"); }
    meta = { ...meta, attempts: attempt, latencyMs: Date.now() - started };
  }
  return { result: null, skippedReason: "validation_failed" as const, meta };
}
