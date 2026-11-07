import type { Challenge } from "@/lib/contracts";

// Seeded challenge: unhandled_null (mid). Pre-validated fallback for demo safety.
export const challenge: Challenge = {
  id: "seed-unhandled-null-mid",
  title: "INC-2453: Checkout crashes for users without an address",
  level: "mid",
  defectType: "unhandled_null",
  language: "javascript",
  source: "seeded",
  brief: `INC-2453 — Shipping quote crashes checkout with HTTP 500.

Reported by CS: new users who have not saved a primary address, and some users with
legacy addresses migrated from the old system, cannot reach the payment step.
Error in logs:
  TypeError: Cannot read properties of null (reading 'region')

Expected behaviour:
- No primary address: return { zone: null, cost: null, reason: "NO_ADDRESS" }
  so the UI can ask the user to add one.
- Address without region data: quote using the default zone (JAWA).
- Existing behaviour for normal addresses must not change.`,
  starterCode: `// shippingService.js
function createShippingService({ addressRepo, rateTable, logger }) {
  const DEFAULT_ZONE = "JAWA";

  function zoneFor(address) {
    return address.region.zone || DEFAULT_ZONE;
  }

  async function quote(userId, weightKg) {
    if (weightKg <= 0) {
      throw new Error("weightKg must be positive");
    }
    const address = await addressRepo.findPrimary(userId);
    const zone = zoneFor(address);
    const rate = rateTable[zone];
    if (rate === undefined) {
      logger.warn("unknown zone, using default", { zone });
      return { zone: DEFAULT_ZONE, cost: Math.ceil(weightKg) * rateTable[DEFAULT_ZONE] };
    }
    return { zone, cost: Math.ceil(weightKg) * rate };
  }

  return { quote };
}

module.exports = { createShippingService };
`,
  defectLines: [6, 14],
  visibleTests: `const rates = { JAWA: 9000, SUMATERA: 15000 };

test("quotes a known zone", async () => {
  const addressRepo = { findPrimary: async () => ({ city: "Medan", region: { zone: "SUMATERA" } }) };
  const svc = mod.createShippingService({ addressRepo, rateTable: rates, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.quote("u1", 1.2), { zone: "SUMATERA", cost: 30000 });
});

test("rejects non-positive weight", async () => {
  const addressRepo = { findPrimary: async () => ({ region: { zone: "JAWA" } }) };
  const svc = mod.createShippingService({ addressRepo, rateTable: rates, logger: fakes.silentLogger() });
  await assert.rejects(() => svc.quote("u1", 0), /weightKg must be positive/);
});
`,
  hiddenTests: `const rates = { JAWA: 9000, SUMATERA: 15000 };

test("returns NO_ADDRESS when the user has no primary address", async () => {
  const addressRepo = { findPrimary: async () => null };
  const svc = mod.createShippingService({ addressRepo, rateTable: rates, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.quote("u2", 2), { zone: null, cost: null, reason: "NO_ADDRESS" });
});

test("uses default zone when region is null (legacy address)", async () => {
  const addressRepo = { findPrimary: async () => ({ city: "Bandung", region: null }) };
  const svc = mod.createShippingService({ addressRepo, rateTable: rates, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.quote("u3", 2), { zone: "JAWA", cost: 18000 });
});

test("uses default zone when region has no zone", async () => {
  const addressRepo = { findPrimary: async () => ({ city: "Bogor", region: {} }) };
  const svc = mod.createShippingService({ addressRepo, rateTable: rates, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.quote("u4", 1), { zone: "JAWA", cost: 9000 });
});

test("unknown zone falls back to default and warns", async () => {
  const logger = fakes.spyLogger();
  const addressRepo = { findPrimary: async () => ({ region: { zone: "MARS" } }) };
  const svc = mod.createShippingService({ addressRepo, rateTable: rates, logger });
  assert.deepStrictEqual(await svc.quote("u5", 1), { zone: "JAWA", cost: 9000 });
  assert.ok(logger.calls.warn.length >= 1);
});

test("known zone behaviour is unchanged", async () => {
  const addressRepo = { findPrimary: async () => ({ region: { zone: "SUMATERA" } }) };
  const svc = mod.createShippingService({ addressRepo, rateTable: rates, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.quote("u6", 3), { zone: "SUMATERA", cost: 45000 });
});
`,
  rubricHints: [
    "Distinguishes 'no address' (a user state the UI must handle) from 'missing region' (data quality, use default).",
    "Guards at the boundary where external data enters (repo result), not by wrapping everything in try/catch.",
    "Does not change behaviour for valid addresses.",
    "Senior signal: mentions fixing or backfilling legacy data, or validating at write time.",
  ],
  validation: { brokenFailsHidden: true, fixPassesHidden: true, attempts: 0, validatedAt: "2026-11-07T00:00:00.000Z" },
};
