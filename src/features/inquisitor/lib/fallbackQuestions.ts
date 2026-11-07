import type { QuestionOutput } from "../schema";
export const fallbackQuestions = [
  "What could happen if the dependency on this line remains unavailable under load?",
  "Which signal would help distinguish a dependency failure here from invalid input?",
  "What trade-off does this choice introduce when traffic grows?",
] as const;
export function fallbackQuestion(code: string, index: number): QuestionOutput {
  const lines = code.split("\n");
  const line = Math.max(0, lines.findIndex((text) => text.trim().length >= 8));
  return { skip: false, question: fallbackQuestions[index as 0 | 1 | 2], groundedIn: { line: line + 1, quote: lines[line].trim() }, intent: (["failure_mode", "observability", "tradeoff"] as const)[index as 0 | 1 | 2] };
}
