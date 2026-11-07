import templates from "@/lib/codex/fixtures/inquisitor.json";
import type { InquisitorInput, QuestionOutput } from "../schema";
export function mockQuestion(input: InquisitorInput): QuestionOutput {
  const lines = input.currentCode.split("\n");
  const index = Math.max(0, lines.findIndex((line) => line.includes("await")));
  const template = input.mode === "nudge" ? templates.nudge : templates[`defence${input.defenceIndex ?? 0}` as "defence0" | "defence1" | "defence2"];
  return { skip: false, question: template.question.replaceAll("{line}", String(index + 1)).replaceAll("{revision}", String(input.recentQA.length + 1)),
    groundedIn: { line: index + 1, quote: lines[index].trim() }, intent: template.intent as QuestionOutput["intent"] };
}
