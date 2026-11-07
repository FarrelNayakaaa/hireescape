import { z } from "zod";
import type { EventDataMap, SessionEvent } from "@/lib/contracts";
const count=z.number().int().nonnegative();
const room=z.union([z.literal(1),z.literal(2),z.literal(3)]);
// Runtime projection follows EventDataMap and strips foreign fields at every nesting level.
const payloads={
 session_start:z.object({aiAssistance:z.boolean(),level:z.enum(["junior","mid","senior"]),defectType:z.enum(["swallowed_exception","unhandled_null","cache_no_fallback","off_by_one","shared_mutation","missing_await","unbounded_retry","resource_leak"])}),
 rules_ack:z.object({}),room_enter:z.object({room}),room_complete:z.object({room,durationSec:z.number().nonnegative()}),
 edit:z.object({linesChanged:count,source:z.enum(["manual","ai","paste"])}),
 paste:z.object({chars:count,lines:count,matchesSuggestionId:z.string().nullable()}),
 ai_apply:z.object({suggestionId:z.string(),linesAdded:count,linesRemoved:count,reviewedFirst:z.boolean()}),ai_diff_view:z.object({suggestionId:z.string()}),
 triage_mark:z.object({start:z.number().int().positive(),end:z.number().int().positive()}),triage_result:z.object({correct:z.boolean(),assisted:z.boolean(),attempt:count}),
 test_run:z.object({visible:z.object({passed:count,total:count}),hidden:z.object({passed:count,total:count,failedNames:z.array(z.string())}),timedOut:z.boolean(),runtimeError:z.string().nullable(),codeHash:z.string()}),
 inquisitor_question:z.object({mode:z.enum(["nudge","defence"]),intent:z.string(),line:z.number().int().positive(),quote:z.string(),defenceIndex:count.nullable()}),
 candidate_answer:z.object({questionEventId:z.string()}),assistant_prompt:z.object({chars:count}),assistant_response:z.object({suggestionId:z.string().nullable(),suggestionLines:count}),
 timer_warning:z.object({minutesLeft:z.number().nonnegative()}),session_end:z.object({reason:z.enum(["escaped","timeout","abandoned"])}),
} satisfies {[K in keyof EventDataMap]:z.ZodType<EventDataMap[K]>};
export const isSessionEventType=(type:string):type is keyof EventDataMap=>Object.hasOwn(payloads,type);
export function eventData<K extends keyof EventDataMap>(event:SessionEvent,type:K):EventDataMap[K]|null {
 if(event.type!==type)return null;
 const result=payloads[type].safeParse(event.data);
 // The mapped schema validates exactly the payload for K; TS cannot reduce a generic indexed union.
 return result.success?result.data as EventDataMap[K]:null;
}
export function safeEventData(event:SessionEvent):Record<string,unknown>|null {
 const result=payloads[event.type]?.safeParse(event.data);
 return result?.success?result.data:null;
}
