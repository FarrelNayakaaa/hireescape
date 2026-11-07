// starter-kit/codex/client.ts → port to src/lib/codex/client.ts
// The ONLY place in the repo that calls the OpenAI API. Server-only.
import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

export type CodexRole = "saboteur" | "inquisitor" | "assistant" | "analyst";

// Telemetry returned to the UI with every agent response → powers the "Agent Console" and proves to
// judges that real Codex calls happen (role, model, latency, attempts, prompt version, mock or live).
export interface AgentMeta {
  role: CodexRole;
  model: string;
  promptVersion: string;
  latencyMs: number;
  attempts: number;
  mock: boolean;
  usage?: { inputTokens: number; outputTokens: number };
}

export class CodexError extends Error {
  constructor(public code: "timeout" | "upstream" | "parse" | "config", message: string) {
    super(message);
  }
}

const client = new OpenAI(); // reads OPENAI_API_KEY (and OPENAI_BASE_URL if the organisers give a gateway)

export function modelFor(role: CodexRole): string {
  const strong = process.env.OPENAI_MODEL;
  const fast = process.env.OPENAI_MODEL_FAST || strong;
  const model = role === "saboteur" || role === "analyst" ? strong : fast;
  if (!model) throw new CodexError("config", "OPENAI_MODEL is not set");
  return model;
}

export async function callStructured<S extends z.ZodTypeAny>(opts: {
  role: CodexRole;
  promptVersion: string;
  system: string;
  input: string;
  schema: S;
  schemaName: string;
  timeoutMs: number;
  retries?: number; // default 1; Saboteur + Analyst pass 0 (one serverless request must finish inside 60 s)
  mockFixture?: unknown; // used when CODEX_MOCK=1
}): Promise<{ data: z.infer<S>; meta: AgentMeta }> {
  const started = Date.now();

  if (process.env.CODEX_MOCK === "1") {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 600)); // feel like a real call in the UI
    return {
      data: opts.schema.parse(opts.mockFixture),
      meta: { role: opts.role, model: "mock", promptVersion: opts.promptVersion,
              latencyMs: Date.now() - started, attempts: 1, mock: true },
    };
  }

  const model = modelFor(opts.role);
  let lastErr: unknown;
  const maxAttempts = (opts.retries ?? 1) + 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
    try {
      const res = await client.responses.parse(
        {
          model,
          instructions: opts.system,
          input: opts.input,
          text: { format: zodTextFormat(opts.schema, opts.schemaName) },
        },
        { signal: ctrl.signal },
      );
      if (!res.output_parsed) throw new CodexError("parse", "Empty structured output");
      const meta: AgentMeta = {
        role: opts.role, model, promptVersion: opts.promptVersion,
        latencyMs: Date.now() - started, attempts: attempt, mock: false,
        usage: res.usage ? { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens } : undefined,
      };
      console.info(`[codex] ${opts.role} ${model} ${meta.latencyMs}ms attempt=${attempt}`);
      return { data: res.output_parsed, meta };
    } catch (err) {
      lastErr = err;
      console.warn(`[codex] ${opts.role} attempt ${attempt} failed: ${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  const msg = (lastErr as Error)?.message ?? "unknown";
  throw new CodexError((lastErr as Error)?.name === "AbortError" ? "timeout" : "upstream", msg);
}

// Wrap candidate-authored text so agents treat it as data, never as instructions.
export const wrapCandidate = (label: string, text: string) =>
  `<candidate_${label}>\n${text.replaceAll("</candidate_", "</candidate-")}\n</candidate_${label}>`;

export const numberLines = (code: string) =>
  code.split("\n").map((l, i) => `${String(i + 1).padStart(3, " ")}| ${l}`).join("\n");
