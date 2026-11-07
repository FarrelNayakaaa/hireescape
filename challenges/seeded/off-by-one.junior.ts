import type { Challenge } from "@/lib/contracts";

// Seeded challenge: off_by_one (junior). Pre-validated fallback for demo safety.
export const challenge: Challenge = {
  id: "seed-off-by-one-junior",
  title: "INC-2391: Voucher rejected when spend equals the minimum",
  level: "junior",
  defectType: "off_by_one",
  language: "javascript",
  source: "seeded",
  brief: `INC-2391 — Customers complain a valid voucher is rejected.

A voucher says "min. spend Rp100.000". Customers whose cart is exactly Rp100.000
get "min spend not met" and abandon checkout. CS found 112 such tickets this week.

Expected behaviour:
- A cart that meets the minimum spend exactly qualifies for the voucher.
- A cart below the minimum is rejected with reason "MIN_SPEND_NOT_MET".
- Free shipping starts at Rp250.000 (inclusive). Existing behaviour must not change.`,
  starterCode: `// voucherService.js
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
    if (subtotal <= voucher.minSpend) {
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
  defectLines: [16, 16],
  visibleTests: `const voucher = { code: "HEMAT10", minSpend: 100000, percent: 10, maxDiscount: 50000 };

test("applies a percentage voucher", async () => {
  const svc = mod.createVoucherService({ logger: fakes.silentLogger() });
  assert.deepStrictEqual(svc.applyVoucher(200000, voucher), { discount: 20000, freeShipping: false });
});

test("rejects a non-positive subtotal", async () => {
  const svc = mod.createVoucherService({ logger: fakes.silentLogger() });
  assert.throws(() => svc.applyVoucher(0, voucher), /subtotal must be positive/);
});
`,
  hiddenTests: `const voucher = { code: "HEMAT10", minSpend: 100000, percent: 10, maxDiscount: 50000 };
const make = () => mod.createVoucherService({ logger: fakes.silentLogger() });

test("a cart exactly at the minimum spend qualifies", async () => {
  assert.deepStrictEqual(make().applyVoucher(100000, voucher), { discount: 10000, freeShipping: false });
});

test("a cart just below the minimum is rejected", async () => {
  assert.deepStrictEqual(make().applyVoucher(99999, voucher), { discount: 0, freeShipping: false, reason: "MIN_SPEND_NOT_MET" });
});

test("discount is capped at maxDiscount", async () => {
  assert.strictEqual(make().applyVoucher(900000, voucher).discount, 50000);
});

test("free shipping starts exactly at 250000", async () => {
  assert.strictEqual(make().applyVoucher(250000).freeShipping, true);
  assert.strictEqual(make().applyVoucher(249999).freeShipping, false);
});

test("no voucher means no discount", async () => {
  assert.deepStrictEqual(make().applyVoucher(120000), { discount: 0, freeShipping: false });
});
`,
  rubricHints: [
    "Boundary conditions: states exactly which comparison operator is wrong and why (>= vs >).",
    "Checks both sides of the boundary (equal and just below), not only the reported case.",
    "Leaves the free-shipping comparison alone because it is already correct and inclusive.",
    "Senior signal: mentions boundary-value tests or a shared named constant for thresholds.",
  ],
  validation: { brokenFailsHidden: true, fixPassesHidden: true, attempts: 0, validatedAt: "2026-11-07T00:00:00.000Z" },
};
