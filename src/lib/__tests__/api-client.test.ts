// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { AgentMeta } from "@/lib/contracts";
import { useAgentConsole } from "@/lib/codex/agentConsole";
import { ApiError, postAgent } from "../api-client";

const meta: AgentMeta = {
  role: "assistant", model: "mock", promptVersion: "test@1", latencyMs: 700, attempts: 1, mock: true,
};
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  useAgentConsole.getState().clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

test("posts JSON with headers and signal and automatically records valid metadata", async () => {
  const payload = { message: "fixture reply", meta };
  fetchMock.mockResolvedValue(Response.json(payload));
  const controller = new AbortController();
  const result = await postAgent<typeof payload>("/api/assistant", { prompt: "fixture prompt" }, {
    headers: { "x-assessment-token": "fixture-token" }, signal: controller.signal,
  });
  expect(result).toEqual(payload);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/assistant");
  expect(init?.method).toBe("POST");
  expect(init?.body).toBe('{"prompt":"fixture prompt"}');
  expect(init?.signal).toBe(controller.signal);
  const headers = new Headers(init?.headers);
  expect(headers.get("content-type")).toBe("application/json");
  expect(headers.get("x-assessment-token")).toBe("fixture-token");
  expect(useAgentConsole.getState().entries).toEqual([meta]);
});

test("success without metadata preserves feature fields without pushing an entry", async () => {
  fetchMock.mockResolvedValue(Response.json({ ok: true }));
  expect(await postAgent("/api/test", {})).toEqual({ ok: true });
  expect(useAgentConsole.getState().entries).toEqual([]);
});

test("non-2xx envelopes become ApiError with the server code", async () => {
  fetchMock.mockResolvedValue(Response.json({ error: { code: "ai_disabled", message: "AI assistance is disabled." } }, { status: 403 }));
  const error = await postAgent("/api/assistant", {}).catch((value: unknown) => value);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 403, code: "ai_disabled", message: "AI assistance is disabled." });
});

test.each(["html", "invalid-envelope"])("non-2xx %s responses have a safe fallback", async (kind) => {
  fetchMock.mockResolvedValue(kind === "html" ? new Response("<html>private proxy body</html>", { status: 502 }) : Response.json({ private: "proxy data" }, { status: 502 }));
  const error = await postAgent("/api/assistant", {}).catch((value: unknown) => value);
  expect(error).toMatchObject({ status: 502, code: "http_error" });
  expect(String(error)).not.toContain("private");
});

test.each(["invalid-json", "invalid-meta", "null"])("rejects successful but malformed %s responses", async (kind) => {
  fetchMock.mockResolvedValue(kind === "invalid-json" ? new Response("not json") : Response.json(kind === "null" ? null : { meta: { ...meta, attempts: "one" } }));
  await expect(postAgent("/api/assistant", {})).rejects.toMatchObject({ status: 200, code: "invalid_response" });
  expect(useAgentConsole.getState().entries).toEqual([]);
});

test("preserves fetch cancellation errors", async () => {
  const controller = new AbortController();
  const abort = new DOMException("cancelled", "AbortError");
  controller.abort();
  fetchMock.mockRejectedValue(abort);
  await expect(postAgent("/api/assistant", {}, { signal: controller.signal })).rejects.toBe(abort);
});
