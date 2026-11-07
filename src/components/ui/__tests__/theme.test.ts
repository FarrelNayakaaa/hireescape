// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { readStoredTheme, themeBootstrap } from "../theme";

afterEach(() => { document.documentElement.dataset.theme = "default"; });

test.each([
  [null, "default"], ["default", "default"], ["retro", "retro"], ["invalid", "default"], ["RETRO", "default"],
])("validates the saved theme %s", (saved, expected) => {
  expect(readStoredTheme(() => saved)).toBe(expected);
});

test("storage denial falls back without throwing", () => {
  expect(readStoredTheme(() => { throw new Error("Denied"); })).toBe("default");
});

test("the pre-paint bootstrap applies saved preferences and handles unavailable storage", () => {
  const run = new Function("localStorage", "document", themeBootstrap);
  run({ getItem: () => "retro" }, document);
  expect(document.documentElement).toHaveAttribute("data-theme", "retro");
  run({ getItem: () => "not-a-theme" }, document);
  expect(document.documentElement).toHaveAttribute("data-theme", "default");
  run({ getItem: () => { throw new Error("Denied"); } }, document);
  expect(document.documentElement).toHaveAttribute("data-theme", "default");
});
