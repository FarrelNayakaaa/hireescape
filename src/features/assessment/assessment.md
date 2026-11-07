# features/assessment — AGENTS.md (manager setup, assessment store, dashboard, export/import)

> **Owner: Dev A (Manager & Platform)** · Depends on: `saboteur`, `challenges`, `lib/assessment-token` ·
> Consumed by: Dev B's `escape-room` (read-only, via `getAssessmentBundle`) and `report`.
> Inherits the root `AGENTS.md`. See `ARCHITECTURE.md §5` (H5b, due **11:00**) for the interface Dev B relies on. Deliver `store.ts` + `bundle.ts` + `index.ts` first, then the pages.

This feature is the **manager's front door** and the **single place assessments and challenges are stored**.
It is the bridge between "Dev A creates something" and "Dev B plays it".

---

## Files

```text
features/assessment/
  store.ts                 zustand persist "he:assessments" (assessments + challenges) and "he:secrets" (referenceFix)
  bundle.ts                getAssessmentBundle(id), createDemoAssessment()
  lib/aliases.ts           list of fictional candidate aliases (no real names)
  lib/exportImport.ts      exportAll() / importAll(json) across every store (zod-validated)
  hooks/useCreateAssessment.ts   orchestrates: token → saboteur loop → save
  components/SetupForm.tsx       the /manager/new form
  components/AssessmentList.tsx  the /manager dashboard table
  components/CandidateLink.tsx   copy button + "Open as candidate"
  components/ExportImportMenu.tsx
  index.ts                 public API (client-safe): getAssessmentBundle, createDemoAssessment, useAssessmentStore (read selectors)
  __tests__/bundle.test.ts  __tests__/exportImport.test.ts
```

## Public API (Dev B depends on this exact shape)

```ts
// features/assessment/index.ts
export function getAssessmentBundle(
  id: string,
): { assessment: AssessmentConfig; challenge: Challenge } | null;   // NEVER includes referenceFix

export function useAssessmentBundle(id: string):
  { status: "loading" | "ready" | "not_found"; bundle: { assessment: AssessmentConfig; challenge: Challenge } | null };  // client hook; waits for persist hydration

export function createDemoAssessment(): Promise<string>;   // seeded, AI-ON, proctoring "browser"; signs a token via POST /api/assessment/token; resolves with the id
```

Rules:
- `Challenge` objects stored in `he:assessments` **must not contain `referenceFix`** (it lives only in `he:secrets`).
- `getAssessmentBundle` never reads `he:secrets`. Only `analyst` and `saboteur` (both Dev A) read secrets.
- Unknown id → `null`; Dev B shows a friendly not-found screen.

## `/manager` dashboard

- Table of assessments: alias, level, defect type, AI mode badge, proctoring mode, created time, status
  (not started / in progress / escaped / timeout), links: candidate link, report (if a session exists).
- Reads sessions through `listSessions()` from `features/session` (Dev B), read-only.
- Buttons: **New assessment**, **Quick demo assessment** (calls `createDemoAssessment()` → opens `/play/<id>`),
  **Export all** / **Import** (JSON), and **Load demo data** when `NEXT_PUBLIC_DEMO_MODE=1`.
- Empty state: one clear call to action, not a blank table.

## `/manager/new` setup form

Fields (see `AssessmentConfig` in `contracts.ts`):

| Field | Control | Notes |
|---|---|---|
| Candidate alias | text with fictional presets | placeholder text "Candidate A — Rani (fictional)"; never a real person |
| Level | segmented: junior / mid / senior | |
| Defect type | cards with icons (8 types) + "Surprise me" | filtered by level suggestions from `saboteur/AGENTS.md` |
| AI Assistance | toggle with one-line explanation of ON and OFF | ON: "We observe how they supervise AI." OFF: "Measures unaided work." |
| Proctoring | Off / Browser only / Camera + mic, plus "required" and "snapshots" switches | default **Browser only**, snapshots off; hint: "Camera + mic is most useful when AI is OFF." |
| Language | EN / ID | candidate-facing |
| Duration | 30 / 45 / 60 | default 45 |

Submit flow (`useCreateAssessment`):

1. `POST /api/assessment/token` → token (lifetime `durationMin + 30` min).
2. `useGenerateChallenge` from `features/saboteur` → `{ challenge, secret, validation, meta[] }`.
3. Save assessment + challenge + secret. Show "Challenge sealed ✓" with the validation checklist, the Agent
   Console panel and the candidate link.
4. If everything fails, the seeded fallback is used and the banner says why. **The form never ends in an error
   state that blocks the demo.**

## Export / import (`lib/exportImport.ts`)

- `exportAll()` → `{ version: 1, assessments, challenges, secrets, sessions, reports, integrity }`
  (integrity snapshots excluded unless the manager ticks "include snapshots").
- Reads other stores only through their public APIs (`exportSessions()` from `features/session`,
  `getIntegrityRecord` from `features/proctoring` when present).
- `importAll(json)` validates with zod and merges; on id collision keep the newest.
- Purpose: move a finished session from the "candidate laptop" to the "manager laptop", and back up the demo.

## Definition of Done

- [ ] `getAssessmentBundle` test: returns the challenge without `referenceFix`; unknown id → `null`.
- [ ] `createDemoAssessment()` works with no OpenAI key and no internet (it only needs the local dev server for the token).
- [ ] Creating an assessment with an invalid API key falls back to the seeded challenge with a visible banner.
- [ ] Export → clear localStorage → import restores assessments, sessions and reports.
- [ ] No real names anywhere in aliases or fixtures.
