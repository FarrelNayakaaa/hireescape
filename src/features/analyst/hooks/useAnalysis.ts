"use client";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import type { AgentMeta, Challenge, ChallengeSecret, Report, Session } from "@/lib/contracts";
import { getAssessmentBundle, useAssessmentStore } from "@/features/assessment";
import { postAgent } from "@/lib/api-client";
import { AnalystOutput } from "../schema";
import { ANALYST_PROMPT_VERSION, REPORT_DISCLAIMER } from "../constants";
import { buildAnalysisRequest } from "../lib/buildRequest";
import { computeObjectiveMetrics } from "../lib/metrics";
import { verifyClaims } from "../lib/verifyClaims";
import { deriveCompetency } from "../lib/competency";
import { sanitizeSummary } from "../lib/sanitize";
import { getReportPersistenceWarning, hydrateReports, reportCacheKey, useReportHydration, useReportStore } from "../store";
export type AnalysisContext={challenge:Challenge;secret:ChallengeSecret};
export type AnalysisState={status:"idle"|"loading"|"ready"|"error";report:Report|null;error:string|null};
async function loadContext(session:Session):Promise<AnalysisContext>{
 if(!useAssessmentStore.persist.hasHydrated())await useAssessmentStore.persist.rehydrate();
 const bundle=getAssessmentBundle(session.assessmentId);
 if(!bundle||bundle.challenge.id!==session.challengeId)throw new Error("Assessment context is unavailable.");
 // Read only the manager-owned secret namespace, never integrity/session storage.
 const raw:unknown=JSON.parse(localStorage.getItem("he:secrets")??"null");
 const secrets=z.object({state:z.object({secrets:z.record(z.string(),z.object({challengeId:z.string(),referenceFix:z.string()}))})}).parse(raw);
 const secret=secrets.state.secrets[session.challengeId];
 if(!secret||secret.challengeId!==session.challengeId)throw new Error("Reference fix is unavailable.");
 return {challenge:bundle.challenge,secret};
}
function verifyCached(report:Report,session:Session):Report {
 const objective=computeObjectiveMetrics(session,{id:session.challengeId});
 const raw=report.claims.map(c=>({...c,evidence:c.evidence.map(e=>({...e,line:e.line??null,eventId:e.eventId??null}))}));
 const verified=verifyClaims(raw,session,objective);
 return {...report,aiAssistance:session.aiAssistance,objective,claims:verified.claims,droppedClaims:report.droppedClaims+verified.droppedClaims,competency:deriveCompetency(verified.claims,objective,session.aiAssistance),summary:sanitizeSummary(report.summary),disclaimer:REPORT_DISCLAIMER};
}
export function useAnalysis(session:Session,context?:AnalysisContext){
 const hydrated=useReportHydration();
 const cached=useReportStore(state=>state.cache[reportCacheKey(session.id,ANALYST_PROMPT_VERSION)]??state.reports[session.id]);
 const cachedReport=useMemo(()=>hydrated&&cached?.promptVersion===ANALYST_PROMPT_VERSION?verifyCached(cached,session):null,[cached,session,hydrated]);
 const [state,setState]=useState<AnalysisState&{sessionId:string}>({sessionId:session.id,status:"idle",report:null,error:null});
 const pending=useRef<{id:string;promise:Promise<Report>}|null>(null);
 function generate(opts?:{regenerate?:boolean}):Promise<Report>{
  if(pending.current?.id===session.id)return pending.current.promise;
  setState({sessionId:session.id,status:"loading",report:null,error:null});
  const promise=(async()=>{
   try{
    await hydrateReports();
    const store=useReportStore.getState();
    const saved=store.cache[reportCacheKey(session.id,ANALYST_PROMPT_VERSION)]??store.reports[session.id];
    if(!opts?.regenerate&&saved?.promptVersion===ANALYST_PROMPT_VERSION){const report=verifyCached(saved,session);setState({sessionId:session.id,status:"ready",report,error:null});return report;}
    const resolved=context??await loadContext(session);
    const input=buildAnalysisRequest(session,resolved.challenge,resolved.secret);
    const response=await postAgent<{output:unknown;meta?:AgentMeta}>("/api/analyst",input);
    const output=AnalystOutput.parse(response.output);
    const verified=verifyClaims(output.claims,session,input.objective);
    const report:Report={sessionId:session.id,generatedAt:new Date().toISOString(),promptVersion:ANALYST_PROMPT_VERSION,aiAssistance:session.aiAssistance,objective:input.objective,...verified,competency:deriveCompetency(verified.claims,input.objective,session.aiAssistance),summary:sanitizeSummary(output.summary),disclaimer:REPORT_DISCLAIMER};
    useReportStore.getState().save(report);
    setState({sessionId:session.id,status:"ready",report,error:null});return report;
   }catch{
    setState({sessionId:session.id,status:"error",report:null,error:"Analysis unavailable — retry. Objective evidence remains available."});
    throw new Error("Analysis unavailable — retry.");
   }finally{if(pending.current?.id===session.id)pending.current=null;}
  })();pending.current={id:session.id,promise};return promise;
 }
 const current=state.sessionId===session.id?state:null;
 const report=current?.status==="loading"||current?.status==="error"?null:cachedReport??current?.report??null;
 return {status:current?.status==="loading"||current?.status==="error"?current.status:report?"ready" as const:"idle" as const,report,error:current?.error??null,persistenceWarning:getReportPersistenceWarning(),generate,regenerate:()=>generate({regenerate:true})};
}
