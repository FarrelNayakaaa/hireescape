import type { Session } from "@/lib/contracts";
import { isSessionEventType, safeEventData } from "./eventData";
const marker="…[truncated]";
export const truncateText=(text:string,limit=600)=>text.length<=limit?text:text.slice(0,Math.max(0,limit-marker.length))+marker;
const stamp=(ms:number)=>{const sec=Math.floor(Math.max(0,ms)/1000);return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;};
export function compactSession(session:Session):string {
 const events=session.events.filter(event=>isSessionEventType(event.type));
 const headers=events.map(e=>`[${e.id} ${stamp(e.t)} R${e.room} ${e.type}]`);
 let remaining=Math.max(0,80000-headers.join("\n").length);
 return events.map((event,i)=>{
   const data=safeEventData(event);
   const detail=event.type==="edit"&&data?`edit burst: ${data.linesChanged} lines · ${data.source}`:data?truncateText(JSON.stringify(data)):"";
   const text=event.text?JSON.stringify(truncateText(event.text)):"";
   const content=[detail,text].filter(Boolean).join(" · ");
   // Reserve fair detail space for later events while retaining every citable id.
   const allowance=Math.min(remaining,Math.floor(remaining/Math.max(1,events.length-i)));
   const capped=allowance>=marker.length?truncateText(content,allowance):"";
   remaining-=capped.length;
   return `${headers[i]}${capped?` ${capped}`:""}`;
 }).join("\n");
}
