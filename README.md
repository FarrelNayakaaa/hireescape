# HireEscape

Evidence-backed first-round technical screening, designed as a 45-minute **escape room** inside a broken backend
codebase. Four Codex agents (Saboteur, Inquisitor, Assistant, Analyst) run the product; **code verifies, humans decide.**
Built by **Team Catfish Farmer** at the Regional Codex Hackathon Indonesia (Sea × OpenAI).

> The AI presents evidence; a human makes the hiring decision. Nothing is auto-rejected. Demo data uses fictional candidates only.

---

## Start here

| You are | Read in this order | Then |
|---|---|---|
| **Dev A** (Manager & Platform) | `docs/prompts/00_START_HERE.md` → `AGENTS.md` → `ARCHITECTURE.md` → `docs/prompts/DEV_A_PROMPTS.md` → child `AGENTS.md` of each folder you touch | run prompts **A0 → A9** |
| **Dev B** (Candidate Experience) | `docs/prompts/00_START_HERE.md` → `AGENTS.md` → `ARCHITECTURE.md` → `docs/prompts/DEV_B_PROMPTS.md` → child `AGENTS.md` of each folder you touch | run prompts **B0 → B9** |
| **Support** (demo/QA, pitch, docs) | `docs/DEV_PLAYBOOK.md` (§4.3, §5, §7) → `docs/WRITEUP.md` → `docs/pitch/` | checklists in the playbook |
| **Codex** | the first lines of every prompt block (ROLE / READ FIRST / SCOPE) — they say which paths you may edit | |

## Folder map (owner in brackets)

```text
hireescape/
├─ README.md                      this file
├─ AGENTS.md                      root rules Codex reads on every task                      [A + B]
├─ ARCHITECTURE.md                system design · ownership matrix · handoff interfaces        [A + B]
├─ CODEX_LOG.md                   how Codex was used (judging criterion #6)                  [A + B append]
├─ docs/
│  ├─ prompts/                    START_HERE · DEV_A_PROMPTS (A0–A9) · DEV_B_PROMPTS (B0–B9) — complete Codex prompts
│  ├─ DEV_PLAYBOOK.md             team split · timeline · support checklists · integration checks
│  ├─ CONTRACT_REQUESTS.md        cross-dev requests (instead of editing the other's files)
│  ├─ WRITEUP.md                  project writeup for the submission form
│  ├─ PITCH_DECK_PROMPT.md        deck prompt + Q&A answers (the deck itself is in pitch/)
│  ├─ pitch/HireEscape_Pitch_Deck.pptx    editable 11-slide deck with speaker notes
│  └─ samples/                    real recorded session JSON for cross-dev testing
├─ scripts/                       ownership guard (`pnpm check:owner`), mediapipe copy, list-models           [A]
├─ challenges/AGENTS.md           seeded, pre-validated challenges                               [A]
├─ src/
│  ├─ app/AGENTS.md               routes and API wiring                                          [A; B: /play + 2 APIs]
│  ├─ components/
│  │  ├─ ui/AGENTS.md             design system, generic primitives, manager/report screens     [A]
│  │  └─ game/AGENTS.md           candidate-journey gamification                                  [B]
│  ├─ lib/codex/AGENTS.md         the only place that calls OpenAI; mocks; Agent Console        [A; B: 2 prompts]
│  └─ features/
│     ├─ saboteur/  assessment/  analyst/  report/                      manager side            [A]
│     └─ runner/  session/  escape-room/  inquisitor/  assistant/  proctoring/   candidate side [B]
└─ starter-kit/                   VERIFIED reference code — read-only, port into src/
   ├─ harness.js  provenance.js  validate-seeded.mjs  seeded/ (8 challenges)
   ├─ proctoring/integrity.js
   └─ codex/ (client, prompts, route + health examples, model lister)
```

Every folder under `src/` that has a feature contains one `AGENTS.md` with its rules, public API and Definition of Done.

## Quick facts

- **Stack:** Next.js (App Router) + TypeScript strict, Tailwind, Zustand + localStorage, Monaco, Web Worker runner, `zod`, OpenAI Responses API.
- **No database, no server state.** API routes only call Codex.
- **Deadline:** feature freeze **15:00**, submit **16:15**, hard deadline **16:30**.

## Commands (after Dev A's scaffold)

```bash
pnpm install
cp .env.example .env.local      # OPENAI_API_KEY, OPENAI_MODEL, OPENAI_MODEL_FAST, ASSESSMENT_SECRET — or CODEX_MOCK=1
pnpm dev                        # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test && pnpm test:challenges
pnpm check:owner A     # or B — fails if you edited a file your role does not own
node starter-kit/validate-seeded.mjs    # works today: all 8 seeded challenges must PASS
```

## What was verified before the build

`starter-kit/` JavaScript was executed: the test harness (syntax errors, `require()` attempts, hanging promises), line provenance,
integrity-signal folding, and all eight seeded challenges (hidden tests fail on the bug and pass on the fix).
The TypeScript in `starter-kit/codex/` was written against the OpenAI Responses API but could **not** be executed offline:
run `/api/health/codex` in the first hour.

## Deployed demo and A9 QA

Production: **https://hireescape.vercel.app** · Fictional backup report: **https://hireescape.vercel.app/report/demo**.

Open the backup report once and wait for **“Offline backup ready”** before disconnecting. It then supports reload and reopening in the same browser profile without the network. Only the fictional report and public assets are cached; assessment/session data and API responses are excluded.

A9 verified the deployed live manager → three rooms → evidence-report flow, mock mode, invalid-key fallbacks, storage recovery, malformed imports, AI-off enforcement, timeout/zero-test reports, two themes at 1280×800 and 1920×1080, reduced motion, and offline reload. Typecheck, lint, 429 tests, seeded validations, production build, ownership checks, and the candidate-bundle scan passed. Three opt-in tests remain skipped and lint retains two existing script warnings.

Proctoring is outside the shipped core in this checkout; do not claim camera/microphone or browser-integrity collection. Use proctoring Off for the core demonstration. Session-specific report links require matching browser data or an imported backup.
