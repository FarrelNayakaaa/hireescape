import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("the real health handler succeeds in mock mode without credentials or models", async () => {
  vi.useFakeTimers();
  vi.stubEnv("CODEX_MOCK", "1");
  vi.stubEnv("OPENAI_API_KEY", undefined);
  vi.stubEnv("OPENAI_MODEL", undefined);
  vi.stubEnv("OPENAI_MODEL_FAST", undefined);
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.spyOn(console, "info").mockImplementation(() => {});
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  const { GET } = await import("@/app/api/health/codex/route");
  const pending = GET();
  await vi.advanceTimersByTimeAsync(600);
  const response = await pending;
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    ok: true,
    strong: { role: "analyst", model: "mock", mock: true, attempts: 1, latencyMs: 600 },
    fast: { role: "inquisitor", model: "mock", mock: true, attempts: 1, latencyMs: 600 },
  });
  expect(fetchMock).not.toHaveBeenCalled();
});
