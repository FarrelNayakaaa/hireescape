import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { AgentMeta, CodexRole } from "@/lib/contracts";
import { CodexError, modelFor } from "./models";

export { CodexError } from "./models";
export { wrapCandidate, numberLines } from "./wrap";

let sdk: OpenAI | undefined;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new CodexError("config", "OPENAI_API_KEY is not set");
  // The wrapper owns retries and timeouts, including retries: 0 health checks.
  sdk ??= new OpenAI({ apiKey, maxRetries: 0 });
  return sdk;
}

function classifyError(error: unknown, aborted: boolean): CodexError {
  if (error instanceof CodexError) return error;
  if (
    aborted || error instanceof OpenAI.APIUserAbortError ||
    error instanceof OpenAI.APIConnectionTimeoutError ||
    (error instanceof Error && error.name === "AbortError")
  ) {
    return new CodexError("timeout", "The model request timed out.");
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    return new CodexError("parse", "The model response could not be validated.");
  }
  return new CodexError("upstream", "The model request failed.");
}

export async function callStructured<S extends z.ZodType>(opts: {
  role: CodexRole;
  promptVersion: string;
  system: string;
  input: string;
  schema: S;
  schemaName: string;
  timeoutMs: number;
  retries?: number;
  mockFixture?: unknown;
}): Promise<{ data: z.output<S>; meta: AgentMeta }> {
  const started = Date.now();
  let model = "unconfigured";
  let attempts = 0;
  try {
    const retries = opts.retries ?? 1;
    if (!Number.isInteger(retries) || retries < 0 || !Number.isFinite(opts.timeoutMs) || opts.timeoutMs <= 0) {
      throw new CodexError("config", "Invalid retry or timeout configuration.");
    }
    if (process.env.CODEX_MOCK === "1") {
      model = "mock";
      attempts = 1;
      await new Promise<void>((resolve) => setTimeout(resolve, 600 + Math.floor(Math.random() * 601)));
      const parsed = opts.schema.safeParse(opts.mockFixture);
      if (!parsed.success) throw new CodexError("parse", "The mock fixture could not be validated.");
      return {
        data: parsed.data,
        meta: {
          role: opts.role, model, promptVersion: opts.promptVersion,
          latencyMs: Date.now() - started, attempts, mock: true,
        },
      };
    }

    model = modelFor(opts.role);
    const client = getClient();
    let lastError: CodexError | undefined;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      attempts = attempt;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
      try {
        const response = await client.responses.parse({
          model,
          instructions: opts.system,
          input: opts.input,
          text: { format: zodTextFormat(opts.schema, opts.schemaName) },
        }, { signal: controller.signal });
        if (response.output_parsed == null) throw new CodexError("parse", "Empty structured output.");
        return {
          // The SDK validates with this schema, but its structural generic does not reduce to z.output<S>.
          data: response.output_parsed as z.output<S>,
          meta: {
            role: opts.role, model, promptVersion: opts.promptVersion,
            latencyMs: Date.now() - started, attempts, mock: false,
            ...(response.usage ? {
              usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
            } : {}),
          },
        };
      } catch (error) {
        lastError = classifyError(error, controller.signal.aborted);
        if (lastError.code === "config") throw lastError;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError ?? new CodexError("upstream", "The model request failed.");
  } finally {
    console.info(`[codex] ${opts.role} ${model} ${Date.now() - started}ms attempt=${attempts}`);
  }
}
