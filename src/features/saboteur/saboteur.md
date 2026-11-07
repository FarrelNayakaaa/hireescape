# features/saboteur — AGENTS.md (Codex role #1: challenge generator)

> **Owner: Dev A** · Depends on: `features/runner` (Dev B, `runTests`, H7), `challenges`, `lib/codex` · Consumed by: `features/assessment`.

> Inherits the root `AGENTS.md`. The Saboteur writes a small realistic backend file, plants exactly
> **one** seniority-appropriate defect, and writes hidden tests. **Nothing reaches a candidate unless
> it is proven by execution**: hidden tests must fail on the broken code and pass on the reference fix.

> **Runner dependency (H7):** validation calls `runTests` from `features/runner` (Dev B, ready by 10:45). Until then, build and
> test `staticChecks` and the loop against a stub that returns canned `RunResult`s.

## Responsibilities

1. Generate `{ title, brief, starterCode, referenceFix, visibleTests, hiddenTests, defectLines, rubricHints }`.
2. Validate by **running** the tests (runner feature), plus static checks.
3. Regenerate with targeted feedback on failure (max 3 attempts total).
4. Fall back to a seeded challenge (`challenges/`) if all attempts fail or the API is down.
5. Produce a validation report that the manager sees on screen.

## Files

```text
features/saboteur/
  schema.ts                      SaboteurRequest, SaboteurOutput (zod)
  server/generateChallenge.ts    one Codex call (one attempt) → used by /api/saboteur
  lib/staticChecks.ts            pure: forbidden tokens, size bounds, compile check, diff/defectLines overlap
  lib/validateChallenge.ts       orchestrates: static checks + runner (visible/hidden × starter/fix)
  hooks/useGenerateChallenge.ts  client loop: generate → validate → regenerate(feedback) → fallback
  components/SaboteurProgress.tsx    gamified step list (see ui AGENTS.md)
  components/ValidationChecklist.tsx
  __tests__/staticChecks.test.ts
```

**Why the loop runs on the client:** validation uses the same Web Worker runner the candidate will
use (one execution path = fewer surprises), and each server request stays within serverless time limits.

## Request / Output schema

```ts
export const SaboteurRequest = z.object({
  level: z.enum(["junior", "mid", "senior"]),
  defectType: z.enum([
    "swallowed_exception", "unhandled_null", "cache_no_fallback",
    "off_by_one", "shared_mutation", "missing_await", "unbounded_retry", "resource_leak",
  ]),
  domainHint: z.string().max(60).nullable(),      // e.g. "e-commerce checkout"; null = model picks
  previousFailures: z.array(z.string()).max(10),  // feedback from earlier attempts
});

export const SaboteurOutput = z.object({
  title: z.string().max(90),
  brief: z.string().max(1200),
  starterCode: z.string(),
  referenceFix: z.string(),
  visibleTests: z.string(),
  hiddenTests: z.string(),
  defectLines: z.array(z.number().int().min(1)).length(2), // [start, end], 1-based inclusive
  rubricHints: z.array(z.string().max(200)).min(2).max(5),
});
```

## Generated code shape (put these rules in the system prompt verbatim)

- One CommonJS file. Exports a **factory** taking injected dependencies, e.g.
  `function createXService({ cache, repo, logger, ... }) { ...; return { method }; }`
  and ends with `module.exports = { createXService };`
- **No** `require`, `import`, `process`, `fetch`, `eval`, `Function(`, `setInterval`, file/network I/O,
  `Date.now()` dependence, or randomness. `async/await` is allowed.
- Indonesian e-commerce flavour is welcome (products, shipping zones, refunds, vouchers, Rupiah amounts),
  but names must be generic/fictional.
- Size by level: **junior 25–50 lines** (one function, defect fairly visible) · **mid 40–100 lines**
  (2–3 functions, defect in one path) · **senior 80–150 lines** (defect interacts with async ordering or
  partial failure, plus **one red herring**: a line that looks suspicious but is correct).
- `referenceFix` differs from `starterCode` by **≤ 20 changed lines**, all near `defectLines`.
- First line is a file comment (`// productService.js`). `defectLines` counts from that line as 1.

## Test harness contract (must match `starter-kit/harness.js`)

Tests are plain JS with these globals only:
- `test(name, asyncFn)`
- `assert.ok | equal | strictEqual | notStrictEqual | deepStrictEqual | throws | rejects | doesNotReject`
  (subset of `node:assert`; `rejects/throws` accept a RegExp or an Error class)
- `fakes.memoryCache() | failingCache({ failGet, failSet, error }) | silentLogger() | spyLogger()`
  (`spyLogger().calls.warn/error/info/debug` are arrays of argument arrays)
- `mod` = the candidate file's `module.exports`

Rules for tests:
- `visibleTests`: 2–3 happy-path tests that **pass on the broken starter**.
- `hiddenTests`: 4–7 tests. **≥ 1 fails on starter, all pass on referenceFix**. Include at least one
  regression test that passes on both (protects against a "fix" that breaks normal behaviour).
- External dependencies are always fakes defined in the tests or from `fakes.*`. No real timers > 50ms.
- Test names describe behaviour ("falls back to repo when cache.get times out"), never the fix.

## Defect catalogue

| defectType | What is planted | What hidden tests prove |
|---|---|---|
| `swallowed_exception` | A `catch` that hides a failure the caller must know about (empty catch, or returns success). | The failure is signalled (return value or rethrow), state is not corrupted, and it is logged with context. |
| `unhandled_null` | Dereference of a value from an external source (repo/upstream) that can be `null`/missing. | Documented fallback for null/missing data; unchanged behaviour for valid data. |
| `cache_no_fallback` | Cache `get`/`set` failures propagate and fail the request. | Request succeeds from the source of truth when cache fails; cache failure is logged; real source failures still propagate. |
| `off_by_one` | A comparison at a boundary uses the wrong operator (`<=` vs `<`). | Both sides of the boundary (equal and just below); neighbouring correct comparisons unchanged. |
| `shared_mutation` | A function edits the caller's input (array/object) instead of returning a copy. | Input is unchanged after the call; calling twice gives the same result; returned objects are new. |
| `missing_await` | A promise that must finish first is not awaited, so later steps run too early. | With a slow fake (≤ 10ms timer) the work is complete before the function resolves and before the next side effect. **Never rely on an unhandled rejection** (it fails vitest). |
| `unbounded_retry` | Retries apply to every error, including permanent ones (or have no cap). | Permanent errors are not retried; temporary errors stop at the cap; each failure is logged; unknown errors are treated as permanent. |
| `resource_leak` | A lock/handle/connection is released only on the happy path. | The resource is released on success, on early return, and when a dependency throws; the error still propagates; a later call works. |

**Which defect types suit which level**

| Level | Good picks | How to scale it |
|---|---|---|
| junior | `off_by_one`, `shared_mutation`, `unhandled_null` | one function, fix is 1–4 lines, bug is visible in the brief's symptom |
| mid | `swallowed_exception`, `cache_no_fallback`, `missing_await`, `unbounded_retry`, `resource_leak` | 2–3 functions, one failure path |
| senior | any mid type + a red herring + partial failure (e.g. a missing await *and* an error path that must release a resource) | 80–150 lines, fix touches two places |

Suggested mapping to job roles (scenario flavour only, still plain JavaScript): backend → cache/refund/stock; web → `shared_mutation`, `missing_await`, stale state; AI engineer → `unbounded_retry` around an LLM client, unvalidated model output (`unhandled_null`); mobile → sync/offline queues (`resource_leak`, `missing_await`).

The **brief** is an incident ticket (ID, symptom, a log line, expected behaviour). It must never name
the faulty line or the fix. See `starter-kit/seeded/*.js` for three verified examples of the exact style.

## Validation pipeline (`lib/validateChallenge.ts`)

| ID | Check | How |
|---|---|---|
| S1 | Schema valid | zod |
| S2 | Forbidden tokens absent in starter/fix | regex list above |
| S3 | Size within level bounds | line count |
| S4 | Both files compile | `loadModule()` from harness in try/catch |
| S5 | Diff starter→fix ≤ 20 lines and overlaps `defectLines` | `diffLineOps` from `session/lib/provenance.ts` |
| R1 | Visible tests all pass on starter | runner |
| R2 | Hidden tests: ≥ 1 fail on starter, and no `runtimeError` | runner |
| R3 | Hidden tests all pass on fix | runner |
| R4 | Visible tests all pass on fix | runner |
| R5 | No test timed out | runner |

Any failed check → a short feedback string, e.g.
`"R3 failed: hidden test 'logs the cache failure' fails on referenceFix: Expected truthy value"`.
These go into `previousFailures` on the next attempt.

Result written to `Challenge.validation = { brokenFailsHidden, fixPassesHidden, attempts, validatedAt }`.
`referenceFix` is then moved into `ChallengeSecret` and removed from the `Challenge` object.

## Fallback

After 3 failed attempts, a Codex error, or > 150s total: pick the seeded challenge matching
`defectType` (else any) and show the banner **"Using a pre-validated challenge"** with the reason.
The seeded challenge still runs through `validateChallenge` (takes < 1s) so the checklist is real.

## System prompt outline (`src/lib/codex/prompts/saboteur.ts`)

```text
ROLE: You are the Saboteur in a technical hiring tool. You write a small, realistic backend module,
then plant exactly ONE defect of the requested type, then write tests that prove it.
GOAL: A fair, realistic debugging task for a {level} backend engineer that takes 15–25 minutes.
HARD RULES:
- Exactly one defect. The rest of the code is correct and idiomatic.
- [code shape rules] [harness contract] [test rules] [size by level]
- The brief is an incident ticket; never reveal the line or the fix.
- referenceFix is the minimal correct fix a strong engineer would write.
- defectLines: 1-based inclusive range in starterCode that contains the defect.
- If previousFailures is non-empty, fix exactly those problems and change nothing else.
EXAMPLE: [include the full cache-no-fallback seeded challenge as a one-shot example]
OUTPUT: JSON matching the schema. No markdown fences inside code strings.
```

## UI (`SaboteurProgress`)

Steps with ticks as they complete: "Writing service" → "Planting one bug" → "Writing hidden tests" →
"Proving tests FAIL on broken code" → "Proving tests PASS on the fix" → "Challenge sealed ✓".
Show the attempt number ("Attempt 2/3 — fixing: hidden test failed on reference fix"). Judges should
see the self-correction loop. Use the `ai` (purple) accent + `CodexRoleChip role="saboteur"`.

## Definition of Done

- [ ] `staticChecks` unit-tested (forbidden tokens, size bounds, overlap).
- [ ] Generation succeeds for each defect type at its natural level in ≥ 2 of 3 live tries; otherwise tune the prompt or restrict the manager's picker to the types that are reliable.
- [ ] Fallback path demonstrated by temporarily setting an invalid API key.
- [ ] `referenceFix` stored only in `ChallengeSecret`.
