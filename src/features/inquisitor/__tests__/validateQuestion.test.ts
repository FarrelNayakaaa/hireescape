import { describe, expect, it } from "vitest";
import { validateQuestion } from "../lib/validateQuestion";
import { mockQuestion } from "../lib/mockQuestion";
import { input } from "./fixtures";
const output = mockQuestion(input);
describe("all five independent post-validation rules", () => {
  it.each(["R1", "R2", "R3", "R4", "R5"])("allows grounded, answer-free output for %s", (rule) => expect(validateQuestion(output, input.currentCode, [])).not.toContain(rule));
  it("R1 rejects a quote on the wrong line and short invented quotes", () => {
    expect(validateQuestion({ ...output, groundedIn: { ...output.groundedIn, line: 1 } }, input.currentCode, [])).toContain("R1");
    expect(validateQuestion({ ...output, groundedIn: { line: 1, quote: "short" } }, input.currentCode, [])).toContain("R1");
    expect(validateQuestion(output, input.currentCode.replace(output.groundedIn.quote, output.groundedIn.quote.replace(/ /g, "  ")), [])).not.toContain("R1");
    expect(validateQuestion({ ...output, groundedIn: { ...output.groundedIn, line: output.groundedIn.line + 1 } }, input.currentCode, [])).not.toContain("R1");
  });
  it("R2 rejects two questions and overlong questions", () => {
    for (const question of ["Why? How?", "x".repeat(240) + "?"]) expect(validateQuestion({ ...output, question }, input.currentCode, [])).toContain("R2");
  });
  it("R3 rejects fences, long inline code, and code-like lines", () => {
    for (const question of ["Why?\n```js\ncode\n```", `Why \`${"a".repeat(41)}\`?`, "function run() {\nWhy?"]) expect(validateQuestion({ ...output, question }, input.currentCode, [])).toContain("R3");
  });
  it("R4 rejects advice and verdict phrases", () => {
    for (const question of ["You should wrap this call, right?", "Try adding a catch?", "The fix is a fallback?", "Would you recommend hiring?"]) expect(validateQuestion({ ...output, question }, input.currentCode, [])).toContain("R4");
  });
  it("R5 detects matching first eight words despite punctuation and case", () => {
    expect(validateQuestion(output, input.currentCode, [{ q: output.question.toUpperCase().replaceAll(" ", "  ") }])).toContain("R5");
    expect(validateQuestion(output, input.currentCode, [{ q: "How would on-call observe this dependency during an outage?" }])).not.toContain("R5");
  });
});
