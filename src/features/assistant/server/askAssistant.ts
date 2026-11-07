import "server-only";
import { callStructured } from "@/lib/codex/client";
import { ASSISTANT_SYSTEM, ASSISTANT_VERSION, buildAssistantInput } from "@/lib/codex/prompts/assistant";
import { AssistantOutput, type AssistantInput } from "../schema";
import { mockReply } from "../lib/mockReply";
import { validateSuggestion } from "../lib/validateSuggestion";
export async function askAssistant(input: AssistantInput) {
  const { data, meta } = await callStructured({ role: "assistant", promptVersion: ASSISTANT_VERSION, system: ASSISTANT_SYSTEM(input.locale), input: buildAssistantInput(input),
    schema: AssistantOutput, schemaName: "assistant_reply", timeoutMs: 20_000, retries: 1, mockFixture: mockReply(input) });
  return { ...validateSuggestion(data), meta };
}
