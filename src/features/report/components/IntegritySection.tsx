"use client";
import { Component, type ComponentType, type ReactNode, useEffect, useState } from "react";
import type { IntegrityRecord } from "@/lib/contracts";
import { SectionTitle } from "./SectionTitle";
class IntegrityBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?null:this.props.children;}
}
function isComponent(value:unknown):boolean {
 if(typeof value==="function")return true;
 return !!value&&typeof value==="object"&&"$$typeof" in value&&(value.$$typeof===Symbol.for("react.memo")||value.$$typeof===Symbol.for("react.forward_ref"));
}
export function IntegritySection({sessionId,enabled,preview}:{sessionId:string;enabled:boolean;preview?:IntegrityRecord}){
 const [content,setContent]=useState<{id:string;node:ReactNode}|null>(null);
 useEffect(()=>{let active=true;if(enabled&&!preview)void(async()=>{
  try{
   const mod=(await import("@/features/proctoring")) as Record<string,unknown>;
   const getter=mod["getIntegrityRecord"],component=mod["IntegrityReport"];
   if(typeof getter!=="function"||!isComponent(component))return;
   const record:unknown=await getter(sessionId);
   if(!record||typeof record!=="object"||!("sessionId" in record)||record.sessionId!==sessionId)return;
   const IntegrityReport=component as ComponentType<{sessionId:string;record:unknown}>;
   if(active)setContent({id:sessionId,node:<IntegrityBoundary><section aria-labelledby="report-integrity"><SectionTitle n={5} title="Integrity signals" id="report-integrity"/><IntegrityReport sessionId={sessionId} record={record}/></section></IntegrityBoundary>});
  }catch{/* Optional H10 integration: unavailable modules/records leave the slot empty. */}
 })();return()=>{active=false;};},[sessionId,enabled,preview]);
 if(enabled&&preview?.sessionId===sessionId)return <section aria-labelledby="report-integrity"><SectionTitle n={5} title="Integrity signals" id="report-integrity"/><div className="border border-he-border rounded-[var(--he-radius)] p-5 space-y-2"><p>Static integrity preview · Browser only · consent not required</p><p>Tab hidden: {Math.round((preview.summary.totalsMs.tab_hidden??0)/1000)} seconds · {preview.summary.reviewSuggested?"Human review suggested":"No review suggested"}</p>{preview.summary.caveats.map((caveat,i)=><p key={i} className="he-small he-muted">{caveat}</p>)}</div></section>;
 return enabled&&content?.id===sessionId?content.node:null;
}
