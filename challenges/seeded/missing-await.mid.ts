import type { Challenge } from "@/lib/contracts";

// Seeded challenge: missing_await (mid). Pre-validated fallback for demo safety.
export const challenge: Challenge = {
  id: "seed-missing-await-mid",
  title: "INC-2433: Receipt emails sent for orders that are not in the database yet",
  level: "mid",
  defectType: "missing_await",
  language: "javascript",
  source: "seeded",
  brief: `INC-2433 — Customers get a receipt, but "My Orders" is empty.

Under load the order database is slow (50-200 ms per write). Support sees receipts
arriving before the order exists, and some users who open the link immediately get
"order not found". It never happens in staging, where the database is instant.

Expected behaviour:
- The order must be saved before the customer is notified.
- placeOrder must not resolve until the order is persisted.
- Out-of-stock and empty orders behave as before.`,
  starterCode: `// checkoutService.js
function createCheckoutService({ orderRepo, inventory, notifier }) {
  async function placeOrder(order) {
    if (!order.items || order.items.length === 0) {
      throw new Error("order has no items");
    }

    const reserved = await inventory.reserve(order.items);
    if (!reserved) {
      return { ok: false, reason: "OUT_OF_STOCK" };
    }

    orderRepo.save({ ...order, status: "PLACED" });
    await notifier.send(order.userId, "Order placed");
    return { ok: true };
  }

  return { placeOrder };
}

module.exports = { createCheckoutService };
`,
  defectLines: [13, 13],
  visibleTests: `function fast() {
  const saved = [];
  return {
    saved,
    orderRepo: { save: async (o) => { saved.push(o); } },
    inventory: { reserve: async () => true },
    notifier: { send: async () => {} },
  };
}

test("places an order", async () => {
  const f = fast();
  const svc = mod.createCheckoutService(f);
  assert.deepStrictEqual(await svc.placeOrder({ id: "o1", userId: "u1", items: [{ sku: "a" }] }), { ok: true });
  assert.strictEqual(f.saved.length, 1);
});

test("rejects an empty order", async () => {
  const f = fast();
  const svc = mod.createCheckoutService(f);
  await assert.rejects(() => svc.placeOrder({ id: "o2", userId: "u1", items: [] }), /order has no items/);
});
`,
  hiddenTests: `function slowDb() {
  const saved = [];
  const sentWhenSaved = [];
  return {
    saved,
    sentWhenSaved,
    orderRepo: { save: (o) => new Promise((resolve) => setTimeout(() => { saved.push(o); resolve(); }, 8)) },
    inventory: { reserve: async () => true },
    notifier: { send: async () => { sentWhenSaved.push(saved.length); } },
  };
}
const order = { id: "o3", userId: "u1", items: [{ sku: "a" }] };

test("the order is persisted before placeOrder resolves", async () => {
  const f = slowDb();
  const svc = mod.createCheckoutService(f);
  await svc.placeOrder(order);
  assert.strictEqual(f.saved.length, 1);
});

test("the receipt is sent only after the order is saved", async () => {
  const f = slowDb();
  const svc = mod.createCheckoutService(f);
  await svc.placeOrder(order);
  assert.deepStrictEqual(f.sentWhenSaved, [1]);
});

test("out of stock: nothing is saved and nobody is notified", async () => {
  const f = slowDb();
  f.inventory.reserve = async () => false;
  const svc = mod.createCheckoutService(f);
  assert.deepStrictEqual(await svc.placeOrder(order), { ok: false, reason: "OUT_OF_STOCK" });
  assert.strictEqual(f.sentWhenSaved.length, 0);
});

test("stock is reserved exactly once", async () => {
  let reserves = 0;
  const f = slowDb();
  f.inventory.reserve = async () => { reserves++; return true; };
  const svc = mod.createCheckoutService(f);
  await svc.placeOrder(order);
  assert.strictEqual(reserves, 1);
});

test("an empty order is still rejected", async () => {
  const svc = mod.createCheckoutService(slowDb());
  await assert.rejects(() => svc.placeOrder({ id: "o4", userId: "u1", items: [] }), /order has no items/);
});
`,
  rubricHints: [
    "Spots the missing await and explains it only shows up when the database is slow (race condition).",
    "Explains why staging (instant fake database) hid the problem.",
    "Senior signal: asks what happens if save() fails after stock was reserved (release stock / compensate).",
    "Senior signal: mentions an outbox or queue so the notification is guaranteed after commit.",
  ],
  validation: { brokenFailsHidden: true, fixPassesHidden: true, attempts: 0, validatedAt: "2026-11-07T00:00:00.000Z" },
};
