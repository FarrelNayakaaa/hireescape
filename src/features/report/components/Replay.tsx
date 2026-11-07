"use client";
import dynamic from "next/dynamic";
import { Component, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import type { Evidence, Session } from "@/lib/contracts";
import { Button } from "@/components/ui";
import { buildReplayFrames, frameForEvent, playbackDelay } from "../lib/replay";
import { evidenceTargetId, formatDuration, testData } from "../lib/events";
import { Timeline } from "./Timeline";
import styles from "./replay.module.css";
const Editor=dynamic(()=>import("./ReplayEditor").then(mod=>mod.ReplayEditor),{ssr:false,loading:()=> <p role="status">Loading bundled read-only editor…</p>});
class EditorBoundary extends Component<{children:ReactNode;code:string},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<pre className="he-mono overflow-auto p-4" aria-label="Read-only snapshot code">{this.props.code}</pre>:this.props.children;}}
export interface ReplayHandle{jump:(evidence:Evidence)=>void}
export const Replay=forwardRef<ReplayHandle,{session:Session;starterCode?:string}>(function Replay({session,starterCode},ref){
 const frames=useMemo(()=>buildReplayFrames(session,starterCode),[session,starterCode]);
 const [cursor,setCursor]=useState(0),[eventId,setEventId]=useState(frames[0].eventId),[playing,setPlaying]=useState(false),[showOrigin,setShowOrigin]=useState(false),[selected,setSelected]=useState<Evidence|null>(null);
 const index=Math.min(cursor,frames.length-1),frame=frames[index];
 const highlight=useRef<ReturnType<typeof setTimeout>|null>(null),region=useRef<HTMLElement|null>(null);
 useEffect(()=>()=>{if(highlight.current)clearTimeout(highlight.current);},[]);
 function selectFrame(next:number){setCursor(Math.max(0,Math.min(frames.length-1,next)));setEventId(frames[Math.max(0,Math.min(frames.length-1,next))].eventId);setSelected(null);setPlaying(false);if(highlight.current)clearTimeout(highlight.current);}
 function jump(evidence:Evidence){
  setPlaying(false);if(highlight.current)clearTimeout(highlight.current);
  const next=evidence.kind==="code_line"?frames.length-1:frameForEvent(frames,session.events,evidence.eventId??"");
  setCursor(next);setEventId(evidence.kind==="event"?evidence.eventId??frames[next].eventId:frames[next].eventId);setSelected({...evidence});
  highlight.current=setTimeout(()=>setSelected(null),2000);
  const target=evidence.kind==="event"?document.getElementById(evidenceTargetId("event",evidence.eventId??"")):region.current;
  target?.scrollIntoView?.({block:"center",behavior:"instant"});target?.focus({preventScroll:true});
 }
 useImperativeHandle(ref,()=>({jump}));
 function nextEvent(delta:number){const current=session.events.findIndex(e=>e.id===eventId);const event=session.events[Math.max(0,Math.min(session.events.length-1,current+delta))];if(event)jump({kind:"event",eventId:event.id,quote:""});}
 function togglePlay(){if(index===frames.length-1){setCursor(0);setEventId(frames[0].eventId);}setPlaying(value=>!value);}
 useEffect(()=>{if(!playing||index>=frames.length-1)return;const timer=setTimeout(()=>{const next=index+1;setCursor(next);setEventId(frames[next].eventId);if(next===frames.length-1)setPlaying(false);},playbackDelay(frame.t,frames[index+1].t));return()=>clearTimeout(timer);},[playing,index,frame.t,frames]);
 const line=selected?.kind==="code_line"?selected.line??null:null;
 return <section ref={region} tabIndex={0} aria-label="Session replay" className={`${styles.replay} space-y-5`} onKeyDown={event=>{
  const target=event.target as HTMLElement;if(target.closest("input,textarea,select,[contenteditable=true],.monaco-editor"))return;
  if(event.key==="ArrowLeft"){event.preventDefault();nextEvent(-1);}else if(event.key==="ArrowRight"){event.preventDefault();nextEvent(1);}else if(event.code==="Space"&&!target.closest("button")){event.preventDefault();togglePlay();}
 }}><p className="he-small he-muted">Read-only replay · 2× speed · idle gaps capped at 10 seconds. Arrow keys select events; Space plays or pauses when the replay is focused.</p>
 <div className="flex flex-wrap items-center gap-3"><Button variant="secondary" size="sm" onClick={()=>nextEvent(-1)}>Previous event</Button><Button variant="secondary" size="sm" onClick={togglePlay}>{playing?"Pause replay":"Play replay"}</Button><Button variant="secondary" size="sm" onClick={()=>nextEvent(1)}>Next event</Button><label className="flex gap-2 items-center he-small"><input type="checkbox" checked={showOrigin} onChange={event=>setShowOrigin(event.target.checked)}/>Show origin</label></div>
 <label className="block he-small">Snapshot {index+1} of {frames.length}<input aria-label="Replay snapshot" type="range" min={0} max={frames.length-1} step={1} value={index} onChange={event=>selectFrame(Number(event.target.value))} className="block w-full mt-3 accent-he-blue"/></label>
 <p role="status" className="he-mono he-small">{frame.eventId} · {formatDuration(frame.t/1000)}{index===frames.length-1?" · Final snapshot":""}{line?` · Line ${line} highlighted`:""}</p>
 <div className={styles.markers} aria-label="Replay event markers">{session.events.filter(e=>["test_run","ai_apply","inquisitor_question","candidate_answer"].includes(e.type)).map(event=>{const run=testData(event);const kind=run?(run.hidden.total>0&&run.hidden.passed===run.hidden.total&&!run.timedOut&&!run.runtimeError?"pass":"fail"):event.type;return <button key={event.id} type="button" className={styles.marker} data-kind={kind} aria-current={event.id===eventId?"true":undefined} aria-label={`Replay ${event.id}: ${event.type}${run?` hidden ${run.hidden.passed}/${run.hidden.total}`:""}`} onClick={()=>jump({kind:"event",eventId:event.id,quote:""})}>{run?(kind==="pass"?"✓ ":"✗ "):""}{event.id} · {event.type.replaceAll("_"," ")}</button>;})}</div>
 {showOrigin&&<p className="he-small he-muted">AI accepted: purple fill · AI edited: purple outline · Pasted: yellow outline · Starter and manual: unmarked.</p>}
 {frame.approximate&&<p className="he-small he-muted">Origin precision is limited where edit snapshots were not retained. Origins are reconstructed; stored line-origin labels are not reused.</p>}
 <div className={styles.editor}><EditorBoundary code={frame.code}><Editor code={frame.code} origins={frame.origins} showOrigin={showOrigin} highlightLine={line}/></EditorBoundary></div>
 <Timeline session={session} selected={selected} codeOpen={false} onCodeOpen={()=>{}} hideFinalCode/>
 </section>;
});
