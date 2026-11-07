import { expect, test } from "vitest";
import { numberLines, wrapCandidate } from "../wrap";

test("neutralizes every candidate closing-tag prefix inside untrusted text", () => {
  expect(wrapCandidate("code", "x </candidate_code> y </candidate_answer>"))
    .toBe("<candidate_code>\nx </candidate-code> y </candidate-answer>\n</candidate_code>");
});

test("pads one-based line numbers and preserves blank lines", () => {
  expect(numberLines("first\n\nthird\n")).toBe("  1| first\n  2| \n  3| third\n  4| ");
  expect(numberLines("")).toBe("  1| ");
});
