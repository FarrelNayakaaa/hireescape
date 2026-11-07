import fixture from "@/lib/codex/fixtures/assistant.json";
import type { AssistantInput, AssistantReply } from "../schema";
export function mockReply(input: AssistantInput): AssistantReply {
  const requestsFix = /\b(fix|repair|correct|implement|update|perbaiki|betulkan)\b/i.test(input.prompt);
  return input.currentCode.includes("createProductService") && requestsFix ? fixture.demoFix : fixture.messageOnly;
}
