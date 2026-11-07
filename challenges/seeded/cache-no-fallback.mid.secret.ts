import type { ChallengeSecret } from "@/lib/contracts";

export const secret: ChallengeSecret = {
  challengeId: "seed-cache-no-fallback-mid",
  referenceFix: `// productService.js
function createProductService({ cache, repo, logger }) {
  const TTL_SECONDS = 60;

  function cacheKey(id) {
    return \`product:\${id}\`;
  }

  async function getProduct(id) {
    if (!id) {
      throw new Error("id is required");
    }

    let cached = null;
    try {
      cached = await cache.get(cacheKey(id));
    } catch (err) {
      logger.warn("cache.get failed, falling back to repo", { id, error: err.message });
    }
    if (cached) {
      return { ...cached, source: "cache" };
    }

    const product = await repo.findById(id);
    if (!product) {
      return null;
    }

    try {
      await cache.set(cacheKey(id), product, TTL_SECONDS);
    } catch (err) {
      logger.warn("cache.set failed", { id, error: err.message });
    }
    return { ...product, source: "db" };
  }

  return { getProduct };
}

module.exports = { createProductService };
`,
};
