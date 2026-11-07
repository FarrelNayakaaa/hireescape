import { getSeededChallenge } from "@challenges";
import { getSeededSecret } from "@challenges/secrets";
import type { EventDataMap, Session, SessionEvent } from "@/lib/contracts";
export const challenge=getSeededChallenge();
export const secret=getSeededSecret(challenge.id)!;
function event<K extends keyof EventDataMap>(id:string,t:number,room:SessionEvent["room"],type:K,data:EventDataMap[K],text?:string):SessionEvent{return {id,t,room,type,data,text};}
const testData=(passed:number)=>({visible:{passed:2,total:2},hidden:{passed,total:6,failedNames:passed===6?[]:["cache failure"]},timedOut:false,runtimeError:null,codeHash:`hash-${passed}`});
export function fixtureSession():Session {
 return {id:"fictional-session",assessmentId:"fictional-assessment",challengeId:challenge.id,aiAssistance:true,startedAt:"2026-11-07T00:00:00.000Z",endedAt:"2026-11-07T00:10:00.000Z",endReason:"escaped",finalCode:secret.referenceFix,lineOrigins:["starter","manual","ai","ai_edited","paste"],snapshots:[],suggestions:[{id:"s1",code:secret.referenceFix,summary:"Separate cache failures",promptEventId:"e9",responseEventId:"e10"}],events:[
 event("e1",0,0,"session_start",{aiAssistance:true,level:"mid",defectType:"cache_no_fallback"}),
 event("e2",1000,1,"room_enter",{room:1}),
 event("e3",41000,1,"triage_mark",{start:14,end:16},"cache.get throws on timeout and nothing catches it"),
 event("e4",42000,1,"triage_result",{correct:true,assisted:false,attempt:1}),
 event("e5",45000,1,"test_run",testData(3)),
 event("e6",50000,1,"room_complete",{room:1,durationSec:49}),
 event("e7",51000,2,"room_enter",{room:2}),
 event("e8",60000,2,"paste",{chars:20,lines:2,matchesSuggestionId:null}),
 event("e9",372000,2,"assistant_prompt",{chars:78},"why would getProduct fail when the cache times out? only fix the get path"),
 event("e10",379000,2,"assistant_response",{suggestionId:"s1",suggestionLines:12},"wraps cache.get in try/catch, logs warn"),
 event("e11",400000,2,"ai_diff_view",{suggestionId:"s1"}),
 event("e12",418000,2,"ai_apply",{suggestionId:"s1",linesAdded:9,linesRemoved:1,reviewedFirst:true}),
 event("e13",450000,2,"edit",{linesChanged:2,source:"manual"}),
 event("e14",461000,2,"test_run",testData(6)),
 event("e15",470000,2,"room_complete",{room:2,durationSec:419}),
 event("e16",500000,3,"candidate_answer",{questionEventId:"q1"},"I catch cache failures separately so repository errors still propagate."),
 event("e17",471000,3,"room_enter",{room:3}),
 event("e18",550000,3,"candidate_answer",{questionEventId:"q2"},"The cache is optional; repository failures remain visible to the caller."),
 event("e19",590000,3,"room_complete",{room:3,durationSec:119}),
 event("e20",600000,3,"session_end",{reason:"escaped"}),
 ]};
}
