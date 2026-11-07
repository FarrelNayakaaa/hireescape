import type { AssistantReply } from "../schema";
export function validateSuggestion(output: AssistantReply): AssistantReply {
  const code = output.suggestion?.code;
  if (code !== undefined && (!/module\.exports\s*=/.test(code) || new TextEncoder().encode(code).byteLength > 20_000)) return { ...output, suggestion: null };
  return output;
}
