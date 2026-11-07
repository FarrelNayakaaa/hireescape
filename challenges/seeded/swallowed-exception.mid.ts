import type { Challenge } from "@/lib/contracts";

// Seeded challenge: swallowed_exception (mid). Pre-validated fallback for demo safety.
export const challenge: Challenge = {
  id: "seed-swallowed-exception-mid",
  title: "INC-2488: Orders marked REFUNDED but money never returned",
  level: "mid",
  defectType: "swallowed_exception",
  language: "javascript",
  source: "seeded",
  brief: `INC-2488 — Customers complain refunds never arrived.

Finance reconciliation found 37 orders with status REFUNDED for which the payment
gateway has no refund record. The gateway had partial outages last week.
No errors appear in our logs for these orders.

Expected behaviour:
- If the gateway refund fails, the order must NOT be marked REFUNDED.
- The failure must be logged as an error, including the orderId.
- Return { ok: false, reason: "GATEWAY_ERROR", retryable: true } so the caller can retry.`,
  starterCode: `// refundService.js
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
      // gateway is flaky, don't block the user
    }

    await orderRepo.updateStatus(orderId, "REFUNDED");
    return { ok: true, alreadyRefunded: false };
  }

  return { refundOrder };
}

module.exports = { createRefundService };
`,
  defectLines: [12, 18],
  visibleTests: `function makeRepo(order) {
  const updates = [];
  return { updates, findById: async () => order, updateStatus: async (id, s) => { updates.push([id, s]); } };
}

test("refunds a paid order", async () => {
  const repo = makeRepo({ id: "o1", status: "PAID", paymentId: "pay1", amount: 50000 });
  const gateway = { refund: async () => ({ id: "rf1" }) };
  const svc = mod.createRefundService({ paymentGateway: gateway, orderRepo: repo, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.refundOrder("o1"), { ok: true, alreadyRefunded: false });
  assert.deepStrictEqual(repo.updates, [["o1", "REFUNDED"]]);
});

test("returns ORDER_NOT_FOUND for unknown order", async () => {
  const svc = mod.createRefundService({ paymentGateway: { refund: async () => ({}) }, orderRepo: makeRepo(null), logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.refundOrder("x"), { ok: false, reason: "ORDER_NOT_FOUND" });
});
`,
  hiddenTests: `function makeRepo(order) {
  const updates = [];
  return { updates, findById: async () => order, updateStatus: async (id, s) => { updates.push([id, s]); } };
}
const failingGateway = { refund: async () => { throw new Error("gateway 503"); } };

test("returns a retryable GATEWAY_ERROR when the gateway fails", async () => {
  const repo = makeRepo({ id: "o2", status: "PAID", paymentId: "pay2", amount: 75000 });
  const svc = mod.createRefundService({ paymentGateway: failingGateway, orderRepo: repo, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.refundOrder("o2"), { ok: false, reason: "GATEWAY_ERROR", retryable: true });
});

test("does not mark the order REFUNDED when the gateway fails", async () => {
  const repo = makeRepo({ id: "o3", status: "PAID", paymentId: "pay3", amount: 10000 });
  const svc = mod.createRefundService({ paymentGateway: failingGateway, orderRepo: repo, logger: fakes.silentLogger() });
  await svc.refundOrder("o3").catch(() => {});
  assert.deepStrictEqual(repo.updates, []);
});

test("logs gateway failures as errors with the orderId", async () => {
  const repo = makeRepo({ id: "o4", status: "PAID", paymentId: "pay4", amount: 10000 });
  const logger = fakes.spyLogger();
  const svc = mod.createRefundService({ paymentGateway: failingGateway, orderRepo: repo, logger });
  await svc.refundOrder("o4").catch(() => {});
  assert.ok(logger.calls.error.length >= 1, "expected logger.error to be called");
  assert.ok(JSON.stringify(logger.calls.error).includes("o4"), "expected the orderId in the error log");
});

test("does not call the gateway for already refunded orders", async () => {
  let calls = 0;
  const gateway = { refund: async () => { calls++; } };
  const repo = makeRepo({ id: "o5", status: "REFUNDED", paymentId: "pay5", amount: 1 });
  const svc = mod.createRefundService({ paymentGateway: gateway, orderRepo: repo, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.refundOrder("o5"), { ok: true, alreadyRefunded: true });
  assert.strictEqual(calls, 0);
});

test("successful refund still marks REFUNDED", async () => {
  const repo = makeRepo({ id: "o6", status: "PAID", paymentId: "pay6", amount: 20000 });
  const svc = mod.createRefundService({ paymentGateway: { refund: async () => ({}) }, orderRepo: repo, logger: fakes.silentLogger() });
  await svc.refundOrder("o6");
  assert.deepStrictEqual(repo.updates, [["o6", "REFUNDED"]]);
});
`,
  rubricHints: [
    "A swallowed exception turned a recoverable error into silent data corruption (money vs. status mismatch).",
    "Order of operations: only change state after the external side effect succeeds.",
    "Failures must be observable (logged with context) and signalled to the caller.",
    "Senior signal: mentions idempotency keys, retries with backoff, or a reconciliation job for the 37 bad orders.",
  ],
  validation: { brokenFailsHidden: true, fixPassesHidden: true, attempts: 0, validatedAt: "2026-11-07T00:00:00.000Z" },
};
