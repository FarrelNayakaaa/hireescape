import type { ChallengeSecret } from "@/lib/contracts";

export const secret: ChallengeSecret = {
  challengeId: "seed-unhandled-null-mid",
  referenceFix: `// shippingService.js
function createShippingService({ addressRepo, rateTable, logger }) {
  const DEFAULT_ZONE = "JAWA";

  function zoneFor(address) {
    return (address.region && address.region.zone) || DEFAULT_ZONE;
  }

  async function quote(userId, weightKg) {
    if (weightKg <= 0) {
      throw new Error("weightKg must be positive");
    }
    const address = await addressRepo.findPrimary(userId);
    if (!address) {
      return { zone: null, cost: null, reason: "NO_ADDRESS" };
    }
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
};
