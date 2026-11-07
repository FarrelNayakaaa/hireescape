import { expect, test } from "vitest";
import { z } from "zod";
import { CodexError } from "@/lib/codex/client";
import { jsonError, toErrorResponse } from "../http";

test.each([
  ["timeout", 504], ["upstream", 502], ["parse", 502], ["config", 500],
] as const)("maps %s to %i without exposing exception details", async (code, status) => {
  const error = new CodexError(code, "private candidate text and upstream credentials");
  error.stack = "private stack trace";
  const response = toErrorResponse(error);
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body).toMatchObject({ error: { code, message: expect.any(String) } });
  expect(JSON.stringify(body)).not.toMatch(/private|stack|credentials/);
});

test("maps Zod input errors and unknown failures to safe envelopes", async () => {
  const invalid = z.literal("valid").safeParse("private input");
  if (invalid.success) throw new Error("Expected validation failure");
  const invalidResponse = toErrorResponse(invalid.error);
  expect(invalidResponse.status).toBe(400);
  expect(await invalidResponse.json()).toEqual({ error: { code: "bad_request", message: "Invalid request." } });
  const unknown = toErrorResponse(new Error("private request data"));
  expect(unknown.status).toBe(500);
  expect(await unknown.json()).toEqual({ error: { code: "internal", message: "Internal server error." } });
});

test("jsonError preserves its explicit safe status and message", async () => {
  const response = jsonError(403, "ai_disabled", "AI assistance is disabled.");
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: { code: "ai_disabled", message: "AI assistance is disabled." } });
});
