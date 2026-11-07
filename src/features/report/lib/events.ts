import { z } from "zod";
import type { EventDataMap, SessionEvent } from "@/lib/contracts";
const count=z.number().int().nonnegative();
const testSchema:z.ZodType<EventDataMap["test_run"]>=z.object({visible:z.object({passed:count,total:count}),hidden:z.object({passed:count,total:count,failedNames:z.array(z.string())}),timedOut:z.boolean(),runtimeError:z.string().nullable(),codeHash:z.string()});
const applySchema:z.ZodType<EventDataMap["ai_apply"]>=z.object({suggestionId:z.string(),linesAdded:count,linesRemoved:count,reviewedFirst:z.boolean()});
const viewSchema:z.ZodType<EventDataMap["ai_diff_view"]>=z.object({suggestionId:z.string()});
export function testData(event:SessionEvent){const parsed=testSchema.safeParse(event.type==="test_run"?event.data:null);return parsed.success?parsed.data:null;}
export function applyData(event:SessionEvent){const parsed=applySchema.safeParse(event.type==="ai_apply"?event.data:null);return parsed.success?parsed.data:null;}
export function reviewedApplies(events:SessionEvent[]):{reviewed:number;total:number}{
 let reviewed=0,total=0;const seen=new Set<string>();
 for(const event of events){if(event.type==="ai_diff_view"){const parsed=viewSchema.safeParse(event.data);if(parsed.success)seen.add(parsed.data.suggestionId);}const apply=applyData(event);if(apply){total++;if(seen.has(apply.suggestionId))reviewed++;}}
 return {reviewed,total};
}
export function formatDuration(seconds:number|null):string{if(seconds===null)return "Not recorded";const s=Math.floor(Math.max(0,seconds));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}
export const evidenceTargetId=(kind:"event"|"code_line",value:string|number)=>`report-${kind}-${encodeURIComponent(String(value))}`;
