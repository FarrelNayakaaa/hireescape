import fixture from "@/lib/codex/fixtures/assistant.json";
import type { AssistantInput, AssistantReply } from "../schema";
export function mockReply(input: AssistantInput): AssistantReply {
  const requestsFix = /\b(fix|repair|correct|implement|update|perbaiki|betulkan)\b/i.test(input.prompt);
  const reply = input.currentCode.includes("createProductService") && requestsFix ? fixture.demoFix : fixture.messageOnly;
  return { message: input.locale === "id" ? reply.messageId : reply.message, suggestion: reply.suggestion ? {
    code: reply.suggestion.code, summary: input.locale === "id" ? reply.suggestion.summaryId : reply.suggestion.summary,
  } : null };
}
