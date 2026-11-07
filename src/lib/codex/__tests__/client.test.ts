import OpenAI from "openai";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";

const schema = z.object({ ok: z.boolean() });
const options = {
  role: "analyst" as const, promptVersion: "test@1", system: "private instructions",
  input: "private candidate text", schema, schemaName: "test", timeoutMs: 1000,
};
const fetchMock = vi.fn<typeof fetch>();

function sdkResponse(content = '{"ok":true}', empty = false): Response {
  return Response.json({
    id: "test-response", object: "response", created_at: 0, status: "completed",
    output: empty ? [] : [{
      id: "test-message", type: "message", role: "assistant", status: "completed",
      content: [{ type: "output_text", text: content, annotations: [] }],
    }],
    usage: { input_tokens: 7, output_tokens: 3, total_tokens: 10 },
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubEnv("CODEX_MOCK", "0");
  vi.stubEnv("OPENAI_API_KEY", "local-test-key");
  vi.stubEnv("OPENAI_MODEL", "strong-test-model");
  vi.stubEnv("OPENAI_MODEL_FAST", "fast-test-model");
  vi.stubEnv("OPENAI_BASE_URL", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(Math, "random").mockReturnValue(0);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("mock mode validates fixtures without a key or model and includes simulated latency", async () => {
  vi.stubEnv("CODEX_MOCK", "1");
  vi.stubEnv("OPENAI_API_KEY", undefined);
  vi.stubEnv("OPENAI_MODEL", undefined);
  const { callStructured } = await import("../client");
  let completed = false;
  const pending = callStructured({ ...options, mockFixture: { ok: true, extra: "stripped" } })
    .then((result) => { completed = true; return result; });
  await vi.advanceTimersByTimeAsync(599);
  expect(completed).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  const result = await pending;
  expect(result.data).toEqual({ ok: true });
  expect(result.meta).toMatchObject({ role: "analyst", model: "mock", mock: true, attempts: 1, promptVersion: "test@1" });
  expect(result.meta.latencyMs).toBeGreaterThanOrEqual(500);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(console.info).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(options.input);
});

test("invalid mock fixtures throw a parse error", async () => {
  vi.stubEnv("CODEX_MOCK", "1");
  const { callStructured } = await import("../client");
  const assertion = expect(callStructured({ ...options, mockFixture: { ok: "invalid" } }))
    .rejects.toMatchObject({ name: "CodexError", code: "parse" });
  await vi.advanceTimersByTimeAsync(600);
  await assertion;
});

test("uses the installed SDK parser, forwards the format, and records usage", async () => {
  fetchMock.mockResolvedValue(sdkResponse());
  const { callStructured } = await import("../client");
  const result = await callStructured(options);
  expect(result.data).toEqual({ ok: true });
  expect(result.meta).toMatchObject({ model: "strong-test-model", mock: false, attempts: 1, usage: { inputTokens: 7, outputTokens: 3 } });
  const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(request).toMatchObject({ model: "strong-test-model", instructions: options.system, input: options.input, text: { format: { type: "json_schema", name: "test", strict: true } } });
  expect(vi.getTimerCount()).toBe(0);
});

test("retries: 0 makes one transport attempt even for retryable HTTP failures", async () => {
  fetchMock.mockImplementation(async () => Response.json({ error: { message: "private upstream content" } }, { status: 500 }));
  const { callStructured } = await import("../client");
  const assertion = expect(callStructured({ ...options, retries: 0 })).rejects.toMatchObject({ code: "upstream" });
  await vi.runAllTimersAsync();
  await assertion;
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(console.info).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("private upstream content");
});

test("the default retry succeeds on its second attempt with a fresh signal", async () => {
  fetchMock.mockRejectedValueOnce(new Error("connection failed")).mockResolvedValueOnce(sdkResponse());
  const { callStructured } = await import("../client");
  const result = await callStructured(options);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.meta.attempts).toBe(2);
  expect(fetchMock.mock.calls[0][1]?.signal).not.toBe(fetchMock.mock.calls[1][1]?.signal);
  expect(console.info).toHaveBeenCalledTimes(1);
});

test.each(['{"ok":"invalid"}', 'not json'])("invalid live output becomes a parse error (%s)", async (content) => {
  fetchMock.mockResolvedValue(sdkResponse(content));
  const { callStructured } = await import("../client");
  await expect(callStructured({ ...options, retries: 0 })).rejects.toMatchObject({ code: "parse" });
});

test("empty parsed output is retried only up to the configured limit", async () => {
  fetchMock.mockImplementation(async () => sdkResponse("", true));
  const { callStructured } = await import("../client");
  await expect(callStructured({ ...options, retries: 1 })).rejects.toMatchObject({ code: "parse" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});

test("aborts a hanging request and clears its timeout", async () => {
  fetchMock.mockImplementation((_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
  }));
  const { callStructured } = await import("../client");
  const assertion = expect(callStructured({ ...options, retries: 0 })).rejects.toMatchObject({ code: "timeout" });
  await vi.advanceTimersByTimeAsync(1000);
  await assertion;
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

test("recognizes SDK timeout errors whose name is only Error", async () => {
  fetchMock.mockRejectedValue(new OpenAI.APIConnectionTimeoutError());
  const { callStructured } = await import("../client");
  await expect(callStructured({ ...options, retries: 0 })).rejects.toMatchObject({ code: "timeout" });
});

test("missing credentials fail as configuration without transport attempts", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const { callStructured } = await import("../client");
  await expect(callStructured(options)).rejects.toMatchObject({ code: "config" });
  expect(fetchMock).not.toHaveBeenCalled();
});
