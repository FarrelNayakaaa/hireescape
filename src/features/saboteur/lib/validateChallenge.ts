import type { Level, RunResult } from "@/lib/contracts";
import { runTests } from "@/features/runner";
import { SaboteurOutput } from "../schema";
import type { CheckResult } from "./staticChecks";
import { checkInWorker } from "./checkInWorker";
export type ValidationResult={ok:boolean;checks:CheckResult[];failures:string[]};
export async function validateChallenge(raw:unknown,level:Level,onCheck?:(check:CheckResult)=>void,signal?:AbortSignal):Promise<ValidationResult> {
  signal?.throwIfAborted();
  const checks=await checkInWorker(raw,level);
  signal?.throwIfAborted();
  checks.forEach(check=>onCheck?.(check));
  const result=():ValidationResult=>({ok:checks.length===10&&checks.every(c=>c.pass),checks,failures:checks.filter(c=>!c.pass).map(c=>c.message??`${c.id} failed`)});
  if(checks.some(c=>!c.pass))return result();
  const output=SaboteurOutput.parse(raw);
  const runs:RunResult[]=[];
  for(const [id,code,testsSource,target] of [
    ["R1",output.starterCode,output.visibleTests,"visible"],
    ["R2",output.starterCode,output.hiddenTests,"hidden"],
    ["R3",output.referenceFix,output.hiddenTests,"hidden"],
    ["R4",output.referenceFix,output.visibleTests,"visible"],
  ] as const) {
    signal?.throwIfAborted();
    let run:RunResult;
    try{run=await runTests({code,testsSource,target,perTestTimeoutMs:1500});}
    catch{run={runId:"unavailable",target,total:0,passed:0,failed:0,results:[],runtimeError:"Runner unavailable",timedOut:false,durationMs:0};}
    signal?.throwIfAborted();
    runs.push(run);
    const bad=run.results.find(t=>t.status!=="pass");
    const valid=!run.runtimeError&&!run.timedOut&&run.total>0;
    const pass=valid&&(id==="R2"?run.failed>0&&run.results.some(t=>t.status!=="pass"):run.failed===0&&run.passed===run.total&&run.results.length===run.total&&run.results.every(t=>t.status==="pass"));
    const message=id==="R2"?(run.runtimeError?`R2 failed: hidden tests could not run on starterCode: ${run.runtimeError}`:"R2 failed: no hidden test fails on starterCode (the bug is not caught)"):
      `${id} failed: ${target} test '${bad?.name??"suite"}' fails on ${id==="R1"?"starterCode":"referenceFix"}: ${bad?.message??run.runtimeError??"No passing tests"}`;
    const check:CheckResult={id,pass,...(!pass?{message}:{})};checks.push(check);onCheck?.(check);
  }
  const timeout=runs.find(r=>r.timedOut);
  const r5:CheckResult={id:"R5",pass:!timeout,...(timeout?{message:`R5 failed: test '${timeout.results.find(t=>/timed?\s*out/i.test(t.message??""))?.name??"suite"}' timed out`}:{})};
  checks.push(r5);onCheck?.(r5);return result();
}
