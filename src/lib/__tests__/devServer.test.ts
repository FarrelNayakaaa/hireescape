import { expect, test } from "vitest";

// Run against a live dev server: HIRESCAPE_DEV_URL=http://localhost:3000 pnpm test.
const devServerURL = process.env.HIRESCAPE_DEV_URL;

test.skipIf(!devServerURL)("serves the home page and compiled design tokens in development", async () => {
  if (!devServerURL) throw new Error("Set HIRESCAPE_DEV_URL to the running dev server.");

  const response = await fetch(devServerURL);
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain("HireEscape");

  const stylesheets = [...html.matchAll(/<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="([^"]+)"/g)];
  expect(stylesheets.length).toBeGreaterThan(0);
  const css = await Promise.all(stylesheets.map(async ([, path]) => {
    const stylesheet = await fetch(new URL(path, devServerURL));
    expect(stylesheet.status).toBe(200);
    return stylesheet.text();
  }));

  for (const utility of [".bg-he-surface", ".text-he-muted", ".border-he-border"]) {
    expect(css.join("\n")).toContain(utility);
  }
}, 20_000);
