# features/escape-room — AGENTS.md (candidate flow, rooms, timer, signal map)

> **Owner: Dev B** · Depends on: `runner`, `session`, `inquisitor`, `assistant`, `proctoring`, `assessment` (read-only `getAssessmentBundle`, H5b), `components/game`, `components/ui`.

> Inherits the root `AGENTS.md` and `src/components/ui/AGENTS.md`. This is the candidate's whole
> experience. It must feel like a game and behave like a fair exam.

## State machine (`lib/flow.ts`, pure reducer)

```text
lobby ─► security_check* ─► rules ─► room1 ─► room2 ─► room3 ─► escaped
                                       │        │        │
                                       └────────┴────────┴──► timeout   (timer hits 00:00 in any room)
* only when proctoring.mode ≠ "off"; owned by features/proctoring (SecurityCheck component).
  If proctoring.required and consent is declined → "blocked" screen with the accommodation message.
```

- Transitions only via `dispatch({ type })`. Each transition records an event
  (`rules_ack`, `room_enter`, `room_complete`, `session_end`).
- Rooms unlock strictly in order. No skipping, no going back to a completed room
  (the code stays visible read-only in Room 3).
- On reload: rebuild state from the session's events (event-sourced), not from a separate flag.

## Proctoring integration

- `EscapeRoomShell` mounts `features/proctoring` providers when mode ≠ off; samplers start after consent
  and stop at `escaped`/`timeout`. The timer does **not** start during the Security Check.
- `RoomHeader` shows `IntegrityHud` (camera bubble + shield) next to the timer.
- The escape-room store never reads integrity data; it only passes the session clock (`now()`) to proctoring.

## Rules screen

- Shows: challenge title, 45:00 timer (not started yet), the three rooms, and the AI rule:
  - ON: "You may use the built-in assistant. We look at how you use it, not whether you use it."
  - OFF: "The built-in assistant is off for this assessment. Please work without AI tools."
- Also: "A human reviews your session. Nothing is auto-rejected." and "The Inquisitor will ask about
  your own code. It never gives answers."
- Checkbox "I understand" → Start. Timer starts on Start (`session_start`).

## Room 1 · Triage (accent: blue)

Goal: locate the failing behaviour.
- Candidate reads the brief (Brief tab) and the code. Visible tests can be run.
- Click gutter lines to mark a suspected range (1–8 lines) + write a hypothesis (≥ 15 chars) →
  "Submit triage". Records `triage_mark` with `data: { start, end }` and `text: hypothesis`.
- Check: marked range overlaps `defectLines` expanded by ±2 lines → `triage_result { correct: true }` → unlock.
- Wrong: friendly message "Not quite — look at where external calls can fail." (generic per defect type,
  never the line). Max 3 attempts; after the 3rd, unlock anyway with `triage_result { correct: false, assisted: true }`
  and highlight the defect range. This is recorded as evidence, not punished silently.
- The editor is **editable** in Room 1 (people explore by typing), but the AI assistant is locked
  until Room 2 even when AI is ON (triage must be the candidate's own reading).

### Triage hints per defect type (`lib/triageHints.ts`)

Shown after a wrong Room 1 attempt. Generic, never the line, never the fix.

| defectType | Hint |
|---|---|
| swallowed_exception | "Look at what happens after something goes wrong." |
| unhandled_null | "Look at data that comes from outside this file." |
| cache_no_fallback | "Look at what the request depends on that can fail." |
| off_by_one | "Look at the edges: the exact value where behaviour changes." |
| shared_mutation | "Look at who owns the data this function receives." |
| missing_await | "Look at the order things finish, not the order they start." |
| unbounded_retry | "Look at which failures are worth trying again." |
| resource_leak | "Look at every way this function can end." |

## Room 2 · The Bug (accent: orange)

Goal: make all hidden tests pass.
- Tabs: Brief · Tests · Inquisitor · Assistant (🔒 if AI OFF).
- "Run tests" (⌘/Ctrl+Enter) → runner. Results panel updates.
- Inquisitor triggers (see inquisitor AGENTS.md): 5s idle after a meaningful change, or "Check ✦".
  Answering is optional in Room 2 and is recorded.
- Unlock when a `test_run` has all hidden tests passing. Show "Room 2 escaped ✓" + key animation.
  `finalCode` = code at that run.

## Room 3 · The Defence (accent: green)

Goal: explain and defend the fix.
- Editor becomes **read-only** (diff view starter → final is available as a toggle).
- The Inquisitor asks **3 defence questions** one at a time (failure modes, observability, trade-offs/scale),
  each grounded in the candidate's diff.
- Candidate answers in a textarea (≥ 30 chars, soft max 800). Each answer = `candidate_answer` event with
  `data: { questionEventId }`.
- After the 3rd answer → `escaped`.
- The Assistant is **disabled in Room 3** regardless of the toggle (the defence must be the candidate's own words).
  Say so on the room intro card.

## Timer

- Default 45:00 from `AssessmentConfig.durationMin`. Source of truth: `session.startedAt` + duration.
- Warnings at 10:00 and 02:00 (`timer_warning` events, `aria-live` announcement).
- At 00:00: run hidden tests once more on the current code (if in Room 2), set `finalCode`,
  `session_end { reason: "timeout" }`, show the respectful timeout screen.

## Signal map (live)

- 4 axes: debugging, design, communication, AI supervision (greyed + "not assessed" when AI OFF).
- Shows **count of signals captured**, never a grade. Mapping (pure function `lib/signals.ts`):
  - debugging: `triage_mark`, `test_run`, Room 2 complete
  - design: Room 3 answers, edits outside `defectLines` that touch error handling
  - communication: hypothesis length ≥ 15 chars, Inquisitor answers, Room 3 answers
  - ai_supervision: `assistant_prompt`, `ai_diff_view`, `ai_edited` lines, test runs after apply
- Tooltip: "Signals are evidence collected for a human reviewer, not a score."

## Layout & components

Visual primitives (`RoomDoor`, `KeyCounter`, `Timer`, `SignalMap`, `RoomIntroCard`, `IncidentTicket`, `HiddenTestLocks`) come from
`src/components/game` (also Dev B). Generic ones (`Button`, `AccentCard`, `NumberBadge`, …) come from `components/ui` (Dev A).

```text
features/escape-room/
  components/EscapeRoomShell.tsx   loads assessment+challenge, owns the flow
  components/RoomHeader.tsx        doors stepper + title + AiModeBadge + Timer
  components/EditorPane.tsx        Monaco (dynamic import, ssr:false), gutter marking, read-only in R3
  components/RightPanel.tsx        tabs: Brief, Tests, Inquisitor, Assistant
  components/TriageForm.tsx  components/DefencePanel.tsx
  components/RulesScreen.tsx  components/EscapedScreen.tsx  components/TimeoutScreen.tsx
  lib/flow.ts  lib/signals.ts  lib/triageCheck.ts
  __tests__/flow.test.ts  __tests__/triageCheck.test.ts  __tests__/signals.test.ts
```

Monaco settings: `language: "javascript"`, `minimap: false`, `fontFamily: JetBrains Mono`, `fontSize: 14`,
custom dark theme using UI tokens (background `--he-surface`, selection purple at low alpha).

## Definition of Done

- [ ] Full happy path on the cache seeded challenge in < 4 minutes by a teammate who knows the fix.
- [ ] Timeout path tested with `durationMin = 1`.
- [ ] AI OFF: Assistant tab shows a lock with "Off for this assessment"; no requests leave the browser.
- [ ] Reload in each room restores the exact state.
