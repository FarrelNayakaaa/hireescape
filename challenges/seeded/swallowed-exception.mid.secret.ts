import type { ChallengeSecret } from "@/lib/contracts";

export const secret: ChallengeSecret = {
  challengeId: "seed-swallowed-exception-mid",
  referenceFix: `// refundService.js
function createRefundService({ paymentGateway, orderRepo, logger }) {
  async function refundOrder(orderId) {
    const order = await orderRepo.findById(orderId);
    if (!order) {
      return { ok: false, reason: "ORDER_NOT_FOUND" };
    }
    if (order.status === "REFUNDED") {
      return { ok: true, alreadyRefunded: true };
    }

    try {
      await paymentGateway.refund(order.paymentId, order.amount);
    } catch (err) {
      logger.error("refund failed at gateway", { orderId, error: err.message });
      return { ok: false, reason: "GATEWAY_ERROR", retryable: true };
    }

    await orderRepo.updateStatus(orderId, "REFUNDED");
    return { ok: true, alreadyRefunded: false };
  }

  return { refundOrder };
}

module.exports = { createRefundService };
`,
};
