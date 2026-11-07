import type { ChallengeSecret } from "@/lib/contracts";

export const secret: ChallengeSecret = {
  challengeId: "seed-shared-mutation-junior",
  referenceFix: `// cartService.js
function createCartService() {
  function applyDiscount(items, percent) {
    if (percent < 0 || percent > 100) {
      throw new Error("percent must be between 0 and 100");
    }
    return items.map((item) => ({
      ...item,
      price: Math.round((item.price * (100 - percent)) / 100),
    }));
  }

  function total(items) {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  return { applyDiscount, total };
}

module.exports = { createCartService };
`,
};
