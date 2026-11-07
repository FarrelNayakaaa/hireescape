"use client";

import { z } from "zod";
import type { AgentMeta } from "@/lib/contracts";
import { useAgentConsole } from "@/lib/codex/agentConsole";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const metaSchema: z.ZodType<AgentMeta> = z.object({
  role: z.enum(["saboteur", "inquisitor", "assistant", "analyst"]),
  model: z.string(),
  promptVersion: z.string(),
  latencyMs: z.number(),
  attempts: z.number(),
  mock: z.boolean(),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }).optional(),
});
const errorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });
const responseSchema = z.object({ meta: metaSchema.optional() }).passthrough();

export async function postAgent<T extends { meta?: AgentMeta }>(
  url: string,
  body: unknown,
  opts?: { headers?: Record<string, string>; signal?: AbortSignal },
): Promise<T> {
  const headers = new Headers(opts?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    method: "POST", headers, body: JSON.stringify(body), signal: opts?.signal,
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (opts?.signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    throw new ApiError(response.status, response.ok ? "invalid_response" : "http_error", "Invalid server response.");
  }
  if (!response.ok) {
    const parsed = errorSchema.safeParse(payload);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error.code : "http_error",
      parsed.success ? parsed.data.error.message : "Request failed.",
    );
  }
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new ApiError(response.status, "invalid_response", "Invalid agent response.");
  if (parsed.data.meta) useAgentConsole.getState().push(parsed.data.meta);
  // Feature-specific success schemas belong to callers; this layer validates shared telemetry.
  return payload as T;
}
