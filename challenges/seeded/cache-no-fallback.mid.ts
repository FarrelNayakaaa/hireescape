import type { Challenge } from "@/lib/contracts";

// Seeded challenge: cache_no_fallback (mid). Pre-validated fallback for demo safety.
export const challenge: Challenge = {
  id: "seed-cache-no-fallback-mid",
  title: "INC-2417: Product page 500s during cache flaps",
  level: "mid",
  defectType: "cache_no_fallback",
  language: "javascript",
  source: "seeded",
  brief: `INC-2417 — Product detail page returns HTTP 500 during cache flaps.

Since 02:10 WIB the cache cluster has intermittent timeouts. Product detail requests
fail with 500 even though the database is healthy. Error in logs:
  Error: ETIMEDOUT cache   (thrown from getProduct)

Expected behaviour:
- The product page keeps working from the database when the cache is unhealthy.
- Cache problems are visible in logs (not silent).
- Real database failures must still surface to the caller.`,
  starterCode: `// productService.js
function createProductService({ cache, repo, logger }) {
  const TTL_SECONDS = 60;

  function cacheKey(id) {
    return \`product:\${id}\`;
  }

  async function getProduct(id) {
    if (!id) {
      throw new Error("id is required");
    }

    const cached = await cache.get(cacheKey(id));
    if (cached) {
      return { ...cached, source: "cache" };
    }

    const product = await repo.findById(id);
    if (!product) {
      return null;
    }

    await cache.set(cacheKey(id), product, TTL_SECONDS);
    return { ...product, source: "db" };
  }

  return { getProduct };
}

module.exports = { createProductService };
`,
  defectLines: [14, 24],
  visibleTests: `test("returns product from repo on cache miss", async () => {
  const repo = { findById: async (id) => ({ id, name: "Kopi Susu" }) };
  const svc = mod.createProductService({ cache: fakes.memoryCache(), repo, logger: fakes.silentLogger() });
  const result = await svc.getProduct("p1");
  assert.deepStrictEqual(result, { id: "p1", name: "Kopi Susu", source: "db" });
});

test("throws when id is missing", async () => {
  const svc = mod.createProductService({ cache: fakes.memoryCache(), repo: { findById: async () => null }, logger: fakes.silentLogger() });
  await assert.rejects(() => svc.getProduct(""), /id is required/);
});
`,
  hiddenTests: `test("falls back to repo when cache.get times out", async () => {
  const repo = { findById: async (id) => ({ id, name: "Kopi Susu" }) };
  const svc = mod.createProductService({ cache: fakes.failingCache({ failGet: true }), repo, logger: fakes.spyLogger() });
  const result = await svc.getProduct("p1");
  assert.deepStrictEqual(result, { id: "p1", name: "Kopi Susu", source: "db" });
});

test("logs the cache failure instead of hiding it", async () => {
  const repo = { findById: async (id) => ({ id, name: "Kopi Susu" }) };
  const logger = fakes.spyLogger();
  const svc = mod.createProductService({ cache: fakes.failingCache({ failGet: true }), repo, logger });
  await svc.getProduct("p1").catch(() => {});
  assert.ok(logger.calls.warn.length + logger.calls.error.length >= 1, "expected the cache failure to be logged");
});

test("returns product even when cache.set fails", async () => {
  const repo = { findById: async (id) => ({ id, name: "Es Teh" }) };
  const svc = mod.createProductService({ cache: fakes.failingCache({ failSet: true }), repo, logger: fakes.silentLogger() });
  const result = await svc.getProduct("p2");
  assert.deepStrictEqual(result, { id: "p2", name: "Es Teh", source: "db" });
});

test("still serves from cache when cache is healthy", async () => {
  let dbCalls = 0;
  const repo = { findById: async (id) => { dbCalls++; return { id, name: "Es Teh" }; } };
  const svc = mod.createProductService({ cache: fakes.memoryCache(), repo, logger: fakes.silentLogger() });
  await svc.getProduct("p2");
  const second = await svc.getProduct("p2");
  assert.strictEqual(second.source, "cache");
  assert.strictEqual(dbCalls, 1);
});

test("returns null for unknown product", async () => {
  const svc = mod.createProductService({ cache: fakes.memoryCache(), repo: { findById: async () => null }, logger: fakes.silentLogger() });
  assert.strictEqual(await svc.getProduct("nope"), null);
});

test("does not hide database failures", async () => {
  const repo = { findById: async () => { throw new Error("db down"); } };
  const svc = mod.createProductService({ cache: fakes.memoryCache(), repo, logger: fakes.silentLogger() });
  await assert.rejects(() => svc.getProduct("p3"), /db down/);
});
`,
  rubricHints: [
    "The cache is an optimisation, not a source of truth: get/set failures must not fail the request.",
    "Cache failures should be observable (logged), not silently swallowed.",
    "Database failures should still propagate to the caller.",
    "Senior signal: mentions timeouts, circuit breaking, or avoiding a thundering herd on the DB.",
  ],
  validation: { brokenFailsHidden: true, fixPassesHidden: true, attempts: 0, validatedAt: "2026-11-07T00:00:00.000Z" },
};
