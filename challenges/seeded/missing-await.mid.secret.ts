import type { ChallengeSecret } from "@/lib/contracts";

export const secret: ChallengeSecret = {
  challengeId: "seed-missing-await-mid",
  referenceFix: `// checkoutService.js
function createCheckoutService({ orderRepo, inventory, notifier }) {
  async function placeOrder(order) {
    if (!order.items || order.items.length === 0) {
      throw new Error("order has no items");
    }

    const reserved = await inventory.reserve(order.items);
    if (!reserved) {
      return { ok: false, reason: "OUT_OF_STOCK" };
    }

    await orderRepo.save({ ...order, status: "PLACED" });
    await notifier.send(order.userId, "Order placed");
    return { ok: true };
  }

  return { placeOrder };
}

module.exports = { createCheckoutService };
`,
};
