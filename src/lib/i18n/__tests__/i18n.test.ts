import { afterEach, expect, it, vi } from "vitest";
import { t } from "../index";
import { id } from "../id";
import { en } from "../en";
afterEach(() => { vi.resetModules(); vi.doUnmock("../id"); });
it("provides every Indonesian key and interpolates values", () => {
  expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
  expect(t("id", "rulesTitle")).toBe("Sebelum Anda masuk");
  expect(t("id", "keys", { count: 2 })).toBe("Kunci diperoleh: 2/3");
  expect(t("en", "testCounts", { passed: 4, total: 6, suite: "hidden" })).toBe("4/6 hidden tests pass");
});
it("falls back to English if a translation is missing", async () => {
  vi.doMock("../id", () => ({ id: {} }));
  const fallback = await import("../index");
  expect(fallback.t("id", "rulesTitle")).toBe(en.rulesTitle);
});
