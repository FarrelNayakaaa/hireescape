import type { Challenge, ObjectiveMetrics, Room, Session } from "@/lib/contracts";
import { provenanceMetrics } from "@/features/session";
import { eventData } from "./eventData";
export function computeObjectiveMetrics(session:Session,challenge:Pick<Challenge,"id">):ObjectiveMetrics {
  if(session.challengeId!==challenge.id)throw new Error("Session and challenge do not match.");
  const events=session.events;
  const cutoff=events.findIndex(e=>eventData(e,"room_complete")?.room===2||e.type==="session_end");
  const beforeEnd=events.slice(0,cutoff<0?events.length:cutoff);
  const runs=beforeEnd.flatMap(e=>{const data=eventData(e,"test_run");return data?[{event:e,data}]:[];});
  const last=runs.at(-1)?.data.hidden;
  const firstGreen=runs.find(({data})=>!data.timedOut&&!data.runtimeError&&data.hidden.total>0&&data.hidden.passed===data.hidden.total);
  const roomTimesSec:ObjectiveMetrics["roomTimesSec"]={1:null,2:null,3:null};
  for(const room of [1,2,3] as Room[]){
    const enter=events.findIndex(e=>eventData(e,"room_enter")?.room===room);
    if(enter<0)continue;
    const complete=events.slice(enter+1).find(e=>eventData(e,"room_complete")?.room===room);
    if(complete)roomTimesSec[room]=Math.max(0,(complete.t-events[enter].t)/1000);
  }
  const applies=events.flatMap((e,i)=>{const data=eventData(e,"ai_apply");return data?[{event:e,index:i,data}]:[];});
  const provenance=provenanceMetrics(session.lineOrigins);
  return {hiddenPassed:last?.passed??0,hiddenTotal:last?.total??0,testRuns:events.filter(e=>e.type==="test_run").length,timeToFixSec:firstGreen?firstGreen.event.t/1000:null,roomTimesSec,
    changedLines:provenance.changedLines,aiLineShare:provenance.aiLineShare,aiEditedShare:provenance.aiEditedShare,
    pasteCount:events.filter(e=>e.type==="paste").length,assistantPrompts:events.filter(e=>e.type==="assistant_prompt").length,
    diffViewsBeforeApply:events.filter((e,i)=>{const view=eventData(e,"ai_diff_view");return view&&applies.some(a=>a.index>i&&a.data.suggestionId===view.suggestionId);}).length,
    testRunsAfterApply:applies.filter(a=>events.slice(a.index+1).some(e=>e.type==="test_run"&&e.t>=a.event.t&&e.t-a.event.t<=180000)).length};
}
