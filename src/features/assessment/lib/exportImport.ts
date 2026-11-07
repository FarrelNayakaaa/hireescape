"use client";
import { z } from "zod";
import type { IntegrityRecord, Report, Session } from "@/lib/contracts";
import { importSessions } from "@/features/session";
import { assessmentSchema, challengeSchema, secretSchema } from "../schemas";
import { hydrateManagerStores, useAssessmentStore, useSecretStore } from "../store";

const count=z.number().nonnegative();
const room=z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]);
const sessionSchema: z.ZodType<Session> = z.object({id:z.string().min(1),assessmentId:z.string().min(1),challengeId:z.string().min(1),aiAssistance:z.boolean(),startedAt:z.iso.datetime(),endedAt:z.iso.datetime().optional(),endReason:z.enum(["escaped","timeout","abandoned"]).optional(),events:z.array(z.object({id:z.string(),t:count,room,type:z.enum(["session_start","rules_ack","room_enter","room_complete","edit","paste","ai_apply","ai_diff_view","triage_mark","triage_result","test_run","inquisitor_question","candidate_answer","assistant_prompt","assistant_response","timer_warning","session_end"]),text:z.string().optional(),data:z.record(z.string(),z.unknown()).optional()})),snapshots:z.array(z.object({eventId:z.string(),t:count,code:z.string()})),lineOrigins:z.array(z.enum(["starter","manual","ai","ai_edited","paste"])),suggestions:z.array(z.object({id:z.string(),code:z.string(),summary:z.string(),promptEventId:z.string(),responseEventId:z.string()})),finalCode:z.string()});
const dimension=z.enum(["debugging","design","communication","ai_supervision"]);
const competency=z.enum(["strong","some","concern","insufficient","not_assessed"]);
const reportSchema: z.ZodType<Report> = z.object({sessionId:z.string(),generatedAt:z.iso.datetime(),promptVersion:z.string(),aiAssistance:z.boolean(),objective:z.object({hiddenPassed:count,hiddenTotal:count,testRuns:count,timeToFixSec:count.nullable(),roomTimesSec:z.object({1:count.nullable(),2:count.nullable(),3:count.nullable()}),changedLines:count,aiLineShare:count.nullable(),aiEditedShare:count.nullable(),pasteCount:count,assistantPrompts:count,diffViewsBeforeApply:count,testRunsAfterApply:count}),claims:z.array(z.object({id:z.string(),dimension,signal:z.enum(["strength","concern","observation"]),statement:z.string(),evidence:z.array(z.object({kind:z.enum(["code_line","event"]),line:z.number().positive().optional(),eventId:z.string().optional(),quote:z.string()})),basis:z.enum(["executed","ai_predicted"])})),droppedClaims:count,competency:z.object({debugging:competency,design:competency,communication:competency,ai_supervision:competency}),summary:z.string(),disclaimer:z.string()});
const signal=z.enum(["tab_hidden","window_blur","fullscreen_exit","face_absent","multiple_faces","voice_activity","camera_off","mic_off"]);
const integritySchema: z.ZodType<IntegrityRecord> = z.object({sessionId:z.string(),mode:z.enum(["off","browser","camera_mic"]),consent:z.enum(["given","declined","not_required"]),consentAt:z.iso.datetime().optional(),calibration:z.object({faceOk:z.boolean().nullable(),noiseFloor:z.number().nullable(),fullscreen:z.boolean().nullable()}),signals:z.array(z.object({id:z.string(),type:signal,start:count,end:count,durationMs:count,room:room.optional(),snapshot:z.string().optional()})),summary:z.object({counts:z.partialRecord(signal,count),totalsMs:z.partialRecord(signal,count),reviewSuggested:z.boolean(),reasons:z.array(z.string()),caveats:z.array(z.string())})});
export const backupSchema=z.object({version:z.literal(1),assessments:z.array(assessmentSchema),challenges:z.array(challengeSchema),secrets:z.array(secretSchema),sessions:z.array(sessionSchema),reports:z.array(reportSchema),integrity:z.array(integritySchema)}).strict();
export type AssessmentBackup=z.infer<typeof backupSchema>;
// A7 replaces these UI-owned backup adapters with the report/integrity public APIs when available.
// No foreign feature source is accessed. Unknown persisted layouts are rejected rather than overwritten.
function readCollection<T>(key:string,field:string,schema:z.ZodType<T>):T[] {
 const raw=localStorage.getItem(key);if(!raw)return [];
 const envelope=z.object({state:z.record(z.string(),z.unknown())}).parse(JSON.parse(raw) as unknown);
 const items=envelope.state[field];
 return z.array(schema).parse(Array.isArray(items)?items:Object.values(z.record(z.string(),schema).parse(items)));
}
function writeCollection<T>(key:string,field:string,items:T[],id:(item:T)=>string) {localStorage.setItem(key,JSON.stringify({state:{[field]:Object.fromEntries(items.map(item=>[id(item),item]))},version:0}));}
export async function exportAll({getSessions,includeSnapshots=false}:{getSessions:()=>Session[];includeSnapshots?:boolean}):Promise<AssessmentBackup> {
 await hydrateManagerStores();
 const state=useAssessmentStore.getState();
 const integrity=readCollection("he:integrity","records",integritySchema).map(record=>({...record,signals:record.signals.map(item=>{if(includeSnapshots)return item;const {snapshot,...rest}=item;void snapshot;return rest;})}));
 return backupSchema.parse({version:1,assessments:Object.values(state.assessments),challenges:Object.values(state.challenges),secrets:Object.values(useSecretStore.getState().secrets),sessions:getSessions(),reports:readCollection("he:reports","reports",reportSchema),integrity});
}
export async function importAll(json:string|unknown):Promise<void> {
 const backup=backupSchema.parse(typeof json==="string"?JSON.parse(json) as unknown:json);
 await hydrateManagerStores();
 const reports=readCollection("he:reports","reports",reportSchema);
 const integrity=readCollection("he:integrity","records",integritySchema);
 const state=useAssessmentStore.getState();
 const challenges=new Map(backup.challenges.map(c=>[c.id,c]));
 const secrets=new Map(backup.secrets.map(s=>[s.challengeId,s]));
 for(const a of backup.assessments)if(!challenges.has(a.challengeId)&&!state.challenges[a.challengeId])throw new Error("Backup has a missing challenge.");
 for(const a of backup.assessments)if(!secrets.has(a.challengeId)&&!useSecretStore.getState().secrets[a.challengeId])throw new Error("Backup has a missing challenge secret.");
 // The session public API validates every event payload before mutating its store.
 importSessions(backup.sessions);
 const mergedChallenges={...state.challenges};
 const mergedSecrets={...useSecretStore.getState().secrets};
 for(const c of backup.challenges) {
  const current=mergedChallenges[c.id];
  if(!current||Date.parse(c.validation.validatedAt)>Date.parse(current.validation.validatedAt)) {
   mergedChallenges[c.id]=c;
   if(secrets.has(c.id))mergedSecrets[c.id]=secrets.get(c.id)!;
  } else if(!mergedSecrets[c.id]&&secrets.has(c.id))mergedSecrets[c.id]=secrets.get(c.id)!;
 }
 const mergedAssessments={...state.assessments};
 for(const a of backup.assessments)if(!mergedAssessments[a.id]||Date.parse(a.createdAt)>Date.parse(mergedAssessments[a.id].createdAt))mergedAssessments[a.id]=a;
 useSecretStore.setState({secrets:mergedSecrets});
 useAssessmentStore.setState({assessments:mergedAssessments,challenges:mergedChallenges});
 const mergedReports=new Map(reports.map(r=>[r.sessionId,r]));
 for(const r of backup.reports)if(!mergedReports.has(r.sessionId)||Date.parse(r.generatedAt)>Date.parse(mergedReports.get(r.sessionId)!.generatedAt))mergedReports.set(r.sessionId,r);
 const updated=(r:IntegrityRecord)=>Math.max(Date.parse(r.consentAt??"1970-01-01"),...r.signals.map(s=>s.end));
 const mergedIntegrity=new Map(integrity.map(r=>[r.sessionId,r]));
 for(const r of backup.integrity)if(!mergedIntegrity.has(r.sessionId)||updated(r)>updated(mergedIntegrity.get(r.sessionId)!))mergedIntegrity.set(r.sessionId,r);
 writeCollection("he:reports","reports",[...mergedReports.values()],r=>r.sessionId);
 writeCollection("he:integrity","records",[...mergedIntegrity.values()],r=>r.sessionId);
}
