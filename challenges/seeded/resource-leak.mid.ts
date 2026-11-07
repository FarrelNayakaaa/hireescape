import type { Challenge } from "@/lib/contracts";

// Seeded challenge: resource_leak (mid). Pre-validated fallback for demo safety.
export const challenge: Challenge = {
  id: "seed-resource-leak-mid",
  title: "INC-2475: Flash-sale item stuck 'being updated' after one DB error",
  level: "mid",
  defectType: "resource_leak",
  language: "javascript",
  source: "seeded",
  brief: `INC-2475 — One SKU stops selling during a flash sale.

At 12:03 a database hiccup made one stock update fail. Since then every purchase of
that SKU fails with "LOCKED stock:SKU-77" until the lock expires 30 minutes later.
Other SKUs are fine.

Expected behaviour:
- The stock lock is always released, whether the update succeeds, is rejected for
  insufficient stock, or fails with an error.
- Errors still reach the caller.
- Insufficient stock returns { ok: false, reason: "INSUFFICIENT_STOCK" }.`,
  starterCode: `// stockService.js
function createStockService({ lockManager, stockRepo }) {
  async function deduct(sku, qty) {
    if (qty <= 0) {
      throw new Error("qty must be positive");
    }

    const lock = await lockManager.acquire("stock:" + sku);
    const stock = await stockRepo.get(sku);
    if (stock < qty) {
      await lock.release();
      return { ok: false, reason: "INSUFFICIENT_STOCK" };
    }

    await stockRepo.set(sku, stock - qty);
    await lock.release();
    return { ok: true, remaining: stock - qty };
  }

  return { deduct };
}

module.exports = { createStockService };
`,
  defectLines: [8, 17],
  visibleTests: `function makeLocks() {
  const held = new Set();
  return {
    held,
    acquire: async (key) => {
      if (held.has(key)) throw new Error("LOCKED " + key);
      held.add(key);
      return { release: async () => { held.delete(key); } };
    },
  };
}
function makeRepo(initial) {
  const data = { ...initial };
  return { data, get: async (sku) => data[sku], set: async (sku, v) => { data[sku] = v; } };
}

test("deducts stock", async () => {
  const svc = mod.createStockService({ lockManager: makeLocks(), stockRepo: makeRepo({ a: 10 }) });
  assert.deepStrictEqual(await svc.deduct("a", 3), { ok: true, remaining: 7 });
});

test("rejects a non-positive quantity", async () => {
  const svc = mod.createStockService({ lockManager: makeLocks(), stockRepo: makeRepo({ a: 10 }) });
  await assert.rejects(() => svc.deduct("a", 0), /qty must be positive/);
});
`,
  hiddenTests: `function makeLocks() {
  const held = new Set();
  return {
    held,
    acquire: async (key) => {
      if (held.has(key)) throw new Error("LOCKED " + key);
      held.add(key);
      return { release: async () => { held.delete(key); } };
    },
  };
}
function makeRepo(initial, { failGet = false, failSet = false } = {}) {
  const data = { ...initial };
  return {
    data,
    get: async (sku) => { if (failGet) throw new Error("db down"); return data[sku]; },
    set: async (sku, v) => { if (failSet) throw new Error("db down"); data[sku] = v; },
  };
}

test("the lock is released when the stock write fails", async () => {
  const locks = makeLocks();
  const svc = mod.createStockService({ lockManager: locks, stockRepo: makeRepo({ a: 10 }, { failSet: true }) });
  await svc.deduct("a", 1).catch(() => {});
  assert.strictEqual(locks.held.size, 0);
});

test("the lock is released when the stock read fails", async () => {
  const locks = makeLocks();
  const svc = mod.createStockService({ lockManager: locks, stockRepo: makeRepo({ a: 10 }, { failGet: true }) });
  await svc.deduct("a", 1).catch(() => {});
  assert.strictEqual(locks.held.size, 0);
});

test("the error still reaches the caller", async () => {
  const svc = mod.createStockService({ lockManager: makeLocks(), stockRepo: makeRepo({ a: 10 }, { failSet: true }) });
  await assert.rejects(() => svc.deduct("a", 1), /db down/);
});

test("insufficient stock releases the lock and reports it", async () => {
  const locks = makeLocks();
  const svc = mod.createStockService({ lockManager: locks, stockRepo: makeRepo({ a: 1 }) });
  assert.deepStrictEqual(await svc.deduct("a", 5), { ok: false, reason: "INSUFFICIENT_STOCK" });
  assert.strictEqual(locks.held.size, 0);
});

test("a later purchase works after an earlier failure", async () => {
  const locks = makeLocks();
  const failing = mod.createStockService({ lockManager: locks, stockRepo: makeRepo({ a: 10 }, { failSet: true }) });
  await failing.deduct("a", 1).catch(() => {});
  const healthy = mod.createStockService({ lockManager: locks, stockRepo: makeRepo({ a: 10 }) });
  assert.deepStrictEqual(await healthy.deduct("a", 2), { ok: true, remaining: 8 });
});

test("success releases the lock", async () => {
  const locks = makeLocks();
  const svc = mod.createStockService({ lockManager: locks, stockRepo: makeRepo({ a: 10 }) });
  await svc.deduct("a", 2);
  assert.strictEqual(locks.held.size, 0);
});
`,
  rubricHints: [
    "Identifies that every exit path must release the lock, including exceptions (try/finally).",
    "Does not swallow the error: the caller must still see the failure.",
    "Explains the blast radius: one failure blocks that SKU until the lock TTL expires.",
    "Senior signal: lock TTL / lease renewal, avoiding check-then-set races, or an atomic decrement in the database.",
  ],
  validation: { brokenFailsHidden: true, fixPassesHidden: true, attempts: 0, validatedAt: "2026-11-07T00:00:00.000Z" },
};
