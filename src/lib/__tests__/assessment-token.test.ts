import { createHmac } from "node:crypto";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const secret = "test-only-assessment-secret";
const payload = { assessmentId: "assessment-test", aiAssistance: true, exp: 2_000_000_060 };

function authenticatedRaw(text: string): string {
  const body = Buffer.from(text).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(2_000_000_000_000);
  vi.stubEnv("ASSESSMENT_SECRET", secret);
  vi.stubEnv("NODE_ENV", "test");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("signs and verifies a payload and reads the assessment header", async () => {
  const { signToken, verifyToken, getVerifiedToken } = await import("../assessment-token");
  const token = signToken(payload);
  expect(verifyToken(token)).toEqual(payload);
  expect(getVerifiedToken(new Request("http://localhost", { headers: { "x-assessment-token": token } }))).toEqual(payload);
  expect(getVerifiedToken(new Request("http://localhost"))).toBeNull();
  expect(getVerifiedToken(new Request("http://localhost", { headers: { "x-assessment-token": "garbage" } }))).toBeNull();
});

test("rejects a flipped assistance flag and a changed signature", async () => {
  const { signToken, verifyToken } = await import("../assessment-token");
  const token = signToken(payload);
  const [, signature] = token.split(".");
  const changedBody = Buffer.from(JSON.stringify({ ...payload, aiAssistance: false })).toString("base64url");
  expect(verifyToken(`${changedBody}.${signature}`)).toBeNull();
  const changedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  expect(verifyToken(`${token.split(".")[0]}.${changedSignature}`)).toBeNull();
});

test.each([1_999_999_999, 2_000_000_000])("rejects expired tokens at %i", async (exp) => {
  const { signToken, verifyToken } = await import("../assessment-token");
  expect(verifyToken(signToken({ ...payload, exp }))).toBeNull();
});

test.each(["", "garbage", "a.b", "a.b.c", ".", "a.", ".b", "###.###"])("returns null for malformed input %s", async (token) => {
  const { verifyToken } = await import("../assessment-token");
  expect(verifyToken(token)).toBeNull();
});

test.each([
  "{broken json", "null", "[]", '{"assessmentId":"a","aiAssistance":"true","exp":2000000060}',
  '{"assessmentId":"a","aiAssistance":true,"exp":"later"}',
  '{"assessmentId":"","aiAssistance":true,"exp":2000000060}',
])("rejects authenticated but invalid payloads", async (body) => {
  const { verifyToken } = await import("../assessment-token");
  expect(verifyToken(authenticatedRaw(body))).toBeNull();
});

test("uses the nonproduction fallback and warns only once", async () => {
  vi.stubEnv("ASSESSMENT_SECRET", "");
  const { signToken, verifyToken } = await import("../assessment-token");
  const token = signToken(payload);
  expect(verifyToken(token)).toEqual(payload);
  signToken(payload);
  expect(console.warn).toHaveBeenCalledTimes(1);
  const [body, signature] = token.split(".");
  expect(signature).toBe(createHmac("sha256", "dev-only-secret").update(body).digest("base64url"));
});

test("missing production secrets throw configuration errors rather than returning null", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ASSESSMENT_SECRET", "");
  const { signToken, verifyToken } = await import("../assessment-token");
  expect(() => signToken(payload)).toThrow(expect.objectContaining({ code: "config" }));
  expect(() => verifyToken("garbage")).toThrow(expect.objectContaining({ code: "config" }));
  expect(console.warn).not.toHaveBeenCalled();
});
