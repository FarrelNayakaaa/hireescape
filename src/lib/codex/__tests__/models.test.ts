import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CodexError, modelFor } from "../models";

beforeEach(() => {
  vi.stubEnv("OPENAI_MODEL", "strong-test-model");
  vi.stubEnv("OPENAI_MODEL_FAST", "fast-test-model");
});
afterEach(() => vi.unstubAllEnvs());

test("selects models by role", () => {
  expect(modelFor("analyst")).toBe("strong-test-model");
  expect(modelFor("saboteur")).toBe("strong-test-model");
  expect(modelFor("inquisitor")).toBe("fast-test-model");
  expect(modelFor("assistant")).toBe("fast-test-model");
});

test.each([undefined, "", "   "])("falls back when the fast model is unset (%s)", (fast) => {
  vi.stubEnv("OPENAI_MODEL_FAST", fast);
  expect(modelFor("inquisitor")).toBe("strong-test-model");
  expect(modelFor("assistant")).toBe("strong-test-model");
});

test("reports missing selected models as configuration errors", () => {
  vi.stubEnv("OPENAI_MODEL", "");
  vi.stubEnv("OPENAI_MODEL_FAST", "");
  expect(() => modelFor("analyst")).toThrow(CodexError);
  expect(() => modelFor("assistant")).toThrow("OPENAI_MODEL is not set");
  try { modelFor("analyst"); } catch (error) { expect(error).toMatchObject({ code: "config" }); }
});
