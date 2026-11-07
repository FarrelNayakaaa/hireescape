"use client";
import { useRef, useState } from "react";
import { getSeededChallenge } from "@challenges";
import type { AgentMeta, Challenge, ChallengeSecret, DefectType, Level } from "@/lib/contracts";
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
const labels: [StepId,string][] = [["write","Writing service"],["plant","Planting one bug"],["tests","Writing hidden tests"],["prove_fail","Proving tests FAIL on broken code"],["prove_pass","Proving tests PASS on the fix"],["sealed","Challenge sealed"]];
const checkLabels: [CheckId,string][] = [["S1","Schema valid"],["S2","Forbidden tokens absent"],["S3","Size within level bounds"],["S4","Both files compile"],["S5","Minimal fix overlaps defect"],["R1","Visible tests pass on starter"],["R2","Hidden tests expose the defect"],["R3","Hidden tests pass on fix"],["R4","Visible tests pass on fix"],["R5","No test timed out"]];
const initial = (): GenerateState => ({status:"idle",steps:labels.map(([id,label])=>({id,label,status:"pending"})),checks:checkLabels.map(([id,label])=>({id,label,status:"pending"})),attempt:0,maxAttempts:3,attempts:[],metas:[],usedFallback:false,fallbackReason:null,result:null,error:null});
export function useGenerateChallenge(): GenerateState & {start(p:GenerateParams):Promise<{challenge:Challenge;secret:ChallengeSecret}>;reset():void} {
 const [state,setState]=useState(initial);
 const pending=useRef<Promise<{challenge:Challenge;secret:ChallengeSecret}>|null>(null);
 function start(p:GenerateParams) {
  if(pending.current) return pending.current;
  pending.current=(async()=>{
   setState({...initial(),status:"running",usedFallback:true,fallbackReason:"stub"});
   try {
    const challenge=getSeededChallenge(p.defectType==="surprise"?undefined:p.defectType,p.level);
    const {getSeededSecret}=await import("@challenges/secrets");
    const secret=getSeededSecret(challenge.id);
    if(!secret) throw new Error("Pre-validated challenge unavailable.");
    // Temporary A4 preview: steps illustrate stored seed validation, not live generation/execution.
    for(let n=0;n<labels.length;n++) {
     setState(s=>({...s,steps:s.steps.map((step,i)=>({...step,status:i<n?"done":i===n?"active":"pending"}))}));
     await new Promise<void>(resolve=>setTimeout(resolve,90));
    }
    const result={challenge,secret};
    setState(s=>({...s,status:"done",steps:s.steps.map(step=>({...step,status:"done"})),checks:s.checks.map(check=>({...check,status:check.id.startsWith("R")?"pass":"pending"})),result}));
    // R1–R5 describe the committed V1–V5 seed results. Static checks remain pending; A5 runs them afresh.
    return result;
   } catch {
    setState(s=>({...s,status:"error",error:"The seeded challenge could not be loaded. Please retry."}));
    throw new Error("The seeded challenge could not be loaded. Please retry.");
   } finally {pending.current=null;}
  })();
  return pending.current;
 }
 return {...state,start,reset(){if(!pending.current)setState(initial());}};
}
