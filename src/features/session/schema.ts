import { z } from "zod";
import type { EventDataMap, Session } from "@/lib/contracts";

const room = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
const playableRoom = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const count = z.number().int().nonnegative();
const source = z.enum(["manual", "ai", "paste"]);
const reason = z.enum(["escaped", "timeout", "abandoned"]);

export const eventPayloadSchemas = {
  session_start: z.object({ aiAssistance: z.boolean(), level: z.enum(["junior", "mid", "senior"]), defectType: z.enum(["swallowed_exception", "unhandled_null", "cache_no_fallback", "off_by_one", "shared_mutation", "missing_await", "unbounded_retry", "resource_leak"]) }).strict(),
  rules_ack: z.object({}).strict(),
  room_enter: z.object({ room: playableRoom }).strict(),
  room_complete: z.object({ room: playableRoom, durationSec: z.number().nonnegative() }).strict(),
  edit: z.object({ linesChanged: count, source }).strict(),
  paste: z.object({ chars: count, lines: count, matchesSuggestionId: z.string().nullable() }).strict(),
  ai_apply: z.object({ suggestionId: z.string(), linesAdded: count, linesRemoved: count, reviewedFirst: z.boolean() }).strict(),
  ai_diff_view: z.object({ suggestionId: z.string() }).strict(),
  triage_mark: z.object({ start: z.number().int().positive(), end: z.number().int().positive() }).strict(),
  triage_result: z.object({ correct: z.boolean(), assisted: z.boolean(), attempt: count }).strict(),
  test_run: z.object({
    visible: z.object({ passed: count, total: count }).strict(),
    hidden: z.object({ passed: count, total: count, failedNames: z.array(z.string()) }).strict(),
    timedOut: z.boolean(), runtimeError: z.string().nullable(), codeHash: z.string(),
  }).strict(),
  inquisitor_question: z.object({ mode: z.enum(["nudge", "defence"]), intent: z.string(), line: z.number().int().positive(), quote: z.string(), defenceIndex: count.nullable() }).strict(),
  candidate_answer: z.object({ questionEventId: z.string() }).strict(),
  assistant_prompt: z.object({ chars: count }).strict(),
  assistant_response: z.object({ suggestionId: z.string().nullable(), suggestionLines: count }).strict(),
  timer_warning: z.object({ minutesLeft: z.number().nonnegative() }).strict(),
  session_end: z.object({ reason }).strict(),
} satisfies { [Type in keyof EventDataMap]: z.ZodType<EventDataMap[Type]> };

const eventTypes = Object.keys(eventPayloadSchemas) as [keyof EventDataMap, ...(keyof EventDataMap)[]];
export const sessionEventSchema = z.object({
  id: z.string().regex(/^e[1-9]\d*$/), t: z.number().nonnegative(), room,
  type: z.enum(eventTypes), text: z.string().optional(), data: z.record(z.string(), z.unknown()).optional(),
}).strict().superRefine((event, context) => {
  if (event.data !== undefined && !eventPayloadSchemas[event.type].safeParse(event.data).success) {
    context.addIssue({ code: "custom", path: ["data"], message: "Invalid event payload" });
  }
});

export const sessionSchema: z.ZodType<Session> = z.object({
  id: z.string().min(1), assessmentId: z.string().min(1), challengeId: z.string().min(1),
  aiAssistance: z.boolean(), startedAt: z.iso.datetime(), endedAt: z.iso.datetime().optional(), endReason: reason.optional(),
  events: z.array(sessionEventSchema),
  snapshots: z.array(z.object({ eventId: z.string(), t: z.number().nonnegative(), code: z.string() }).strict()),
  lineOrigins: z.array(z.enum(["starter", "manual", "ai", "ai_edited", "paste"])),
  suggestions: z.array(z.object({ id: z.string().regex(/^s[1-9]\d*$/), code: z.string(), summary: z.string(), promptEventId: z.string(), responseEventId: z.string() }).strict()),
  finalCode: z.string(),
}).strict();
