import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

function worker() {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const cache = { add: vi.fn().mockResolvedValue(undefined), match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
  const fetch = vi.fn().mockRejectedValue(new Error("Network offline"));
  runInNewContext(readFileSync("public/demo-offline-worker.js", "utf8"), {
    addEventListener: (type: string, listener: (event: Record<string, unknown>) => void) => listeners.set(type, listener),
    location: { origin: "https://demo.test" }, caches: { open: async () => cache }, fetch, URL, Request,
  });
  return { listeners, cache, fetch };
}
it("prepares only the demo document and same-origin public assets, never API or session data", async () => {
  const { listeners, cache } = worker();
  const postMessage = vi.fn();
  let finished: Promise<void> | undefined;
  listeners.get("message")!({ data: { type: "CACHE_DEMO", urls: [
    "https://demo.test/_next/static/demo.js", "https://demo.test/play/editor-assets/editor/editor.worker.js",
    "https://other.test/_next/static/private.js", "https://demo.test/api/analyst", "https://demo.test/report/private-session", "https://demo.test/he:secrets",
  ] }, ports: [{ postMessage }], waitUntil: (value: Promise<void>) => { finished = value; } });
  await finished;
  expect(cache.add.mock.calls.map(([url]) => typeof url === "string" ? url : (url as Request).url)).toEqual([
    "https://demo.test/report/demo", "https://demo.test/_next/static/demo.js", "https://demo.test/play/editor-assets/editor/editor.worker.js",
  ]);
  expect(postMessage).toHaveBeenCalledWith({ type: "DEMO_CACHED" });
});
it("returns the prepared document when a navigation reload loses the network", async () => {
  const { listeners, cache } = worker();
  cache.match.mockResolvedValue(new Response("Prepared fictional report"));
  let response: Promise<Response> | undefined;
  listeners.get("fetch")!({ request: { method: "GET", url: "https://demo.test/report/demo", mode: "navigate" }, respondWith: (value: Promise<Response>) => { response = value; } });
  expect(await (await response)!.text()).toBe("Prepared fictional report");
  expect(cache.match).toHaveBeenCalledWith("/report/demo");
});
it("does not intercept agent requests, private reports, or assessment links", () => {
  const { listeners } = worker();
  const respondWith = vi.fn();
  for (const path of ["/api/analyst", "/api/assistant", "/report/session-1", "/play/assessment-1"]) {
    listeners.get("fetch")!({ request: { method: "GET", url: `https://demo.test${path}`, mode: "navigate" }, respondWith });
  }
  expect(respondWith).not.toHaveBeenCalled();
});
it("reports preparation failure without pretending the demo is cached", async () => {
  const { listeners, cache } = worker();
  cache.add.mockRejectedValue(new Error("Quota exceeded"));
  const postMessage = vi.fn();
  let finished: Promise<void> | undefined;
  listeners.get("message")!({ data: { type: "CACHE_DEMO", urls: [] }, ports: [{ postMessage }], waitUntil: (value: Promise<void>) => { finished = value; } });
  await finished;
  expect(postMessage).toHaveBeenCalledWith({ type: "CACHE_ERROR" });
});
