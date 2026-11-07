"use client";
import { useEffect, useRef, useState } from "react";
import { getSeededChallenge } from "@challenges";
import type { AgentMeta, Challenge, ChallengeSecret, DefectType, Level } from "@/lib/contracts";
import { postAgent, ApiError } from "@/lib/api-client";
import { SaboteurOutput } from "../schema";
import { validateChallenge } from "../lib/validateChallenge";
import type { CheckResult } from "../lib/staticChecks";
import { seedOutput } from "../lib/seedOutput";
export type GenerateParams = { level: Level; defectType: DefectType | "surprise"; domainHint?: string | null };
export type StepId = "write" | "plant" | "tests" | "prove_fail" | "prove_pass" | "sealed";
export type CheckId = "S1"|"S2"|"S3"|"S4"|"S5"|"R1"|"R2"|"R3"|"R4"|"R5";
export type GenerateState = {
 status: "idle"|"running"|"done"|"error";
 steps: {id: StepId; label: string; status: "pending"|"active"|"done"|"error"}[];
 attempt: number; maxAttempts: 3; attempts: {n: number; status: "running"|"failed"|"passed"; failures: string[]}[];
 checks: {id: CheckId; label: string; status: "pending"|"pass"|"fail"}[];
 metas: AgentMeta[]; usedFallback: boolean; fallbackReason: string|null;
 result: {challenge: Challenge; secret: ChallengeSecret}|null; error: string|null;
};
const labels: [StepId,string][] = [["write","Writing service"],["plant","Planting one bug"],["tests","Writing hidden tests"],["prove_fail","Proving tests FAIL on broken code"],["prove_pass","Proving tests PASS on the fix"],["sealed","Challenge sealed ✓"]];
const checkLabels: [CheckId,string][] = [["S1","Schema valid"],["S2","Forbidden tokens absent"],["S3","Size within level bounds"],["S4","Both files compile"],["S5","Minimal fix overlaps defect"],["R1","Visible tests pass on starter"],["R2","Hidden tests expose the defect"],["R3","Hidden tests pass on fix"],["R4","Visible tests pass on fix"],["R5","No test timed out"]];
const initial = (): GenerateState => ({status:"idle",steps:labels.map(([id,label])=>({id,label,status:"pending"})),checks:checkLabels.map(([id,label])=>({id,label,status:"pending"})),attempt:0,maxAttempts:3,attempts:[],metas:[],usedFallback:false,fallbackReason:null,result:null,error:null});
let seededSecrets: Promise<typeof import("@challenges/secrets")> | undefined;
function loadSeededSecrets(){
  seededSecrets ??= import("@challenges/secrets").catch(error=>{seededSecrets=undefined;throw error;});
  return seededSecrets;
}
const suited:Record<Level,DefectType[]>={junior:["off_by_one","shared_mutation","unhandled_null"],mid:["swallowed_exception","cache_no_fallback","missing_await","unbounded_retry","resource_leak"],senior:["swallowed_exception","cache_no_fallback","missing_await","unbounded_retry","resource_leak"]};
function safeReason(error:unknown):string {
  if(error instanceof DOMException&&error.name==="AbortError")return "Generation reached the time budget.";
  if(error instanceof ApiError)return error.code==="config"?"The model service is not configured.":"The model service is unavailable.";
  return "Generation or validation was unavailable.";
}
export function useGenerateChallenge(): GenerateState & {start(p:GenerateParams):Promise<{challenge:Challenge;secret:ChallengeSecret}>;reset():void} {
  const [state,setState]=useState(initial);
  const pending=useRef<Promise<{challenge:Challenge;secret:ChallengeSecret}>|null>(null);
  const mounted=useRef(true);
  const currentController=useRef<AbortController|null>(null);
  useEffect(()=>{mounted.current=true;
    // Warm manager-only fallback code before a later network failure. No fixes enter the public bundle.
    void loadSeededSecrets().then(({getSeededSecret})=>{
      const seed=getSeededChallenge();const secret=getSeededSecret(seed.id);
      // Preload both bounded workers while online so an offline fallback can still execute.
      if(secret)return validateChallenge(seedOutput(seed,secret),seed.level);
    }).catch(()=>undefined);
    return()=>{mounted.current=false;currentController.current?.abort();};},[]);
  function update(fn:(previous:GenerateState)=>GenerateState){if(mounted.current)setState(fn);}
  function start(p:GenerateParams) {
    if(pending.current)return pending.current;
    const controller=new AbortController();currentController.current=controller;
    // Reserve 30 s for fresh fallback proof (static worker + four bounded runner jobs).
    const timer=setTimeout(()=>controller.abort(),120_000);
    const defect=p.defectType==="surprise"?suited[p.level][Math.floor(Math.random()*suited[p.level].length)]:p.defectType;
    pending.current=(async()=>{
      update(()=>({...initial(),status:"running"}));
      let failures:string[]=[];let reason="Validation did not pass after three attempts.";let attempt=0;
      const onCheck=(check:CheckResult)=>update(s=>({...s,checks:s.checks.map(c=>c.id===check.id?{...c,status:check.pass?"pass":"fail"}:c),steps:s.steps.map((step,i)=>({...step,status:i<3?"done":check.id==="R1"||check.id==="R2"?(i===3?"active":"pending"):check.id.startsWith("R")?(i===3?"done":i===4?"active":"pending"):"pending"}))}));
      try {
        for(attempt=1;attempt<=3;attempt++){
          const n=attempt;
          controller.signal.throwIfAborted();
          update(s=>({...s,attempt:n,checks:initial().checks,steps:s.steps.map((step,i)=>({...step,status:i===0?"active":"pending"})),attempts:[...s.attempts,{n,status:"running",failures:[]}]}));
          const response=await postAgent<{output?:unknown;meta?:AgentMeta}>("/api/saboteur",{level:p.level,defectType:defect,domainHint:p.domainHint??null,previousFailures:failures.slice(-10)},{signal:controller.signal});
          controller.signal.throwIfAborted();
          if(response.meta)update(s=>({...s,metas:[...s.metas,response.meta!]}));
          // The one mock fixture always represents the mid-level cache challenge.
          const level=response.meta?.mock?"mid":p.level;
          const actualDefect=response.meta?.mock?"cache_no_fallback":defect;
          const validation=await validateChallenge(response.output,level,onCheck,controller.signal);
          update(s=>({...s,attempts:s.attempts.map(a=>a.n===n?{...a,status:validation.ok?"passed":"failed",failures:validation.failures}:a)}));
          if(validation.ok){
            const output=SaboteurOutput.parse(response.output);
            const {referenceFix,defectLines,...fields}=output;
            const challenge:Challenge={...fields,id:`gen-${actualDefect}-${level}-${Date.now()}-${crypto.randomUUID()}`,level,defectType:actualDefect,language:"javascript",source:"generated",defectLines:[defectLines[0],defectLines[1]],validation:{brokenFailsHidden:true,fixPassesHidden:true,attempts:n,validatedAt:new Date().toISOString()}};
            const result={challenge,secret:{challengeId:challenge.id,referenceFix}};
            update(s=>({...s,status:"done",result,steps:s.steps.map(step=>({...step,status:"done"}))}));return result;
          }
          failures=[...failures,...validation.failures].slice(-10);
        }
      }catch(error){reason=safeReason(error);update(s=>({...s,attempts:s.attempts.map(a=>a.status==="running"?{...a,status:"failed",failures:[reason]}:a)}));}
      finally{clearTimeout(timer);}
      if(!mounted.current)throw new DOMException("Generation cancelled.","AbortError");
      update(s=>({...s,attempt:Math.min(attempt,3),usedFallback:true,fallbackReason:reason,checks:initial().checks}));
      const challenge=getSeededChallenge(defect,p.level);
      const {getSeededSecret}=await loadSeededSecrets();
      const secret=getSeededSecret(challenge.id);
      if(!secret)throw new Error("The fallback secret is unavailable.");
      const output=seedOutput(challenge,secret);
      const validation=await validateChallenge(output,challenge.level,onCheck);
      if(!validation.ok)throw new Error("The fallback could not be proven. Please retry.");
      const result={challenge:{...challenge,starterCode:output.starterCode,validation:{brokenFailsHidden:true,fixPassesHidden:true,attempts:Math.min(attempt,3),validatedAt:new Date().toISOString()}},secret:{...secret,referenceFix:output.referenceFix}};
      update(s=>({...s,status:"done",result,steps:s.steps.map(step=>({...step,status:"done"}))}));return result;
    })().catch(()=>{
      update(s=>({...s,status:"error",error:"The challenge could not be validated. Retry or use the quick demo.",steps:s.steps.map(step=>step.status==="active"?{...step,status:"error"}:step)}));
      throw new Error("The challenge could not be validated. Retry or use the quick demo.");
    }).finally(()=>{clearTimeout(timer);pending.current=null;currentController.current=null;});
    return pending.current;
  }
  return {...state,start,reset(){if(!pending.current)update(initial);}};
}
