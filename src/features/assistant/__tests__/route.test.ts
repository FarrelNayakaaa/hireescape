import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { signToken } from "@/lib/assessment-token";
import { POST } from "@/app/api/assistant/route";
import { input } from "./fixtures";
const signed = (aiAssistance = true, assessmentId = input.assessmentId) => signToken({ assessmentId, aiAssistance, exp: Date.now() / 1000 + 3600 });
const request = (body: unknown, token: string) => new Request("http://localhost/api/assistant", { method: "POST", headers: { "content-type": "application/json", "x-assessment-token": token }, body: JSON.stringify(body) });
beforeEach(() => { vi.stubEnv("CODEX_MOCK", "1"); vi.stubEnv("ASSESSMENT_SECRET", "assistant-test-secret"); vi.stubEnv("OPENAI_API_KEY", undefined); });
afterEach(() => vi.unstubAllEnvs());
it("enforces the AI-off token before parsing the body", async () => {
  const response = await POST(request({}, signed(false)));
  expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ error: { code: "ai_disabled" } });
});
it("rejects tampering and tokens issued for a different assessment", async () => {
  const [body, signature] = signed(false).split(".");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()); payload.aiAssistance = true;
  const tampered = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;
  expect((await POST(request(input, tampered))).status).toBe(403);
  expect((await POST(request(input, signed(true, "different-assessment")))).status).toBe(403);
});
it.each([1, 3])("rejects room %s even with a valid AI-on token", async (room) => expect((await POST(request({ ...input, room }, signed()))).status).toBe(400));
it("rejects invalid/malformed bodies and forbidden sources", async () => {
  for (const body of [{}, { ...input, prompt: "x".repeat(2001) }, { ...input, hiddenTests: "private" }, { ...input, integrity: {} }]) expect((await POST(request(body, signed()))).status).toBe(400);
  expect((await POST(new Request("http://localhost/api/assistant", { method: "POST", headers: { "x-assessment-token": signed() }, body: "bad json" }))).status).toBe(400);
});
it("returns a mock suggestion for the explicit demo fix and a message for a why-question", async () => {
  const fixed = await POST(request(input, signed())); expect(fixed.status).toBe(200);
  const reply = await fixed.json(); expect(reply.suggestion.code).toContain("module.exports"); expect(reply.meta).toMatchObject({ role: "assistant", mock: true });
  const explanation = await POST(request({ ...input, prompt: "why does getProduct fail when the cache times out?" }, signed()));
  expect((await explanation.json()).suggestion).toBeNull();
});
