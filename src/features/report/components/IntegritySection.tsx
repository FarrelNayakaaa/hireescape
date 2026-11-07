"use client";
import { Component, type ComponentType, type ReactNode, useEffect, useState } from "react";
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
export function IntegritySection({sessionId,enabled}:{sessionId:string;enabled:boolean}){
 const [content,setContent]=useState<{id:string;node:ReactNode}|null>(null);
 useEffect(()=>{let active=true;if(enabled)void(async()=>{
  try{
   const mod=(await import("@/features/proctoring")) as Record<string,unknown>;
   const getter=mod["getIntegrityRecord"],component=mod["IntegrityReport"];
   if(typeof getter!=="function"||!isComponent(component))return;
   const record:unknown=await getter(sessionId);
   if(!record||typeof record!=="object"||!("sessionId" in record)||record.sessionId!==sessionId)return;
   const IntegrityReport=component as ComponentType<{sessionId:string;record:unknown}>;
   if(active)setContent({id:sessionId,node:<IntegrityBoundary><section aria-labelledby="report-integrity"><SectionTitle n={5} title="Integrity signals" id="report-integrity"/><IntegrityReport sessionId={sessionId} record={record}/></section></IntegrityBoundary>});
  }catch{/* Optional H10 integration: unavailable modules/records leave the slot empty. */}
 })();return()=>{active=false;};},[sessionId,enabled]);
 return enabled&&content?.id===sessionId?content.node:null;
}
