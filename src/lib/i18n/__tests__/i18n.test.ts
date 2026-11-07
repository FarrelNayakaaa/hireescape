import { expect, it } from "vitest";
import { t } from "../index";

it("uses English while Indonesian translations are pending", () => {
  expect(t("id", "rulesTitle")).toBe(t("en", "rulesTitle"));
  expect(t("en", "keys", { count: 2 })).toBe("Keys earned: 2/3");
  expect(t("en", "testCounts", { passed: 4, total: 6, suite: "hidden" })).toBe("4/6 hidden tests pass");
});
