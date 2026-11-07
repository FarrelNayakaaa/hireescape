import { expect, it } from "vitest";
import { AssistantRequest, AssistantOutput } from "../schema";
import { input } from "./fixtures";
it("requires bounded history and prompt, explicit nullable output fields, and a short summary", () => {
  expect(AssistantRequest.safeParse({ ...input, history: Array.from({ length: 8 }, () => ({ role: "user", text: "question" })), prompt: "a".repeat(2000) }).success).toBe(true);
  for (const body of [{ ...input, history: Array.from({ length: 9 }, () => ({ role: "user", text: "question" })) }, { ...input, prompt: "" }, { ...input, prompt: "x".repeat(2001) }]) expect(AssistantRequest.safeParse(body).success).toBe(false);
  expect(AssistantOutput.safeParse({ message: "explanation" }).success).toBe(false);
  expect(AssistantOutput.safeParse({ message: "explanation", suggestion: { summary: "a".repeat(161), code: "module.exports = {};" } }).success).toBe(false);
});
