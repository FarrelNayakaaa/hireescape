// Seeded challenge: shared_mutation (junior). Pre-validated fallback for demo safety.
export const challenge = {
  id: "seed-shared-mutation-junior",
  title: "INC-2402: Cart prices drop again every time the page re-renders",
  level: "junior",
  defectType: "shared_mutation",
  language: "javascript",
  source: "seeded",
  brief: `INC-2402 — Prices in the cart keep getting cheaper.

During the 11.11 sale, QA noticed that refreshing the cart summary applies the
promo discount again and again: Rp10.000 becomes Rp9.000, then Rp8.100, and so on.
The original catalogue price is also wrong afterwards.

Expected behaviour:
- applyDiscount returns discounted items and never changes the cart it was given.
- Calling it twice with the same cart gives the same result.
- Percent outside 0-100 is still rejected.`,
  starterCode: `// cartService.js
function createCartService() {
  function applyDiscount(items, percent) {
    if (percent < 0 || percent > 100) {
      throw new Error("percent must be between 0 and 100");
    }
    for (const item of items) {
      item.price = Math.round((item.price * (100 - percent)) / 100);
    }
    return items;
  }

  function total(items) {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  return { applyDiscount, total };
}

module.exports = { createCartService };
`,
  defectLines: [7, 10],
  visibleTests: `test("applies the discount to each item", async () => {
  const svc = mod.createCartService();
  const out = svc.applyDiscount([{ sku: "a", price: 10000, qty: 2 }], 10);
  assert.strictEqual(out[0].price, 9000);
});

test("rejects an invalid percent", async () => {
  const svc = mod.createCartService();
  assert.throws(() => svc.applyDiscount([], 150), /percent must be between 0 and 100/);
});
`,
  hiddenTests: `const cart = () => [{ sku: "a", price: 10000, qty: 2 }, { sku: "b", price: 5000, qty: 1 }];

test("does not change the cart it was given", async () => {
  const svc = mod.createCartService();
  const items = cart();
  svc.applyDiscount(items, 10);
  assert.deepStrictEqual(items, cart());
});

test("discounting the same cart twice gives the same result", async () => {
  const svc = mod.createCartService();
  const items = cart();
  const first = svc.applyDiscount(items, 10);
  const second = svc.applyDiscount(items, 10);
  assert.deepStrictEqual(first, second);
});

test("total uses the discounted prices", async () => {
  const svc = mod.createCartService();
  assert.strictEqual(svc.total(svc.applyDiscount(cart(), 10)), 9000 * 2 + 4500);
});

test("0 percent leaves prices unchanged", async () => {
  const svc = mod.createCartService();
  assert.deepStrictEqual(svc.applyDiscount(cart(), 0), cart());
});

test("returns new item objects, not the originals", async () => {
  const svc = mod.createCartService();
  const items = cart();
  const out = svc.applyDiscount(items, 10);
  assert.notStrictEqual(out[0], items[0]);
});
`,
  rubricHints: [
    "Identifies that the function mutates its input (side effect on the caller's data).",
    "Fix returns new objects (map + spread) instead of editing items in place.",
    "Explains why the bug shows up on re-render: the same array is processed repeatedly.",
    "Senior signal: mentions immutability conventions or freezing test data to catch this class of bug.",
  ],
};

export const secret = {
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
