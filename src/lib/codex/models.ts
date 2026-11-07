import "server-only";
import type { CodexRole } from "@/lib/contracts";

export class CodexError extends Error {
  constructor(
    public readonly code: "timeout" | "upstream" | "parse" | "config",
    message: string,
  ) {
    super(message);
    this.name = "CodexError";
  }
}

export function modelFor(role: CodexRole): string {
  const strong = process.env.OPENAI_MODEL?.trim() || undefined;
  const fast = process.env.OPENAI_MODEL_FAST?.trim() || undefined;
  const model = role === "saboteur" || role === "analyst" ? strong : fast ?? strong;
  if (!model) throw new CodexError("config", "OPENAI_MODEL is not set");
  return model;
}
