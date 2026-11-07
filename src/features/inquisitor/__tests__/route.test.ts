import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { signToken } from "@/lib/assessment-token";
import { POST } from "@/app/api/inquisitor/route";
import { input } from "./fixtures";
const request = (body: unknown, token = "invalid") => new Request("http://localhost/api/inquisitor", { method: "POST", headers: { "content-type": "application/json", "x-assessment-token": token }, body: JSON.stringify(body) });
const token = (assessmentId = input.assessmentId) => signToken({ assessmentId, aiAssistance: false, exp: Date.now() / 1000 + 3600 });
beforeEach(() => { vi.stubEnv("ASSESSMENT_SECRET", "inquisitor-test-secret"); vi.stubEnv("CODEX_MOCK", "1"); });
afterEach(() => vi.unstubAllEnvs());
it("rejects bad tokens, mismatched assessments, malformed JSON and bodies", async () => {
  expect((await POST(request(input))).status).toBe(403);
  expect((await POST(request(input, token("other")))).status).toBe(403);
  expect((await POST(request({}, token()))).status).toBe(400);
  expect((await POST(new Request("http://localhost/api/inquisitor", { method: "POST", headers: { "x-assessment-token": token() }, body: "invalid json" }))).status).toBe(400);
});
it("mock result quotes the real request line without needing an API key or AI toggle", async () => {
  vi.stubEnv("OPENAI_API_KEY", undefined);
  const response = await POST(request(input, token()));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(input.currentCode.split("\n")[body.result.groundedIn.line - 1]).toContain(body.result.groundedIn.quote);
  expect(body.meta).toMatchObject({ role: "inquisitor", mock: true });
});
