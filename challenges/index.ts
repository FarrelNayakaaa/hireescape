import type { Challenge, DefectType, Level } from "@/lib/contracts";
import { challenge as cacheNoFallback } from "./seeded/cache-no-fallback.mid";
import { challenge as missingAwait } from "./seeded/missing-await.mid";
import { challenge as offByOne } from "./seeded/off-by-one.junior";
import { challenge as resourceLeak } from "./seeded/resource-leak.mid";
import { challenge as sharedMutation } from "./seeded/shared-mutation.junior";
import { challenge as swallowedException } from "./seeded/swallowed-exception.mid";
import { challenge as unboundedRetry } from "./seeded/unbounded-retry.mid";
import { challenge as unhandledNull } from "./seeded/unhandled-null.mid";

const levelOrder: Record<Level, number> = { junior: 0, mid: 1, senior: 2 };
const catalogue: Challenge[] = [
  cacheNoFallback, missingAwait, offByOne, resourceLeak,
  sharedMutation, swallowedException, unboundedRetry, unhandledNull,
].sort((a, b) => levelOrder[a.level] - levelOrder[b.level] || a.id.localeCompare(b.id));

export function listSeededChallenges(): Challenge[] {
  return [...catalogue];
}

export function getSeededChallenge(defectType?: DefectType, level?: Level): Challenge {
  if (defectType) {
    const matching = catalogue.filter((challenge) => challenge.defectType === defectType);
    return matching.find((challenge) => !level || challenge.level === level) ?? matching[0] ?? cacheNoFallback;
  }
  if (level) return catalogue.find((challenge) => challenge.level === level) ?? cacheNoFallback;
  return cacheNoFallback;
}
