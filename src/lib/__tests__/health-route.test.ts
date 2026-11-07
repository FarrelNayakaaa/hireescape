import { beforeEach, expect, test, vi } from "vitest";
import type { AgentMeta } from "@/lib/contracts";
import { callStructured, CodexError } from "@/lib/codex/client";
import { GET } from "@/app/api/health/codex/route";

vi.mock("@/lib/codex/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/codex/client")>();
  return { ...actual, callStructured: vi.fn() };
});

const meta: AgentMeta = {
  role: "analyst", model: "strong-test-model", promptVersion: "health@1", latencyMs: 10, attempts: 1, mock: false,
};
const result = { data: { ok: true }, meta };

beforeEach(() => { vi.mocked(callStructured).mockReset(); });

test("starts both model checks before waiting for either and returns their telemetry", async () => {
  let finishStrong: (value: typeof result) => void = () => { throw new Error("Not initialized"); };
  const strong = new Promise<typeof result>((resolve) => { finishStrong = resolve; });
  vi.mocked(callStructured).mockReturnValueOnce(strong).mockResolvedValueOnce({
    data: { ok: true }, meta: { ...meta, role: "inquisitor", model: "fast-test-model" },
  });
  const pending = GET();
  expect(callStructured).toHaveBeenCalledTimes(2);
  const calls = vi.mocked(callStructured).mock.calls;
  expect(calls[0][0]).toMatchObject({ role: "analyst", timeoutMs: 10_000, retries: 0, mockFixture: { ok: true } });
  expect(calls[1][0]).toMatchObject({ role: "inquisitor", timeoutMs: 10_000, retries: 0 });
  finishStrong(result);
  const response = await pending;
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, strong: meta, fast: { ...meta, role: "inquisitor", model: "fast-test-model" } });
});

test.each(["timeout", "upstream", "parse", "config"] as const)("returns sanitized 503 for %s failures", async (code) => {
  vi.mocked(callStructured).mockRejectedValue(new CodexError(code, "private candidate text and credentials"));
  const response = await GET();
  expect(response.status).toBe(503);
  const body = await response.json();
  expect(body).toMatchObject({ ok: false, error: { code, message: expect.any(String) } });
  expect(JSON.stringify(body)).not.toMatch(/private|credentials|stack/);
});

test("does not mark a negative readiness result healthy", async () => {
  vi.mocked(callStructured).mockResolvedValue({ data: { ok: false }, meta });
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ ok: false, error: { code: "parse" } });
});

test("sanitizes unknown health failures", async () => {
  vi.mocked(callStructured).mockRejectedValue(new Error("private failure"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ ok: false, error: { code: "internal", message: "Internal server error." } });
});
