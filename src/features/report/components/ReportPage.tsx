"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Evidence, Session } from "@/lib/contracts";
import { useSessionStore } from "@/features/session";
import { useAssessmentBundle } from "@/features/assessment";
import { ANALYST_PROMPT_VERSION, REPORT_DISCLAIMER, computeObjectiveMetrics, useAnalysis } from "@/features/analyst";
import { AccentCard, AgentAvatar, AiModeBadge, Button } from "@/components/ui";
import { ReadableText } from "@/components/ui/ReadableText";
import { ReportMotionContext } from "@/components/ui/environment";
import { useSessionHydration } from "../hooks/useSessionHydration";
import { evidenceTargetId, formatDuration } from "../lib/events";
import { ClaimList } from "./ClaimList";
import { CompetencyTiles } from "./CompetencyTiles";
import { DecisionPanel } from "./DecisionPanel";
import { IntegritySection } from "./IntegritySection";
import { ObjectiveStrip } from "./ObjectiveStrip";
import { SectionTitle } from "./SectionTitle";
import { Timeline } from "./Timeline";
export function ReportState({kind}:{kind:"loading"|"not_found"|"error"}){return <main id="main-content" tabIndex={-1} className="he-page-width py-16"><AccentCard><h1>{kind==="loading"?"Loading session evidence":kind==="not_found"?"Session not found":"Session could not be loaded"}</h1><p className="he-muted my-5">{kind==="loading"?"Reading saved session data from this browser.":"Import the matching session backup in the manager workspace, then open its report again."}</p><Link href="/manager" className="he-chip">Back to manager</Link></AccentCard></main>;}
function SessionReport({session}:{session:Session}){
 const assessment=useAssessmentBundle(session.assessmentId);
 const analysis=useAnalysis(session);
 const objective=useMemo(()=>computeObjectiveMetrics(session,{id:session.challengeId}),[session]);
 const [selected,setSelected]=useState<Evidence|null>(null),[codeOpen,setCodeOpen]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 useEffect(()=>{if(!selected)return;const value=selected.kind==="event"?selected.eventId:selected.line;if(value===undefined)return;const target=document.getElementById(evidenceTargetId(selected.kind,value));target?.scrollIntoView?.({block:"center",behavior:"instant"});target?.focus({preventScroll:true});},[selected]);
 function jump(evidence:Evidence){if(timer.current)clearTimeout(timer.current);if(evidence.kind==="code_line")setCodeOpen(true);setSelected({...evidence});timer.current=setTimeout(()=>setSelected(null),2000);}
 const report=analysis.report;
 const duration=session.endedAt?(Date.parse(session.endedAt)-Date.parse(session.startedAt))/1000:(session.events.at(-1)?.t??0)/1000;
 async function generate(){try{if(report)await analysis.regenerate();else await analysis.generate();}catch{/* Safe error and objective-only state come from the Analyst hook. */}}
 return <ReportMotionContext value={true}><div className="he-report he-page-width py-10 space-y-12"><header className="border-b border-he-border pb-8"><Link href="/manager" className="he-chip mb-7">Back to manager</Link><p className="he-eyebrow">Evidence report</p><h1 className="mt-3 mb-4"><ReadableText>{assessment.bundle?.assessment.candidateAlias??"Fictional candidate · assessment details unavailable"}</ReadableText></h1><h2 className="mb-5">{assessment.bundle?.challenge.title??`Recorded challenge · ${session.challengeId}`}</h2><div className="flex flex-wrap items-center gap-4 he-small"><AiModeBadge on={session.aiAssistance}/><time dateTime={session.startedAt}>{session.startedAt.replace("T"," ").replace(".000Z"," UTC")}</time><span className="he-mono">Duration {formatDuration(duration)}</span><span>Ended: {session.endReason??"in progress"}</span></div>{assessment.status==="not_found"&&<p className="he-small he-muted mt-4">Assessment details are missing in this browser. Import the matching assessment backup to generate analysis.</p>}</header>
 <main id="main-content" tabIndex={-1} className="space-y-12">
 <section aria-labelledby="report-objective"><SectionTitle n={1} title="Objective" id="report-objective"/><ObjectiveStrip session={session} objective={objective}/></section>
 <section aria-label="Analyst analysis" className="space-y-4"><div className="flex flex-wrap gap-4 items-center"><AgentAvatar agent="analyst" state={analysis.status==="loading"?"thinking":report?"done":analysis.status==="error"?"error":"idle"}/><div><p className="font-semibold">Independent Analyst</p><p className="he-small he-muted">Claims appear only after their evidence is verified.</p></div><Button variant="secondary" loading={analysis.status==="loading"} onClick={()=>void generate()}>{report?"Regenerate analysis":"Generate analysis"}</Button></div>{analysis.status==="loading"&&<p role="status">Reviewing recorded evidence… Objective metrics and timeline remain available.</p>}{analysis.status==="error"&&<AccentCard><p role="alert">Analysis unavailable — retry</p><p className="he-small he-muted mt-2">Objective metrics and the timeline are still available.</p></AccentCard>}{analysis.persistenceWarning&&<p role="status" className="he-small">{analysis.persistenceWarning}</p>}{report?.summary&&<p><ReadableText>{report.summary}</ReadableText></p>}</section>
 <section aria-labelledby="report-competency"><SectionTitle n={2} title="Competency map" id="report-competency"/><CompetencyTiles claims={report?.claims??[]} competency={report?.competency} aiAssistance={session.aiAssistance}/></section>
 <section aria-labelledby="report-claims"><SectionTitle n={3} title="Evidence-backed observations" id="report-claims"/><ClaimList claims={report?.claims??[]} droppedClaims={report?.droppedClaims??0} events={session.events} onEvidence={jump}/></section>
 <section aria-labelledby="report-timeline"><SectionTitle n={4} title="Timeline" id="report-timeline"/><Timeline session={session} selected={selected} codeOpen={codeOpen} onCodeOpen={setCodeOpen}/></section>
 <IntegritySection sessionId={session.id} enabled={assessment.bundle?.assessment.proctoring.mode!==undefined&&assessment.bundle.assessment.proctoring.mode!=="off"}/>
 <section aria-labelledby="report-decision"><SectionTitle n={6} title="Your decision" id="report-decision"/><AccentCard><DecisionPanel sessionId={session.id}/></AccentCard></section>
 </main><footer className="border-t border-he-border pt-6 he-small he-muted space-y-3"><p>{report?.disclaimer??REPORT_DISCLAIMER}</p><p className="he-mono">{report?.promptVersion??ANALYST_PROMPT_VERSION}{report?` · Generated ${report.generatedAt}`:" · Analysis not generated"}</p><p>Generated by the Analyst (independent Codex instance).</p></footer></div></ReportMotionContext>;
}
export function ReportPage({sessionId}:{sessionId:string}){
 const hydration=useSessionHydration();
 const session=useSessionStore(state=>state.sessions[sessionId]);
 if(hydration.error)return <ReportState kind="error"/>;
 if(!hydration.ready)return <ReportState kind="loading"/>;
 return session?<SessionReport key={session.id} session={session}/>:<ReportState kind="not_found"/>;
}
