// Manager/server side only. Importing this from candidate code is forbidden (ESLint enforces it).
import type { ChallengeSecret } from "@/lib/contracts";
import { secret as cacheNoFallback } from "./seeded/cache-no-fallback.mid.secret";
import { secret as missingAwait } from "./seeded/missing-await.mid.secret";
import { secret as offByOne } from "./seeded/off-by-one.junior.secret";
import { secret as resourceLeak } from "./seeded/resource-leak.mid.secret";
import { secret as sharedMutation } from "./seeded/shared-mutation.junior.secret";
import { secret as swallowedException } from "./seeded/swallowed-exception.mid.secret";
import { secret as unboundedRetry } from "./seeded/unbounded-retry.mid.secret";
import { secret as unhandledNull } from "./seeded/unhandled-null.mid.secret";

const secrets = new Map<string, ChallengeSecret>([
  cacheNoFallback, missingAwait, offByOne, resourceLeak,
  sharedMutation, swallowedException, unboundedRetry, unhandledNull,
].map((secret) => [secret.challengeId, secret]));

export function getSeededSecret(challengeId: string): ChallengeSecret | null {
  return secrets.get(challengeId) ?? null;
}
