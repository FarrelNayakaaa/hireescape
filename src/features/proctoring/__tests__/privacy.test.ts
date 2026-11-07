import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildAssistantInput } from "@/lib/codex/prompts/assistant";
import { buildInquisitorInput } from "@/lib/codex/prompts/inquisitor";
import { buildSaboteurInput } from "@/lib/codex/prompts/saboteur";
import { buildAnalystInput } from "@/lib/codex/prompts/analyst";
import type { ObjectiveMetrics } from "@/lib/contracts";
it("never imports integrity into session recording and excludes it from all four agent builders", () => {
 const sessionSource = readFileSync("src/features/session/store.ts", "utf8"); expect(sessionSource).not.toContain("proctoring"); expect(sessionSource).not.toContain("integrity");
 const integrity = { camera: "PRIVATE_INTEGRITY_SENTINEL", signals: ["face_absent"] };
 const common = { integrity, level: "mid", defectType: "cache_no_fallback", domainHint: null, previousFailures: [], brief: "incident", rubricHints: [], starterCode: "module.exports = {};", currentCode: "module.exports = {};", finalCode: "module.exports = {};", visibleTests: "tests", lastRun: null, history: [], prompt: "why", mode: "nudge" as const, recentQA: [], defenceIndex: null, aiAssistance: true, referenceFix: "test fix", timeline: "session events only", suggestions: [] };
 const objective: ObjectiveMetrics = { hiddenPassed: 0, hiddenTotal: 0, testRuns: 0, timeToFixSec: null, roomTimesSec: { 1: null, 2: null, 3: null }, changedLines: 0, aiLineShare: null, aiEditedShare: null, pasteCount: 0, assistantPrompts: 0, diffViewsBeforeApply: 0, testRunsAfterApply: 0 };
 for (const output of [buildAssistantInput(common), buildInquisitorInput(common), buildSaboteurInput(common), buildAnalystInput({ ...common, objective })]) expect(output).not.toContain("PRIVATE_INTEGRITY_SENTINEL");
});
