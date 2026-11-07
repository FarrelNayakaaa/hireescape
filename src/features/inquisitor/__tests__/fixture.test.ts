import { expect, it } from "vitest";
import templates from "@/lib/codex/fixtures/inquisitor.json";
import { InquisitorOutput } from "../schema";
import { mockQuestion } from "../lib/mockQuestion";
import { fallbackQuestion } from "../lib/fallbackQuestions";
import { validateQuestion } from "../lib/validateQuestion";
import { input } from "./fixtures";
it("parses all four templates, fills line/quote per request, and has distinct defence focuses", () => {
  expect(Object.keys(templates)).toHaveLength(4);
  for (const template of Object.values(templates)) {
    expect(template.groundedIn).toEqual({ line: "{line}", quote: "{quote}" });
    expect(InquisitorOutput.safeParse({ ...template, question: template.question.replaceAll("{line}", "1").replaceAll("{revision}", "1"), groundedIn: { line: 1, quote: "module.exports = service;" } }).success).toBe(true);
  }
  const history: { q: string; a: string | null }[] = [];
  for (const defenceIndex of [0, 1, 2]) {
    const result = mockQuestion({ ...input, mode: "defence", defenceIndex, recentQA: history });
    expect(validateQuestion(result, input.currentCode, history)).toEqual([]);
    expect(result.intent).toBe(["failure_mode", "observability", "tradeoff"][defenceIndex]);
    history.push({ q: result.question, a: "An answer grounded in my code." });
    expect(validateQuestion(fallbackQuestion(input.currentCode, defenceIndex), input.currentCode, [])).toEqual([]);
  }
  const changed = "module.exports = async () => {\n  const item = await service.load();\n};";
  expect(mockQuestion({ ...input, currentCode: changed }).groundedIn).toEqual({ line: 2, quote: "const item = await service.load();" });
  expect(mockQuestion({ ...input, currentCode: "module.exports = service;" }).groundedIn.line).toBe(1);
});
