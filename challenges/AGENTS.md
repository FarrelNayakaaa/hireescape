# challenges — AGENTS.md (child: seeded, pre-validated challenges)

> **Owner: Dev A** · Consumed by: `features/saboteur` (fallback), `features/assessment` (`getSeededChallenge`, H5a).

> Inherits the root `AGENTS.md`. These challenges are the **safety net**: used when the Saboteur
> fails, in mock mode, and for the stage demo. They must always pass validation.

> **Harness dependency:** the validation test imports `runSuite` from `@/features/runner/harness` (Dev B ships it by 10:15).
> Until then import `starter-kit/harness.js` by relative path; switch when B's version lands. Do not edit `features/runner`.

> **Import alias:** `challenges/` lives outside `src/`, so it is imported as `@challenges` (index) and `@challenges/secrets`
> (tsconfig `paths` + vitest alias, set up in A0).

## What exists already (verified)

`starter-kit/seeded/` contains eight challenges (2 junior, 6 mid), all passing `starter-kit/validate-seeded.mjs`:

| File | defectType | Hidden on starter | Hidden on fix |
|---|---|---|---|
| `cache-no-fallback.mid.js` | cache_no_fallback | 3/6 pass | 6/6 |
| `unhandled-null.mid.js` | unhandled_null | 3/5 pass | 5/5 |
| `swallowed-exception.mid.js` | swallowed_exception | 2/5 pass | 5/5 |
| `off-by-one.junior.js` | off_by_one (junior) | 4/5 pass | 5/5 |
| `shared-mutation.junior.js` | shared_mutation (junior) | 3/5 pass | 5/5 |
| `missing-await.mid.js` | missing_await | 3/5 pass | 5/5 |
| `unbounded-retry.mid.js` | unbounded_retry | 2/5 pass | 5/5 |
| `resource-leak.mid.js` | resource_leak | 3/6 pass | 6/6 |

**Port task (A3)**: port each file to **two** TypeScript files so a candidate bundle can never contain a reference fix:
`challenges/seeded/<name>.ts` exports `challenge: Challenge` and `challenges/seeded/<name>.secret.ts` exports `secret: ChallengeSecret`
(keep the template-literal escapes `\`` and `\${` exactly). `challenges/index.ts` exports **only** challenges
(`getSeededChallenge`, `listSeededChallenges`); `challenges/secrets.ts` exports `getSeededSecret(id)` and may be imported **only**
by manager-side/server code (assessment store, analyst, saboteur). Then port `validate-seeded.mjs` to
`challenges/__tests__/seeded.test.ts` wired to `pnpm test:challenges`.

## File format

```ts
// challenges/seeded/cache-no-fallback.mid.ts
import type { Challenge } from "@/lib/contracts";
export const challenge: Challenge = {
  id: "seed-cache-no-fallback-mid", source: "seeded", /* …all other fields… */
  validation: { brokenFailsHidden: true, fixPassesHidden: true, attempts: 0, validatedAt: "2026-11-07T00:00:00.000Z" },
};

// challenges/seeded/cache-no-fallback.mid.secret.ts
import type { ChallengeSecret } from "@/lib/contracts";
export const secret: ChallengeSecret = { challengeId: "seed-cache-no-fallback-mid", referenceFix: `...` };
```

`validation` is **static** for seeded challenges; it is true because `pnpm test:challenges` proves it on every run.
(The manager UI can still re-run `validateChallenge` live to show the checklist.)

## Rules for adding a challenge

1. Follow every rule in `src/features/saboteur/AGENTS.md` (code shape, harness contract, sizes, brief style).
2. IDs: `seed-<defectType-with-dashes>-<level>`.
3. Fictional data only (product names like "Kopi Susu", user IDs like "u1").
4. Count `defectLines` by hand from line 1 of `starterCode` (the first line is the `// file.js` comment).
5. Run `pnpm test:challenges` — must be green before commit.

## Which one is the demo challenge

`seed-cache-no-fallback-mid` ("INC-2417"). It is the most relatable to Indonesian e-commerce engineers
(cache flaps during big sale events like 11.11/12.12) and shows three things in one fix: fallback,
observability, and not swallowing real DB errors. Mock fixtures in `src/lib/codex/fixtures/` must
describe this challenge.

## Nice-to-have (only after the core flow is done)

- `junior` and `senior` variants of the cache challenge (senior: add a red herring and an async
  ordering subtlety, e.g. `cache.set` not awaited vs awaited).
