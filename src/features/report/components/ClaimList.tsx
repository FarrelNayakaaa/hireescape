"use client";
import { ArrowDown, ArrowUp, Circle } from "lucide-react";
import type { Claim, Evidence, SessionEvent } from "@/lib/contracts";
import { AccentCard, BasisLabel, EvidenceChip } from "@/components/ui";
import { ReadableText } from "@/components/ui/ReadableText";
import { dimensionLabels, dimensions, orderClaims } from "../lib/claimOrder";
const signals={strength:{Icon:ArrowUp,label:"Strength"},concern:{Icon:ArrowDown,label:"Concern"},observation:{Icon:Circle,label:"Observation"}};
export function ClaimList({claims,droppedClaims,events,onEvidence}:{claims:Claim[];droppedClaims:number;events:SessionEvent[];onEvidence:(evidence:Evidence)=>void}){
 const ordered=orderClaims(claims);
 return <div data-report-claims className="space-y-7"><p role="status" className="he-small">{claims.length} claims shown · {droppedClaims} unverifiable {droppedClaims===1?"claim":"claims"} removed</p>
 {!claims.length&&<p className="he-muted">No verified observations yet. Generate analysis to review evidence-backed claims.</p>}
 {dimensions.map(d=>{const selected=ordered.filter(c=>c.dimension===d);if(!selected.length)return null;return <section key={d} aria-label={`${dimensionLabels[d]} observations`} className="space-y-4"><h3>{dimensionLabels[d]}</h3>{selected.map(claim=>{const {Icon,label}=signals[claim.signal];return <AccentCard key={claim.id}><p className="flex items-center gap-2 he-small he-muted mb-3"><Icon size={16} aria-hidden="true"/>{label}</p><p><ReadableText>{claim.statement}</ReadableText></p><div data-evidence className="flex flex-wrap gap-2 mt-4">{claim.evidence.map((e,i)=><EvidenceChip key={i} kind={e.kind} label={e.kind==="code_line"?`L${e.line}`:`${e.eventId} · ${events.find(event=>event.id===e.eventId)?.type??"event"}`} onClick={()=>onEvidence(e)}/>)}<BasisLabel basis={claim.basis}/></div></AccentCard>;})}</section>;})}</div>;
}
