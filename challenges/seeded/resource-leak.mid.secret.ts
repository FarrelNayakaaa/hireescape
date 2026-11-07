import type { ChallengeSecret } from "@/lib/contracts";

export const secret: ChallengeSecret = {
  challengeId: "seed-resource-leak-mid",
  referenceFix: `// stockService.js
function createStockService({ lockManager, stockRepo }) {
  async function deduct(sku, qty) {
    if (qty <= 0) {
      throw new Error("qty must be positive");
    }

    const lock = await lockManager.acquire("stock:" + sku);
    try {
      const stock = await stockRepo.get(sku);
      if (stock < qty) {
        return { ok: false, reason: "INSUFFICIENT_STOCK" };
      }
      await stockRepo.set(sku, stock - qty);
      return { ok: true, remaining: stock - qty };
    } finally {
      await lock.release();
    }
  }

  return { deduct };
}

module.exports = { createStockService };
`,
};
