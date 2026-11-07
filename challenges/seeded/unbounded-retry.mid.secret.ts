import type { ChallengeSecret } from "@/lib/contracts";

export const secret: ChallengeSecret = {
  challengeId: "seed-unbounded-retry-mid",
  referenceFix: `// paymentService.js
function createPaymentService({ gateway, logger }) {
  const MAX_ATTEMPTS = 3;

  async function charge(orderId, amount) {
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const receipt = await gateway.charge(orderId, amount);
        return { ok: true, receiptId: receipt.id, attempts: attempt };
      } catch (err) {
        logger.warn("charge failed", { orderId, attempt, error: err.message });
        if (err.retryable !== true) {
          return { ok: false, reason: "NON_RETRYABLE", attempts: attempt };
        }
        if (attempt >= MAX_ATTEMPTS) {
          return { ok: false, reason: "GATEWAY_ERROR", attempts: attempt };
        }
      }
    }
  }

  return { charge };
}

module.exports = { createPaymentService };
`,
};
