import { expect, it } from "vitest";
import { GET } from "./route";

function get(asset: string[]) {
  return GET(new Request("http://localhost/play/editor-assets/asset.js"), { params: Promise.resolve({ asset }) });
}

it("serves the local worker entry and its relative dependencies as JavaScript", async () => {
  const entry = await get(["editor", "editor.worker.js"]);
  expect(entry.status).toBe(200);
  expect(entry.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
  expect(await entry.text()).toContain("./editor.worker.start.js");
  expect((await get(["editor", "editor.worker.start.js"])).status).toBe(200);
  expect((await get(["internal", "common", "initialize.js"])).status).toBe(200);
});

it.each([["..", "package.json"], ["editor", "../../package.json"], ["editor", "editor.api.d.ts"], ["missing.js"]])("rejects traversal, non-JavaScript and missing assets: %j", async (...parts) => {
  expect((await get(parts)).status).toBe(404);
});
