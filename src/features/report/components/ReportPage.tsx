"use client";
import { useMemo } from "react";
import Link from "next/link";
import type { Session } from "@/lib/contracts";
import { useSessionStore } from "@/features/session";
import { useAssessmentBundle } from "@/features/assessment";
import { ANALYST_PROMPT_VERSION, REPORT_DISCLAIMER, computeObjectiveMetrics, useAnalysis } from "@/features/analyst";
import { AccentCard, AgentAvatar, Button } from "@/components/ui";
import { useSessionHydration } from "../hooks/useSessionHydration";
import { ReportDocument } from "./ReportDocument";
export function ReportState({kind}:{kind:"loading"|"not_found"|"error"}){return <main id="main-content" tabIndex={-1} className="he-page-width py-16"><AccentCard><h1>{kind==="loading"?"Loading session evidence":kind==="not_found"?"Session not found":"Session could not be loaded"}</h1><p className="he-muted my-5">{kind==="loading"?"Reading saved session data from this browser.":"Import the matching session backup in the manager workspace, then open its report again."}</p><Link href="/manager" className="he-chip">Back to manager</Link></AccentCard></main>;}
function SessionReport({session}:{session:Session}){
 const assessment=useAssessmentBundle(session.assessmentId),analysis=useAnalysis(session);
 const objective=useMemo(()=>computeObjectiveMetrics(session,{id:session.challengeId}),[session]);
 async function generate(){try{if(analysis.report||analysis.status==="error")await analysis.regenerate();else await analysis.generate();}catch{/* Safe recovery state comes from the Analyst hook. */}}
 const controls=<div data-print-hide className="space-y-4"><div className="flex flex-wrap gap-4 items-center"><AgentAvatar agent="analyst" state={analysis.status==="loading"?"thinking":analysis.report?"done":analysis.status==="error"?"error":"idle"}/><div><p className="font-semibold">Independent Analyst</p><p className="he-small he-muted">Claims appear only after their evidence is verified.</p></div><Button variant="secondary" loading={analysis.status==="loading"} onClick={()=>void generate()}>{analysis.report?"Regenerate analysis":"Generate analysis"}</Button></div>{analysis.status==="loading"&&<p role="status">Reviewing recorded evidence… Objective metrics and replay remain available.</p>}{analysis.status==="error"&&<AccentCard><p role="alert">Analysis unavailable — retry</p><p className="he-small he-muted mt-2">Objective metrics and the timeline are still available.</p></AccentCard>}{analysis.persistenceWarning&&<p role="status" className="he-small">{analysis.persistenceWarning}</p>}</div>;
 return <ReportDocument session={session} candidateAlias={assessment.bundle?.assessment.candidateAlias??"Fictional candidate · assessment details unavailable"} challengeTitle={assessment.bundle?.challenge.title??`Recorded challenge · ${session.challengeId}`} starterCode={assessment.bundle?.challenge.starterCode} proctoring={assessment.bundle?.assessment.proctoring} objective={objective} report={analysis.report} disclaimer={REPORT_DISCLAIMER} promptVersion={ANALYST_PROMPT_VERSION} analysisControls={controls} contextWarning={assessment.status==="not_found"?<p className="he-small he-muted mt-4">Assessment details are missing in this browser. Import the matching assessment backup to generate analysis.</p>:null}/>;
}
export function ReportPage({sessionId}:{sessionId:string}){
 const hydration=useSessionHydration();
 const session=useSessionStore(state=>state.sessions[sessionId]);
 if(hydration.error)return <ReportState kind="error"/>;
 if(!hydration.ready)return <ReportState kind="loading"/>;
 return session?<SessionReport key={session.id} session={session}/>:<ReportState kind="not_found"/>;
}
