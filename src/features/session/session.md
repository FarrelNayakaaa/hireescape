# features/session — AGENTS.md (event recorder, provenance, snapshots, replay data)

> **Owner: Dev B** · Consumed by: `features/escape-room`, and read-only by Dev A's `report`, `analyst`, `assessment` via the public API below (H8).

> Inherits the root `AGENTS.md`. The session log is the **evidence base**. If an event is not recorded
> here, the Analyst cannot cite it and the report cannot show it. Accuracy > volume.

## Files

```text
features/session/
  store.ts              zustand store (persist key "he:sessions")
  lib/provenance.ts     port of starter-kit/provenance.js (verified): diffLineOps, applyWithProvenance, provenanceMetrics
  lib/hash.ts           tiny string hash for codeHash
  hooks/useEditorRecorder.ts   wires Monaco events into the store
  index.ts              PUBLIC API (see below) — the only thing Dev A may import
  __tests__/provenance.test.ts  __tests__/store.test.ts
```

## Store API

```ts
interface SessionStore {
  sessions: Record<string, Session>;
  start(assessment: AssessmentConfig, challenge: Challenge): string;              // returns sessionId
  record(sessionId: string, e: Omit<SessionEvent, "id" | "t">): SessionEvent;     // assigns "e{n}" + t
  applyCode(sessionId: string, newCode: string, source: "manual" | "ai" | "paste"): void; // updates lineOrigins
  snapshot(sessionId: string, eventId: string, code: string): void;
  finish(sessionId: string, reason: Session["endReason"], finalCode: string): void;
}
```

- Event ids are sequential `e1, e2, …` and **never reused**. They are the citation keys for evidence.
- `t` = ms since `startedAt` (persist the base so a page reload keeps the clock right).

## Editor recording (`useEditorRecorder`)

- `onDidChangeModelContent`: compute `source` from a ref flag:
  - `"ai"` while the Assistant's Apply is executing (set flag → `executeEdits("ai_apply", …)` → clear flag),
  - `"paste"` if `onDidPaste` fired for this change — **unless** the pasted text is a substring of any
    assistant suggestion in this session, then `"ai"` (closes the copy-paste loophole),
  - otherwise `"manual"`.
- Call `applyCode(sessionId, model.getValue(), source)` on each change (cheap: files < 300 lines).
- Record `edit` events **debounced 1.5s** as bursts: `data: { linesChanged, source }`.
  Record `paste` and `ai_apply` immediately (never debounced).
- Snapshot after each recorded edit burst and at every non-edit event (cap 400 snapshots; beyond the
  cap drop every other *edit* snapshot, never non-edit snapshots).

## Provenance semantics (implemented + tested in starter-kit)

| Origin | Meaning |
|---|---|
| `starter` | Unchanged from the broken file |
| `manual` | Typed by the candidate |
| `ai` | Inserted by Apply suggestion (or pasted from a suggestion) and not modified since |
| `ai_edited` | Came from AI, then modified by the candidate (a verification signal) |
| `paste` | Pasted from outside the app (recorded neutrally — never treated as cheating) |

Metrics (`provenanceMetrics`): `changedLines`, `aiLineShare = ai / changed`, `aiEditedShare = ai_edited / changed`.

## Public API (Dev A depends on this exact shape — `ARCHITECTURE.md` H8)

```ts
// features/session/index.ts
export { useSessionStore } from "./store";                       // read selectors only on the manager side
export function getSession(id: string): Session | null;
export function listSessions(): Session[];
export function exportSessions(): Session[];                       // used by features/assessment export
export function importSessions(raw: unknown): number;              // zod-validated, returns count merged
export { applyWithProvenance, provenanceMetrics, diffLineOps } from "./lib/provenance";
export type { Session, SessionEvent, Origin } from "@/lib/contracts";
```

Event payloads are a contract: every `record()` call is typed with `EventDataMap` in `src/lib/contracts.ts`.
Dev A's metrics, compaction and replay read those fields, so never rename or drop one; add new fields only.
`Session.suggestions` stores every Assistant suggestion's full code (needed for paste matching and the Analyst).

What moved: **objective metrics** and **compaction for the Analyst** are Dev A's (`features/analyst/lib`);
**export/import** orchestration is Dev A's (`features/assessment/lib/exportImport.ts`) and calls `exportSessions()` /
`importSessions()` from here.

## Definition of Done

- [ ] Provenance tests: apply → manual edit → `ai_edited`; paste-from-suggestion → `ai`; external paste → `paste`.
- [ ] Store test: `record()` assigns sequential ids and ms offsets; events typed with `EventDataMap`.
- [ ] Reloading `/play/<id>` mid-session restores code, room, timer, and events.
- [ ] Integrity data is never written into `he:sessions` (it lives in `he:integrity`, a separate store).
- [ ] `index.ts` exports exactly the public API above.
