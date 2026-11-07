"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui";
import { decisionChoices, type Decision, useDecisionStore } from "../decisionStore";
const subscribe=(notify:()=>void)=>{const a=useDecisionStore.persist.onHydrate(notify),b=useDecisionStore.persist.onFinishHydration(notify);return()=>{a();b();};};
function DecisionForm({sessionId,saved}:{sessionId:string;saved?:Decision}){
 const [choice,setChoice]=useState<Decision["decision"]|null>(saved?.decision??null);
 const [note,setNote]=useState(saved?.note??"");const [message,setMessage]=useState("");
 const valid=!!choice&&note.trim().length>=20;
 return <form onSubmit={e=>{e.preventDefault();if(!choice||!valid)return;const persisted=useDecisionStore.getState().save({sessionId,decision:choice,note:note.trim()});setMessage(persisted?"Decision saved locally.":"Decision saved in this tab. Browser storage is unavailable; keep this tab open.");}} className="space-y-5">
 <p>You make the decision. The evidence above is here to help, not to decide.</p><fieldset className="space-y-3"><legend className="sr-only">Decision</legend>{(Object.keys(decisionChoices) as Decision["decision"][]).map(value=><label className="flex gap-3 items-center cursor-pointer" key={value}><input type="radio" name={`decision-${sessionId}`} value={value} checked={choice===value} onChange={()=>{setChoice(value);setMessage("");}}/>{decisionChoices[value]}</label>)}</fieldset>
 <label className="block" htmlFor={`note-${sessionId}`}>Decision note (required, at least 20 characters)</label><textarea id={`note-${sessionId}`} minLength={20} required maxLength={4000} rows={4} value={note} onChange={e=>{setNote(e.target.value);setMessage("");}} aria-describedby={`note-help-${sessionId}`} className="w-full p-3 border border-he-border bg-he-bg text-he-text rounded-[var(--he-radius)]"/>
 <p className="he-small he-muted" id={`note-help-${sessionId}`}>{note.trim().length} characters. Explain your decision using the evidence above.</p><Button type="submit" variant="secondary" disabled={!valid}>Save decision</Button><p role="status" className="he-small">{message||(!saved?"No decision saved yet.":"A decision was saved locally.")}</p></form>;
}
export function DecisionPanel({sessionId}:{sessionId:string}){
 const ready=useSyncExternalStore(subscribe,useDecisionStore.persist.hasHydrated,()=>false);
 const saved=useDecisionStore(state=>state.decisions[sessionId]);
 useEffect(()=>{if(!useDecisionStore.persist.hasHydrated())void useDecisionStore.persist.rehydrate();},[]);
 return ready?<DecisionForm key={sessionId} sessionId={sessionId} saved={saved}/>:<p role="status">Loading saved decision…</p>;
}
