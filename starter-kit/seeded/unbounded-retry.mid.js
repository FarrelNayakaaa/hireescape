// Seeded challenge: unbounded_retry (mid). Pre-validated fallback for demo safety.
export const challenge = {
  id: "seed-unbounded-retry-mid",
  title: "INC-2461: Declined cards are charged three times",
  level: "mid",
  defectType: "unbounded_retry",
  language: "javascript",
  source: "seeded",
  brief: `INC-2461 — Customers with declined cards see three attempts on their bank app.

The payment gateway has flaky timeouts, so we retry up to 3 times. But risk
operations reports that cards declined for "insufficient funds" or "stolen card"
are also retried, which triggers fraud flags at the banks and angers customers.

Expected behaviour:
- Retry only temporary failures (errors with retryable = true), at most 3 attempts.
- A permanent failure (retryable is not true) stops immediately and returns
  { ok: false, reason: "NON_RETRYABLE", attempts: 1 }.
- Every failed attempt is still logged.`,
  starterCode: `// paymentService.js
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
  defectLines: [12, 16],
  visibleTests: `const temporary = () => Object.assign(new Error("gateway timeout"), { retryable: true });

test("charges on the first attempt", async () => {
  const gateway = { charge: async () => ({ id: "r1" }) };
  const svc = mod.createPaymentService({ gateway, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.charge("o1", 50000), { ok: true, receiptId: "r1", attempts: 1 });
});

test("retries a temporary failure", async () => {
  let calls = 0;
  const gateway = { charge: async () => { calls++; if (calls === 1) throw temporary(); return { id: "r2" }; } };
  const svc = mod.createPaymentService({ gateway, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.charge("o2", 50000), { ok: true, receiptId: "r2", attempts: 2 });
});
`,
  hiddenTests: `const temporary = () => Object.assign(new Error("gateway timeout"), { retryable: true });
const declined = () => Object.assign(new Error("card declined"), { retryable: false });

test("a declined card is not retried", async () => {
  let calls = 0;
  const gateway = { charge: async () => { calls++; throw declined(); } };
  const svc = mod.createPaymentService({ gateway, logger: fakes.silentLogger() });
  await svc.charge("o3", 50000);
  assert.strictEqual(calls, 1);
});

test("a declined card returns NON_RETRYABLE after one attempt", async () => {
  const gateway = { charge: async () => { throw declined(); } };
  const svc = mod.createPaymentService({ gateway, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.charge("o4", 50000), { ok: false, reason: "NON_RETRYABLE", attempts: 1 });
});

test("an error without a retryable flag is treated as permanent", async () => {
  let calls = 0;
  const gateway = { charge: async () => { calls++; throw new Error("unknown"); } };
  const svc = mod.createPaymentService({ gateway, logger: fakes.silentLogger() });
  await svc.charge("o5", 50000);
  assert.strictEqual(calls, 1);
});

test("temporary failures stop after 3 attempts", async () => {
  let calls = 0;
  const gateway = { charge: async () => { calls++; throw temporary(); } };
  const svc = mod.createPaymentService({ gateway, logger: fakes.silentLogger() });
  assert.deepStrictEqual(await svc.charge("o6", 50000), { ok: false, reason: "GATEWAY_ERROR", attempts: 3 });
  assert.strictEqual(calls, 3);
});

test("every failed attempt is logged", async () => {
  const logger = fakes.spyLogger();
  const gateway = { charge: async () => { throw temporary(); } };
  const svc = mod.createPaymentService({ gateway, logger });
  await svc.charge("o7", 50000);
  assert.strictEqual(logger.calls.warn.length, 3);
});
`,
  rubricHints: [
    "Separates retryable (timeouts, 5xx) from permanent failures (declines, validation); retries only the first kind.",
    "Notes that retrying a permanent failure cannot succeed and has real side effects (bank fraud flags).",
    "Treats an unknown error as non-retryable (safe default) and keeps the attempt cap.",
    "Senior signal: idempotency keys so a retried charge cannot double-charge, plus backoff with jitter.",
  ],
};

export const secret = {
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
