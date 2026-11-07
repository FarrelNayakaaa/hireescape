import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { POST } from "@/app/api/assessment/token/route";
import { verifyToken } from "../assessment-token";

const valid = { assessmentId: "a1", aiAssistance: true, durationMin: 45 };
const request = (body: unknown) => new Request("http://localhost/api/assessment/token", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.stubEnv("ASSESSMENT_SECRET", "test-only-route-secret");
  vi.stubEnv("NODE_ENV", "test");
  vi.useFakeTimers();
  vi.setSystemTime(2_000_000_000_000);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

test.each([10, 45, 120])("signs a token with the requested %i-minute duration plus 30 minutes", async (durationMin) => {
  const response = await POST(request({ ...valid, durationMin }));
  expect(response.status).toBe(200);
  const body: { token: string } = await response.json();
  expect(verifyToken(body.token)).toEqual({
    assessmentId: "a1", aiAssistance: true, exp: 2_000_000_000 + (durationMin + 30) * 60,
  });
});

test.each([
  { ...valid, durationMin: 9 }, { ...valid, durationMin: 121 },
  { ...valid, durationMin: "45" }, { ...valid, aiAssistance: "true" },
  { ...valid, assessmentId: "" }, { ...valid, assessmentId: "   " }, null, {},
])("rejects invalid token request bodies without exposing the input", async (body) => {
  const response = await POST(request(body));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: { code: "bad_request", message: "Invalid assessment token request." } });
});

test("returns 400 for malformed JSON", async () => {
  const response = await POST(new Request("http://localhost/api/assessment/token", { method: "POST", body: "{invalid" }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: { code: "bad_request", message: "Invalid JSON request." } });
});

test("reports missing production signing configuration safely", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ASSESSMENT_SECRET", "");
  const response = await POST(request(valid));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: { code: "config", message: "The service is not configured." } });
});
