import { expect, test } from "vitest";

test("loads shared contracts through the source alias", async () => {
  const contracts = await import("@/lib/contracts");
  expect(contracts).toBeDefined();
});
