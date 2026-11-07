import { expect, it } from "vitest";
import { validateSuggestion } from "../lib/validateSuggestion";
it("drops missing exports and byte-overlong code without dropping the explanation", () => {
  const message = "Explanation remains available";
  for (const code of ["return service;", "module.exports = {};" + "é".repeat(10_000)]) expect(validateSuggestion({ message, suggestion: { summary: "fix", code } })).toEqual({ message, suggestion: null });
  const valid = { message, suggestion: { summary: "fix", code: "module.exports = service;" } };
  expect(validateSuggestion(valid)).toEqual(valid);
});
