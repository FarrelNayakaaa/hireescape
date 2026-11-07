import { expect, it } from "vitest";
import fixture from "@/lib/codex/fixtures/assistant.json";
import { AssistantOutput } from "../schema";
import { mockReply } from "../lib/mockReply";
import { runSuite } from "@/features/runner";
import { challenge, input } from "./fixtures";
it("parses both fixtures and only gives the demo fix on an explicit fix request", () => {
  for (const output of Object.values(fixture)) expect(AssistantOutput.safeParse(output).success).toBe(true);
  expect(mockReply(input).suggestion).not.toBeNull();
  expect(mockReply({ ...input, prompt: "why does getProduct fail when the cache times out?" }).suggestion).toBeNull();
  expect(mockReply({ ...input, currentCode: "module.exports = otherFactory;" }).suggestion).toBeNull();
});
it("executes the generated demo full-file suggestion through all real seeded tests", async () => {
  for (const target of ["visible", "hidden"] as const) {
    const result = await runSuite({ code: fixture.demoFix.suggestion.code, testsSource: target === "visible" ? challenge.visibleTests : challenge.hiddenTests, target });
    expect(result.failed).toBe(0); expect(result.passed).toBe(target === "hidden" ? 6 : 2);
  }
});
