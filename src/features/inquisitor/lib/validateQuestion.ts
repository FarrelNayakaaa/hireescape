import type { QuestionOutput } from "../schema";
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const prefix = (text: string) => normalize(text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "")).split(" ").slice(0, 8).join(" ");
export function validateQuestion(output: QuestionOutput, code: string, recentQA: { q: string }[]): string[] {
  const errors: string[] = [];
  const lines = code.split("\n");
  const quote = normalize(output.groundedIn.quote);
  const line = output.groundedIn.line;
  if (quote.length < 8 || line < 1 || line > lines.length || !lines.slice(Math.max(0, line - 2), line + 1).some((text) => normalize(text).includes(quote))) errors.push("R1");
  if (output.question.length > 240 || (output.question.match(/\?/g)?.length ?? 0) !== 1) errors.push("R2");
  if (/```|`[^`]{41,}`/.test(output.question) || /[;{}]\s*$/m.test(output.question)) errors.push("R3");
  if (/\b(you should|try (adding|using|wrapping)|the (fix|answer|bug) is|wrap .* in|hire|reject|recommend)\b/i.test(output.question)) errors.push("R4");
  if (recentQA.some((item) => prefix(item.q) === prefix(output.question))) errors.push("R5");
  return errors;
}
