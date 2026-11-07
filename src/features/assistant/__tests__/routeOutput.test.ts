import { afterEach, expect, it, vi } from "vitest";
import { signToken } from "@/lib/assessment-token";
import { callStructured } from "@/lib/codex/client";
import { POST } from "@/app/api/assistant/route";
import { input } from "./fixtures";
vi.mock("@/lib/codex/client", () => ({ callStructured: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("the real route drops a model suggestion with missing exports while retaining message and metadata", async () => {
  vi.stubEnv("ASSESSMENT_SECRET", "assistant-output-test");
  vi.mocked(callStructured).mockResolvedValue({ data: { message: "Still useful explanation", suggestion: { summary: "invalid", code: "return factory;" } }, meta: { role: "assistant", model: "stub", promptVersion: "assistant@1", latencyMs: 1, attempts: 1, mock: true } });
  const token = signToken({ assessmentId: input.assessmentId, aiAssistance: true, exp: Date.now() / 1000 + 3600 });
  const response = await POST(new Request("http://localhost/api/assistant", { method: "POST", headers: { "x-assessment-token": token, "content-type": "application/json" }, body: JSON.stringify(input) }));
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ message: "Still useful explanation", suggestion: null, meta: { role: "assistant" } });
});
