// Single source of truth. Dev A edits; Dev B only appends below the marker. Breaking changes: docs/CONTRACT_REQUESTS.md.
// src/lib/contracts.ts — single source of truth. Do not duplicate these types elsewhere.
export type Level = "junior" | "mid" | "senior";
export type DefectType =
  | "swallowed_exception" | "unhandled_null" | "cache_no_fallback"   // error handling
  | "off_by_one" | "shared_mutation"                                  // logic (junior-friendly)
  | "missing_await" | "unbounded_retry" | "resource_leak";            // async & resilience
export type Room = 1 | 2 | 3;
export type Dimension = "debugging" | "design" | "communication" | "ai_supervision";

// ---------- Runner ----------
export interface TestCaseResult {
  name: string;
  status: "pass" | "fail" | "error";
  message?: string;
  durationMs: number;
}
export interface RunResult {
  runId: string;
  target: "visible" | "hidden";
  total: number;
  passed: number;
  failed: number;
  results: TestCaseResult[];
  timedOut: boolean;
  runtimeError?: string;
  durationMs: number;
}

// ---------- Challenge ----------
export interface Challenge {
  id: string;
  title: string;                 // ticket-style, e.g. "INC-2417: Product page 500s during cache flaps"
  level: Level;
  defectType: DefectType;
  language: "javascript";
  brief: string;                 // incident ticket shown to the candidate; never names the line
  starterCode: string;           // the broken file
  visibleTests: string;          // shown to candidate; all pass on starter
  hiddenTests: string;           // never rendered; >=1 fails on starter, all pass on fix
  defectLines: [number, number]; // 1-based inclusive range in starterCode (Room 1 check)
  rubricHints: string[];         // what strong reasoning mentions (Inquisitor + Analyst context)
  source: "generated" | "seeded";
  validation: { brokenFailsHidden: boolean; fixPassesHidden: boolean; attempts: number; validatedAt: string };
}
export interface ChallengeSecret {  // manager-side only, never in candidate UI or candidate API calls
  challengeId: string;
  referenceFix: string;
}

// ---------- Assessment ----------
export interface AssessmentConfig {
  id: string;
  challengeId: string;
  candidateAlias: string;        // fictional, e.g. "Candidate A — Rani (fictional)"
  level: Level;
  aiAssistance: boolean;         // the manager's toggle
  durationMin: number;           // default 45
  proctoring: ProctoringConfig;  // see features/proctoring/AGENTS.md
  locale: "en" | "id";           // candidate-facing language for Inquisitor + Assistant + UI
  createdAt: string;
  token: string;                 // HMAC-signed {assessmentId, aiAssistance, exp}
}

// ---------- Proctoring (full spec in features/proctoring/AGENTS.md) ----------
export type ProctoringMode = "off" | "browser" | "camera_mic";
export interface ProctoringConfig { mode: ProctoringMode; required: boolean; captureSnapshots: boolean }
export type IntegritySignalType =
  | "tab_hidden" | "window_blur" | "fullscreen_exit"
  | "face_absent" | "multiple_faces" | "voice_activity"
  | "camera_off" | "mic_off";
export interface IntegritySignal {
  id: string;                    // "i1", "i2"… (separate namespace from session events)
  type: IntegritySignalType;
  start: number; end: number; durationMs: number;
  room?: Room | 0;
  snapshot?: string;             // only if captureSnapshots
}
export interface IntegrityRecord {
  sessionId: string;
  mode: ProctoringMode;
  consent: "given" | "declined" | "not_required";
  consentAt?: string;
  calibration: { faceOk: boolean | null; noiseFloor: number | null; fullscreen: boolean | null };
  signals: IntegritySignal[];
  summary: {
    counts: Partial<Record<IntegritySignalType, number>>;
    totalsMs: Partial<Record<IntegritySignalType, number>>;
    reviewSuggested: boolean;
    reasons: string[];
    caveats: string[];
  };
}

// ---------- Codex agent telemetry ----------
export type CodexRole = "saboteur" | "inquisitor" | "assistant" | "analyst";
export interface AgentMeta {
  role: CodexRole; model: string; promptVersion: string;
  latencyMs: number; attempts: number; mock: boolean;
  usage?: { inputTokens: number; outputTokens: number };
}

// ---------- Session ----------
export type Origin = "starter" | "manual" | "ai" | "ai_edited" | "paste";
export type SessionEventType =
  | "session_start" | "rules_ack" | "room_enter" | "room_complete"
  | "edit" | "paste" | "ai_apply" | "ai_diff_view"
  | "triage_mark" | "triage_result"
  | "test_run"
  | "inquisitor_question" | "candidate_answer"
  | "assistant_prompt" | "assistant_response"
  | "timer_warning" | "session_end";

export interface SessionEvent {
  id: string;                    // "e1", "e2", ... sequential per session (evidence references use this)
  t: number;                     // ms since session start
  room: Room | 0;                // 0 = lobby/rules
  type: SessionEventType;
  text?: string;                 // human-readable payload (prompt text, question, answer, hypothesis)
  data?: Record<string, unknown>;
}
export interface Snapshot { eventId: string; t: number; code: string }

// Payload of SessionEvent.data per event type. Dev B writes these, Dev A reads them (metrics, compaction, replay).
// Add fields freely; never rename or remove one without a request.
export interface EventDataMap {
  session_start:       { aiAssistance: boolean; level: Level; defectType: DefectType };
  rules_ack:           Record<string, never>;
  room_enter:          { room: Room };
  room_complete:       { room: Room; durationSec: number };
  edit:                { linesChanged: number; source: "manual" | "ai" | "paste" };
  paste:               { chars: number; lines: number; matchesSuggestionId: string | null };
  ai_apply:            { suggestionId: string; linesAdded: number; linesRemoved: number; reviewedFirst: boolean };
  ai_diff_view:        { suggestionId: string };
  triage_mark:         { start: number; end: number };                       // SessionEvent.text = hypothesis
  triage_result:       { correct: boolean; assisted: boolean; attempt: number };
  test_run:            { visible: { passed: number; total: number };
                         hidden: { passed: number; total: number; failedNames: string[] };
                         timedOut: boolean; runtimeError: string | null; codeHash: string };
  inquisitor_question: { mode: "nudge" | "defence"; intent: string; line: number; quote: string; defenceIndex: number | null };
  candidate_answer:    { questionEventId: string };
  assistant_prompt:    { chars: number };                                    // SessionEvent.text = the prompt
  assistant_response:  { suggestionId: string | null; suggestionLines: number };  // text = the message
  timer_warning:       { minutesLeft: number };
  session_end:         { reason: "escaped" | "timeout" | "abandoned" };
}

export interface Suggestion {
  id: string;                    // "s1", "s2", … per session
  code: string;                  // the FULL suggested file
  summary: string;
  promptEventId: string;
  responseEventId: string;
}

export interface Session {
  id: string;
  assessmentId: string;
  challengeId: string;
  aiAssistance: boolean;
  startedAt: string;
  endedAt?: string;
  endReason?: "escaped" | "timeout" | "abandoned";
  events: SessionEvent[];
  snapshots: Snapshot[];
  lineOrigins: Origin[];
  suggestions: Suggestion[];     // every Assistant suggestion (paste matching + Analyst input)
  finalCode: string;             // code at Room 2 completion (or at timeout)
}

// ---------- Report ----------
export interface Evidence {
  kind: "code_line" | "event";
  line?: number;                 // 1-based, in finalCode (kind=code_line)
  eventId?: string;              // kind=event
  quote: string;                 // must be found verbatim (whitespace-normalised) at that location
}
export interface Claim {
  id: string;
  dimension: Dimension;
  signal: "strength" | "concern" | "observation";
  statement: string;             // behaviour, not personality
  evidence: Evidence[];          // >= 1, all verified
  basis: "executed" | "ai_predicted";
}
export type CompetencyLevel = "strong" | "some" | "concern" | "insufficient" | "not_assessed";
export interface ObjectiveMetrics {
  hiddenPassed: number;
  hiddenTotal: number;
  testRuns: number;
  timeToFixSec: number | null;   // session start → first all-green hidden run
  roomTimesSec: Record<Room, number | null>;
  changedLines: number;
  aiLineShare: number | null;    // share of changed lines from AI, accepted untouched
  aiEditedShare: number | null;  // share of changed lines from AI, then edited by candidate
  pasteCount: number;
  assistantPrompts: number;
  diffViewsBeforeApply: number;
  testRunsAfterApply: number;
}
export interface Report {
  sessionId: string;
  generatedAt: string;
  promptVersion: string;
  aiAssistance: boolean;
  objective: ObjectiveMetrics;
  claims: Claim[];
  droppedClaims: number;         // shown in the UI as "N unverifiable claims removed"
  competency: Record<Dimension, CompetencyLevel>;
  summary: string;               // <= 3 sentences, no recommendation words
  disclaimer: string;
}

// ── Dev B additions (append-only; Dev A owns everything above) ──
