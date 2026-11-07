import type { Origin, Session, SessionEvent } from "@/lib/contracts";
import { applyWithProvenance } from "@/features/session";
import { applyData } from "./events";
export interface ReplayFrame {eventId:string;t:number;code:string;origins:Origin[];approximate:boolean}
function source(event:SessionEvent):"manual"|"ai"|"paste"|null {
 if(event.type==="ai_apply")return "ai";
 if(event.type==="paste")return "paste";
 if(event.type==="edit"&&event.data&&(event.data.source==="manual"||event.data.source==="ai"||event.data.source==="paste"))return event.data.source;
 return null;
}
export function buildReplayFrames(session:Session,starterCode?:string):ReplayFrame[]{
 const indices=new Map(session.events.map((event,i)=>[event.id,i]));
 const retained=session.snapshots.filter(s=>indices.has(s.eventId)).map((snapshot,i)=>({snapshot,i})).sort((a,b)=>(indices.get(a.snapshot.eventId)!-indices.get(b.snapshot.eventId)!)||a.i-b.i);
 let code=starterCode??retained[0]?.snapshot.code??session.finalCode;
 let origins:Origin[]=code.split("\n").map(()=>"starter");let previous=-1;
 const frames:ReplayFrame[]=[];
 for(const {snapshot} of retained){
  const index=indices.get(snapshot.eventId)!;
  const changes=session.events.slice(previous+1,index+1).filter(e=>source(e)!==null);
  const direct=source(session.events[index]);
  const origin=direct??(changes.length===1?source(changes[0]):null)??"manual";
  const apply=applyData(session.events[index]);
  // An apply has the complete suggestion when available; retained code still wins as the display source.
  const suggested=apply&&session.suggestions.find(s=>s.id===apply.suggestionId)?.code;
  if(suggested&&suggested!==snapshot.code){origins=applyWithProvenance(code,origins,suggested,"ai");code=suggested;}
  origins=applyWithProvenance(code,origins,snapshot.code,origin);
  const approximate=changes.length>1||(!direct&&snapshot.code!==code&&changes.length!==1)||(!starterCode&&frames.length===0&&index>0);
  code=snapshot.code;frames.push({...snapshot,origins:[...origins],approximate});previous=index;
 }
 if(!frames.length)frames.push({eventId:session.events[0]?.id??"initial",t:0,code:starterCode??session.finalCode,origins:(starterCode??session.finalCode).split("\n").map(()=>"starter"),approximate:!starterCode});
 const lastEvent=session.events.at(-1);
 if(frames.at(-1)!.code!==session.finalCode){const last=frames.at(-1)!;frames.push({eventId:lastEvent?.id??"final",t:lastEvent?.t??last.t,code:session.finalCode,origins:applyWithProvenance(last.code,last.origins,session.finalCode,"manual"),approximate:true});}
 return frames;
}
export function frameForEvent(frames:ReplayFrame[],events:SessionEvent[],eventId:string):number {
 const target=events.findIndex(e=>e.id===eventId);if(target<0)return 0;
 let selected=0;for(let i=0;i<frames.length;i++){const index=events.findIndex(e=>e.id===frames[i].eventId);if(index<=target)selected=i;else break;}return selected;
}
export const playbackDelay=(from:number,to:number)=>Math.min(10000,Math.max(0,to-from))/2;
