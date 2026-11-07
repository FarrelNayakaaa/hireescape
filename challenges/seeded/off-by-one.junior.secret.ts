import type { ChallengeSecret } from "@/lib/contracts";

export const secret: ChallengeSecret = {
  challengeId: "seed-off-by-one-junior",
  referenceFix: `// voucherService.js
function createVoucherService({ logger }) {
  const FREE_SHIPPING_FROM = 250000;

  function freeShipping(subtotal) {
    return subtotal >= FREE_SHIPPING_FROM;
  }

  function applyVoucher(subtotal, voucher) {
    if (subtotal <= 0) {
      throw new Error("subtotal must be positive");
    }
    if (!voucher) {
      return { discount: 0, freeShipping: freeShipping(subtotal) };
    }
    if (subtotal < voucher.minSpend) {
      logger.info("voucher rejected: min spend not met", { code: voucher.code });
      return { discount: 0, freeShipping: freeShipping(subtotal), reason: "MIN_SPEND_NOT_MET" };
    }
    const raw = Math.floor((subtotal * voucher.percent) / 100);
    const discount = Math.min(raw, voucher.maxDiscount);
    return { discount, freeShipping: freeShipping(subtotal) };
  }

  return { applyVoucher };
}

module.exports = { createVoucherService };
`,
};
