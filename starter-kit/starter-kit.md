# starter-kit — verified reference code

Written and executed before the build to de-risk the demo. **Port these, don't rewrite them.**

| File | What it is | Port to |
|---|---|---|
| `harness.js` | Environment-agnostic test harness (`test`, `assert` subset of node:assert, `fakes`, `runSuite`). Handles syntax errors, `require()` attempts, and hanging promises. | `src/features/runner/harness.ts` |
| `provenance.js` | Dependency-free LCS line diff + `applyWithProvenance` + `provenanceMetrics` (starter / manual / ai / ai_edited / paste). | `src/features/session/lib/provenance.ts` |
| `seeded/*.js` | Eight challenges with reference fixes: cache_no_fallback, unhandled_null, swallowed_exception, missing_await, unbounded_retry, resource_leak (mid) and off_by_one, shared_mutation (junior). | `challenges/seeded/*.ts` |
| `validate-seeded.mjs` | Runs the Saboteur validation rules (V1–V5) on every seeded challenge. | `challenges/__tests__/seeded.test.ts` |
| `proctoring/integrity.js` | Pure folding of camera/mic/browser samples into integrity signals + deterministic "review suggested" summary. Tested in Node. | `src/features/proctoring/lib/integrity.ts` |
| `codex/client.ts` | `callStructured()` on the Responses API with structured outputs, timeout, retry, mock mode, `AgentMeta` telemetry. | `src/lib/codex/client.ts` |
| `codex/prompts.ts` | Full system prompts + input builders for all four agents (Saboteur, Inquisitor, Assistant, Analyst). | `src/lib/codex/prompts/*.ts` |
| `codex/route.example.ts` | Complete agent route (token + toggle check, zod, Codex call, post-validation, errors). | `src/app/api/assistant/route.ts` (copy pattern to the other three) |
| `codex/health.example.ts` | Live health check of key + model. | `src/app/api/health/codex/route.ts` |
| `codex/list-models.mjs` | Lists model ids your key can use (Codex-family first). | `scripts/list-models.mjs` |

Note: `codex/*.ts` were written against the OpenAI Node SDK's Responses API but could not be executed
offline here; the JS files (`harness`, `provenance`, `integrity`, seeded challenges) were executed and pass.

Run now (Node 20+):

```bash
cd starter-kit && node validate-seeded.mjs
# PASS  seed-cache-no-fallback-mid  hidden on starter: 3/6 pass, on fix: 6/6  diff lines 14-24
# PASS  seed-swallowed-exception-mid  hidden on starter: 2/5 pass, on fix: 5/5  diff lines 15-15
# PASS  seed-unhandled-null-mid  hidden on starter: 3/5 pass, on fix: 5/5  diff lines 6-13
```
