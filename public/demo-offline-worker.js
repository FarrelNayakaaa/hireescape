// This worker controls only /report/demo and caches public demo assets, never session/API data.
const CACHE = "he:demo-assets:v1";
const DEMO = "/report/demo";
function publicAsset(value) {
  const url = new URL(value, globalThis.location.origin);
  return url.origin === globalThis.location.origin && (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/play/editor-assets/") || url.pathname === "/favicon.ico"
  );
}
globalThis.addEventListener("install", event => event.waitUntil(globalThis.skipWaiting()));
globalThis.addEventListener("activate", event => event.waitUntil(globalThis.clients.claim()));
globalThis.addEventListener("message", event => {
  if (event.data?.type !== "CACHE_DEMO") return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.add(new Request(new URL(DEMO, globalThis.location.origin), { headers: { Accept: "text/html" }, cache: "reload" }));
      const urls = Array.isArray(event.data.urls) ? event.data.urls.filter(value => typeof value === "string" && publicAsset(value)) : [];
      await Promise.all([...new Set(urls)].map(async url => {
        if (!await cache.match(url)) await cache.add(url);
      }));
      event.ports[0]?.postMessage({ type: "DEMO_CACHED" });
    } catch {
      event.ports[0]?.postMessage({ type: "CACHE_ERROR" });
    }
  })());
});
globalThis.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const document = request.mode === "navigate" && url.origin === globalThis.location.origin && url.pathname === DEMO;
  if (!document && !publicAsset(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = document ? DEMO : request;
    if (!document) {
      const saved = await cache.match(key);
      if (saved) return saved;
    }
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(key, response.clone());
      return response;
    } catch (error) {
      const saved = await cache.match(key);
      if (saved) return saved;
      throw error;
    }
  })());
});
