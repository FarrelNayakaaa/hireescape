# HireEscape — ARCHITECTURE.md

> **Read this after `AGENTS.md`.** `AGENTS.md` says *how to write code here*. This file says *what the
> system is, who builds which part, and how the two developers' parts connect* so that nobody edits the
> same file at the same time.
>
> Two people prompt Codex: **Dev A (Manager & Platform)** and **Dev B (Candidate Experience)**.
> The split follows the **user journey**, not the technical layer, so each dev can demo their half alone.

---

## 1. System at a glance

```text
┌───────────────────────────── Browser (Chrome, laptop) ─────────────────────────────┐
│                                                                                    │
│  MANAGER APP  (Dev A)                       CANDIDATE APP  (Dev B)                 │
│  /  ·  /manager  ·  /manager/new            /play/[assessmentId]                   │
│  /report/[sessionId]  ·  /report/demo       Room 0 → Rules → Room 1 → 2 → 3        │
│                                                                                    │
│  ┌──────────────┐  ┌───────────────┐        ┌──────────────┐  ┌────────────────┐   │
│  │ assessment   │  │ report        │        │ escape-room  │  │ proctoring     │   │
│  │ saboteur     │  │ analyst       │        │ inquisitor   │  │ (on-device)    │   │
│  │ challenges   │  │ (verifier)    │        │ assistant    │  │ MediaPipe,     │   │
│  └──────┬───────┘  └───────┬───────┘        └──────┬───────┘  │ Web Audio      │   │
│         │ writes           │ reads                 │ writes   └────────────────┘   │
│         ▼                  ▼                       ▼                               │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │ localStorage (zustand persist)  he:assessments · he:secrets · he:sessions   │   │
│  │                                 he:integrity · he:reports                   │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
│  ┌── Web Worker (Dev B) ──┐   runs candidate code against visible + hidden tests   │
│  │ runner.worker.ts       │   (also used by Dev A to validate generated challenges)│
│  └────────────────────────┘                                                        │
└───────────────┬────────────────────────────────────────────────────────────────────┘
                │ fetch (JSON)
┌───────────────▼──────────────── Next.js API routes (Node, stateless) ──────────────┐
│ /api/saboteur (A)   /api/analyst (A)   /api/assessment/token (A)   /api/health (A)  │
│ /api/inquisitor (B) /api/assistant (B)                                              │
│        └──────────── all model calls go through src/lib/codex/client.ts (A) ───────┤
└───────────────┬────────────────────────────────────────────────────────────────────┘
                │ OpenAI Responses API + structured outputs (zod)
        ┌───────▼────────┐
        │ Codex / OpenAI │   4 separate agents: Saboteur · Inquisitor · Assistant · Analyst
        └────────────────┘
```

Key property: **there is no database and no server state.** The server only calls Codex. Everything
else lives in the browser, which keeps the demo to one deployable app.

---

## 2. Decisions that shape everything (ADR-lite)

| # | Decision | Why | Consequence to be honest about |
|---|---|---|---|
| 1 | One Next.js app (App Router, TypeScript strict), API routes as the only backend | one repo, one deploy, two devs | routes are stateless |
| 2 | **No database**; Zustand + localStorage | zero infra in a one-day build | reports live in the browser that made them; export/import JSON moves them |
| 3 | Tests run **in the browser** (Web Worker) | no Docker/sandbox to run | hidden tests are visible in devtools; production would use a server sandbox |
| 4 | **JavaScript challenges only**, one file each | one runner, fully executable, verifiable | other languages would need new runners (out of scope) |
| 5 | **Code verifies, models propose** | trust: claims need evidence, challenges need proof | extra validators to write (`verifyClaims`, `validateChallenge`) |
| 6 | Proctoring is **on-device, optional, isolated** | privacy; fairness; keeps skill evaluation clean | cannot catch a second device; signals are hints, not proof |
| 7 | Four **separate** Codex agents, no shared state | role clarity; Analyst stays independent | four prompts + four fixtures to maintain |
| 8 | OpenAI **Responses API** + `zod` structured output | typed, parseable outputs | schemas must follow structured-output rules (no optionals) |
| 9 | **Mock mode first** (`CODEX_MOCK=1`) | both devs build without waiting for the API; stage fallback | fixtures must stay in sync with schemas (tests enforce it) |
| 10 | Split work by **journey** (manager vs candidate) | each dev owns a vertical slice end-to-end | five handoff interfaces (§5) must stay stable |

---

## 3. Modules and dependency rules

```text
src/
  app/                     routes + API wiring (thin)                         A (B: /play, 2 API routes)
  components/
    ui/                    design system, generic primitives                  A
    game/                  candidate-journey gamification primitives          B
  lib/
    contracts.ts           shared types — single source of truth              A (B appends, §4.3)
    codex/                 the ONLY place that calls OpenAI                   A (B: 2 prompts + 2 fixtures)
    assessment-token.ts    HMAC token that enforces the AI toggle on the server   A
    hooks/                 useIdle, useDebouncedCallback                      B
  features/
    saboteur/  assessment/  analyst/  report/        ← manager side         A
    runner/  session/  escape-room/  inquisitor/  assistant/  proctoring/   B
challenges/                seeded, pre-validated challenges                    A
scripts/ test/            ownership guard, mediapipe copy, test stubs         A
starter-kit/               verified reference code (read-only; port from it)   —
```

**Import rules (enforced by review + ESLint `no-restricted-imports`):**

```text
app ─► features/*, components/*, lib/*
features/X ─► lib/*, components/ui, components/game
features/X ─► features/Y ONLY through Y/index.ts and ONLY along these arrows:

   assessment ─► saboteur, challenges            (A internal)
   saboteur   ─► runner                          (A → B: validation uses the worker, H7a/H7b)
   report     ─► analyst, session, proctoring    (A → B: read-only)
   analyst    ─► session                         (A → B: types + provenance helpers)
   escape-room─► runner, session, inquisitor, assistant, proctoring, assessment(read bundle only)
   (nothing imports report, saboteur or analyst from the candidate side)

components/game ─► components/ui only          components/ui ─► nothing in features/
lib/* ─► never imports features/*               server-only code ─► only under features/*/server or lib/codex
```

---

## 4. Ownership: who may edit what

### 4.1 The rule

**One folder (or file), one owner. Codex prompts must name the paths they may touch.**
A dev never edits a path owned by the other dev — they ask (§4.3). This is how two people use Codex at
the same time without merge conflicts.

### 4.2 Ownership matrix

| Path | Owner | Notes |
|---|---|---|
| `package.json`, lockfile, configs (`next/tailwind/tsconfig/eslint/vitest`) | **A** | **Dependency freeze after scaffold (09:30).** A installs *all* planned dependencies in one commit: runtime `zustand zod openai server-only framer-motion lucide-react @monaco-editor/react monaco-editor @mediapipe/tasks-vision clsx`; dev `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`. New dependency = request. |
| `public/mediapipe/**`, `next.config.ts` (headers) | **A** | placed at scaffold time; B only consumes |
| `src/app/layout.tsx`, `globals.css`, `/page.tsx` (landing) | **A** | |
| `src/app/manager/**`, `src/app/report/**` | **A** | |
| `src/app/api/saboteur`, `analyst`, `assessment/**`, `health/**` | **A** | |
| `src/app/play/**` | **B** | candidate route |
| `src/app/api/inquisitor`, `src/app/api/assistant` | **B** | |
| `src/lib/contracts.ts` | **A** (B appends in its block, §4.3) | |
| `src/lib/*.ts` (top-level: `contracts`, `http`, `api-client`, `assessment-token`), `src/lib/__tests__/**`, `src/types/**` | **A** | `src/lib/hooks/**` and `src/lib/i18n/**` are B's |
| `src/lib/codex/client.ts`, `models.ts`, `agentConsole.ts`, `prompts/saboteur.ts`, `prompts/analyst.ts`, `fixtures/saboteur.json`, `fixtures/analyst.json` | **A** | |
| `src/lib/codex/prompts/inquisitor.ts`, `prompts/assistant.ts`, `fixtures/inquisitor.json`, `fixtures/assistant.json` | **B** | B edits **only these four** inside `lib/codex/` |
| `src/lib/hooks/**`, `src/lib/i18n/**` | **B** | `useIdle`, `useDebouncedCallback`; candidate-facing strings |
| `src/components/ui/**` | **A** | generic: Button, AccentCard, PillTitle, NumberBadge, NeonArcs, Toast, StepList, AgentAvatar, AgentChip, EvidenceChip, AiModeBadge, BasisLabel |
| `src/components/game/**` | **B** | RoomDoor, KeyCounter, Timer, SignalMap, IntegrityShield, RoomIntroCard, IncidentTicket |
| `src/features/saboteur/**`, `assessment/**`, `analyst/**`, `report/**` | **A** | |
| `challenges/**` | **A** | |
| `src/features/runner/**`, `session/**`, `escape-room/**`, `inquisitor/**`, `assistant/**`, `proctoring/**` | **B** | |
| `docs/**`, `CODEX_LOG.md`, `README.md` | shared | append-only: each dev adds only their own rows; support roles maintain docs |
| `starter-kit/**` | nobody | read-only reference; port into `src/`, never edit in place |

### 4.3 Changing something you do not own

| Situation | What to do |
|---|---|
| You need a new/changed type in `contracts.ts` | **B**: append to the `// ── Dev B additions ──` block at the end of the file (add only, never edit or delete existing lines), then post in chat. **A**: edit directly and post in chat. Breaking changes: write the request in `docs/CONTRACT_REQUESTS.md` first. |
| You need a new dependency | Add a request to `docs/CONTRACT_REQUESTS.md`; A installs within 15 min. |
| You need a new generic UI primitive | Build it locally inside your own feature folder; ask A to promote it to `components/ui` after the event (or sooner if reused). |
| You found a bug in the other dev's folder | Write it in chat/`CONTRACT_REQUESTS.md`. Do **not** fix it yourself. |
| Merge | Rebase on `main` before every merge; run `pnpm typecheck && pnpm lint && pnpm test && pnpm check:owner A\|B`; merge your own work (no review wait) and post "merged: <what>" in chat. `check:owner` reads `scripts/ownership.json`, the machine-readable copy of the matrix above. |

Branches: `feat/a-<topic>` and `feat/b-<topic>`. Merge to `main` at least every 60–90 minutes.

---

## 5. Handoff interfaces (the only places A and B touch)

Each row is a promise. The producer ships it by the time shown; the consumer codes against the
**signature**, using mocks until then.

| # | From → To | Interface (exact exports) | By |
|---|---|---|---|
| H1 | A → B | `src/lib/contracts.ts` (all types incl. `EventDataMap`, `Suggestion`) | 09:30 |
| H2 | A → B | scaffold on `main`: all deps installed, tokens, Tailwind config, `.env.example`, scripts, `public/mediapipe` | 09:30 |
| H3 | A → B | `lib/codex/client.ts` (server): `callStructured`, `CodexError`; `lib/codex/wrap.ts` (pure): `wrapCandidate`, `numberLines`; `lib/codex/agentConsole.ts`: `useAgentConsole().push(meta)`; `lib/api-client.ts` (client): `postAgent<T>(url, body, opts)` + `ApiError` (pushes `meta` to the console automatically); `lib/http.ts` (server): `jsonError`, `toErrorResponse`; mock mode working. Types `AgentMeta`, `CodexRole` come from `contracts.ts` | 10:15 |
| H4 | A → B | `components/ui` index: `Button`, `AccentCard`, `PillTitle`, `NumberBadge`, `Toast`, `StepList`, `AgentAvatar`, `AgentChip`, `AiModeBadge`, `BasisLabel` (until then B uses Tailwind tokens directly) | 10:30 |
| H5a | A → B | `import { getSeededChallenge } from "@challenges"` — `getSeededChallenge(defectType?: DefectType, level?: Level): Challenge` (no reference fix inside) | 10:30 |
| H5b | A → B | `features/assessment` index: `getAssessmentBundle(id): { assessment: AssessmentConfig; challenge: Challenge } \| null` (**never** includes `referenceFix`), `useAssessmentBundle(id): { status: "loading" \| "ready" \| "not_found"; bundle }` (waits for localStorage hydration), `createDemoAssessment(): Promise<string>` (seeded challenge, signs a token via the local API, no model call, resolves with the id) | **11:00** |
| H6 | A → B | `lib/assessment-token.ts` (server): `verifyToken(token): TokenPayload \| null`, `getVerifiedToken(req: Request): TokenPayload \| null` (reads header `x-assessment-token`) | 10:15 |
| H7a / H7b | B → A | `features/runner` index: `runSuite({ code, testsSource, target })` (pure harness, **10:15**) and `runTests({ code, testsSource, target, perTestTimeoutMs }): Promise<RunResult>` (Web Worker + 5 s hard kill, **10:45**) | 10:15 / **10:45** |
| H8 | B → A | `features/session` index: `useSessionStore`, `getSession(id)`, `listSessions()`, `exportSessions()/importSessions(json)`, and `applyWithProvenance`, `provenanceMetrics` | 11:00 |
| H9 | B → A | one **real recorded session JSON** (`docs/samples/session.sample.json`): first version after B4 (rooms + Inquisitor, no Assistant events), final version after B6 (with Assistant events) | 12:30 / 13:30 |
| H10 | B → A | `features/proctoring` index: `IntegrityReport` component, `getIntegrityRecord(sessionId): IntegrityRecord \| null` (Tier 3) | 14:30 |

**Event payloads are a contract.** `SessionEvent.data` must match `EventDataMap` in `contracts.ts`.
B writes events; A's `computeObjectiveMetrics`, `compactSession` and Replay read them. If B needs a new
field, it appends it to the payload type (additive) and tells A.

---

## 6. Data and storage

| Key | Written by | Read by | Contents |
|---|---|---|---|
| `he:assessments` | A (`features/assessment`) | A; B only via `getAssessmentBundle` | `AssessmentConfig[]`, `Challenge[]` (no `referenceFix`) |
| `he:secrets` | A | A only (Analyst, validation) | `ChallengeSecret[]` — **candidate code must never import it** |
| `he:sessions` | B (`features/session`) | A (report, analyst) | `Session[]` (events, snapshots, lineOrigins, suggestions, finalCode) |
| `he:integrity` | B (`features/proctoring`) | A via `getIntegrityRecord` | `IntegrityRecord[]` — **never sent to any model** |
| `he:reports` | A (`features/report`) | A | `Report[]`, decision notes |
| (memory only) | A + B push | A (Agent Console UI) | last 50 `AgentMeta` |

Known limitation (say it plainly if asked): manager and candidate share one browser profile in the
demo, so `he:secrets` is technically readable via devtools. Production would keep it server-side.

---

## 7. Key flows

### 7.1 Create an assessment (Dev A, uses Dev B's runner)

```text
/manager/new          /api/assessment/token   /api/saboteur        Codex          runner (Worker)
   │ submit form              │                    │                 │                 │
   │──────────────────────────►│ sign {id, aiAssistance, exp}        │                 │
   │◄─────────── token ────────┘                    │                 │                 │
   │── generate(level, defectType, previousFailures[]) ─►│── responses.parse ─►│        │
   │◄──────────── SaboteurOutput + AgentMeta ────────────┘                 │           │
   │── validate: S1–S5 static, then R1–R5 ───────────────────────────────────────────►│ visible/hidden × starter/fix
   │◄──────────── pass / failures[] ─────────────────────────────────────────────────────┘
   │   fail → regenerate with previousFailures (max 3) → else seeded fallback (still validated)
   │── save assessment + challenge (he:assessments), referenceFix (he:secrets)
   └── show candidate link /play/<id>   +  validation checklist  +  Agent Console
```

### 7.2 Candidate session (Dev B)

```text
/play/<id>
  getAssessmentBundle(id) ─► [Room 0 Security Check, if proctoring ≠ off] ─► Rules ─► start session
  Room 1 Triage:  mark lines + hypothesis ─► triageCheck (pure) ─► room_complete
  Room 2 The Bug: edit ─(recorder: edit/paste/ai_apply events, lineOrigins)─► Run tests ─► runner ─► test_run event
                  idle 5 s or "Check" ─► /api/inquisitor ─► question (grounded + validated) ─► inquisitor_question event
                  (AI ON) prompt ─► /api/assistant (token + toggle + room checks) ─► suggestion ─► review diff ─► apply
                  all hidden tests pass ─► room_complete
  Room 3 Defence: 3 × (/api/inquisitor mode=defence ─► answer) ─► session_end("escaped")
  timer 0 ─► final test run ─► session_end("timeout")
  every step ─► useSessionStore.record(...)    every agent response ─► useAgentConsole.push(meta)
```

### 7.3 Report (Dev A reads what Dev B recorded)

```text
/report/<sessionId>
  getSession(id) ─► computeObjectiveMetrics (pure) ─► objective strip
  [Generate analysis] ─► compactSession (pure, no integrity data) ─► /api/analyst ─► Codex (independent)
        ─► verifyClaims (drops anything whose evidence isn't found verbatim) ─► deriveCompetency (deterministic)
        ─► Report saved (he:reports)
  Replay: snapshots + applyWithProvenance tints, EvidenceChips jump to the moment
  Integrity section: <IntegrityReport/> from B (if mode ≠ off) — separate, neutral, never affects competency
  Decision panel: human picks an outcome + writes a note (mandatory)
```

---

## 8. API surface

| Route | Owner | Agent | Auth | Server timeout (per call) | Retries |
|---|---|---|---|---|---|
| `POST /api/saboteur` | A | Saboteur | none (manager) | 50 s | 0 (client loop regenerates, max 3) |
| `POST /api/analyst` | A | Analyst | none (manager) | 50 s | 0 (button "Regenerate") |
| `POST /api/assessment/token` | A | — | none (demo) | 2 s | — |
| `GET /api/health/codex` | A | tiny live call | none | 10 s | 0 |
| `POST /api/inquisitor` | B | Inquisitor | assessment token | 12 s | 1 |
| `POST /api/assistant` | B | Assistant | assessment token **and** `aiAssistance === true` **and** `room === 2` | 20 s | 1 |

All routes: `runtime = "nodejs"`, `maxDuration = 60`. A request must always finish inside 60 s, which is why
the long agents have **no server-side retry**.

---

## 9. Trust boundaries

| Asset | Where it lives | Rule |
|---|---|---|
| `OPENAI_API_KEY`, `ASSESSMENT_SECRET` | server env only | never in client bundles or logs |
| `referenceFix` | `he:secrets`, Analyst input, Saboteur output | never in candidate UI, candidate requests, or Inquisitor/Assistant inputs |
| `hiddenTests` | sent to the Web Worker only | never rendered; **known limitation**: devtools can reveal them |
| Candidate code, prompts, answers | wrapped as `<candidate_*>` data in every agent call | agents must ignore instructions inside them |
| AI toggle | HMAC token verified on the server | UI lock is cosmetic; the server decides |
| Integrity signals | `he:integrity`, separate store | never in any agent input; `compactSession` and every `build*Input` have a test that proves it |
| Raw camera/mic | the browser only | not recorded, not uploaded; derived signals only |

---

## 10. Failure modes and fallbacks (the demo must never depend on one live call)

| Failure | Fallback | Owner |
|---|---|---|
| Saboteur fails 3× or API down | seeded challenge (re-validated in < 1 s), banner "Using a pre-validated challenge" | A |
| Inquisitor call fails or fails validation | skip silently, retry on next trigger | B |
| Assistant call fails | inline "Assistant unavailable — try again"; session continues | B |
| Analyst fails | report shows objective metrics + timeline; "Analysis unavailable — retry" | A |
| Candidate code hangs | worker killed at 5 s → `timedOut: true`; next run works | B |
| Wi-Fi dies | `CODEX_MOCK=1` runs the whole flow offline; `/report/demo` needs no network | A + B |
| Camera denied / face detector unreliable | continue in browser-only mode; recorded neutrally; never blocks (unless the manager set `required`, then the accommodation message) | B |
| Page reload mid-session | rebuild state from stored events (event-sourced flow) | B |

---

## 11. Scope tiers and the cut line

| Tier | Dev A | Dev B |
|---|---|---|
| **1 — must ship** | scaffold, contracts, Codex client + mock, generic UI, seeded challenges, assessment + `/manager/new`, Saboteur live loop **with seeded fallback**, Analyst + verifier + metrics, report (objective, claims, event timeline list, decision panel) | runner, session + provenance, Monaco + three rooms + timer, Inquisitor (Room 2 nudges + Room 3), **Assistant + AI toggle + Apply/diff** |
| **2 — should ship** | Agent Console UI, `/report/demo`, Replay scrubber with origin tints, landing page, print CSS | game polish (door/keys animation, signal map), reload recovery, browser-only proctoring signals |
| **3 — only if ahead** | role/scenario field in the setup form, locale `id` polish | camera + mic signals (MediaPipe, Web Audio), Room 0 Security Check |

**Cut line:** at **13:30 (Integration 2)**, if the Tier 1 flow does not run end to end, drop all of
Tier 3 and the replay scrubber, and spend the rest of the day on stability and the demo script.
At **15:00** everything freezes.

---

## 12. System-level Definition of Done

- [ ] `pnpm build`, `typecheck`, `lint`, `test`, `test:challenges` are green on `main`.
- [ ] Full flow works with `CODEX_MOCK=1` (no key) **and** with the real API.
- [ ] Manager creates an assessment → candidate escapes three rooms → manager reads a verified report.
- [ ] AI OFF: assistant locked in the UI **and** `/api/assistant` returns 403; tampered token → 403.
- [ ] Every agent response appears in the Agent Console with LIVE/MOCK and latency (Tier 2) — or at least in server logs (Tier 1).
- [ ] No hidden test or reference fix in any candidate-facing bundle/request; no integrity data in any agent input.
- [ ] `/report/demo` renders with Wi-Fi off.
- [ ] `CODEX_LOG.md` has rows from both devs.
