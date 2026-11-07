import type { Level } from "@/lib/contracts";
import { loadModule } from "@/features/runner/harness";
import { diffLineOps } from "@/features/session";
import { SaboteurOutput } from "../schema";
import { lineBounds } from "./seedOutput";
export type CheckResult = { id: "S1"|"S2"|"S3"|"S4"|"S5"|"R1"|"R2"|"R3"|"R4"|"R5"; pass: boolean; message?: string };
const forbidden: [string,RegExp][] = [
  ...["require","import","process","fetch","eval","setInterval","XMLHttpRequest","WebSocket","importScripts","window","document"].map((token):[string,RegExp]=>[token,new RegExp(`\\b${token}\\b`)]),
  ["Function(",/\bFunction\s*\(/], ["Date.now",/\bDate\s*\.\s*now\b/], ["Math.random",/\bMath\s*\.\s*random\b/],
];
export function staticChecks(raw: unknown, level: Level): CheckResult[] {
  const parsed=SaboteurOutput.safeParse(raw);
  if(!parsed.success)return [{id:"S1",pass:false,message:"S1 failed: output does not match the schema"}];
  const output=parsed.data;
  const checks:CheckResult[]=[{id:"S1",pass:true}];
  let s2:CheckResult={id:"S2",pass:true};
  for(const field of ["starterCode","referenceFix"] as const)for(const [token,regex] of forbidden)if(s2.pass&&regex.test(output[field]))s2={id:"S2",pass:false,message:`S2 failed: forbidden token "${token}" in ${field}`};
  checks.push(s2);
  const [min,max]=lineBounds[level];
  const count=output.starterCode.split("\n").length;
  const fixCount=output.referenceFix.split("\n").length;
  checks.push(count<min||count>max?{id:"S3",pass:false,message:`S3 failed: starterCode has ${count} lines; ${level} needs ${min}-${max}`}:
    fixCount<min||fixCount>max?{id:"S3",pass:false,message:`S3 failed: referenceFix has ${fixCount} lines; ${level} needs ${min}-${max}`}:{id:"S3",pass:true});
  let s4:CheckResult={id:"S4",pass:true};
  // Never execute code that failed token/size checks. In browsers this whole function runs in a bounded Worker.
  if(s2.pass&&checks.at(-1)?.pass)for(const field of ["starterCode","referenceFix"] as const) {
    try {loadModule(output[field]);}catch(error){s4={id:"S4",pass:false,message:`S4 failed: ${field} does not load: ${error instanceof Error?error.message:"Unknown error"}`};break;}
  } else s4={id:"S4",pass:false,message:"S4 failed: module loading skipped after unsafe or oversized input"};
  checks.push(s4);
  // Bound the quadratic diff allocation before processing untrusted strings.
  if(count>150||fixCount>150){checks.push({id:"S5",pass:false,message:"S5 failed: diff too large"});return checks;}
  const ops=diffLineOps(output.starterCode.trimEnd().split("\n"),output.referenceFix.trimEnd().split("\n"));
  let changed=0,removed=0,added=0;
  for(const op of ops){if(op.type==="remove")removed++;else if(op.type==="add")added++;else{changed+=Math.max(removed,added);removed=0;added=0;}}
  changed+=Math.max(removed,added);
  const [start,end]=output.defectLines;
  let oldLine=1;
  const touched:number[]=[];
  for(const op of ops){if(op.type==="equal")oldLine=op.oldIndex+2;else if(op.type==="remove"){touched.push(op.oldIndex+1);oldLine=op.oldIndex+2;}else touched.push(Math.min(count,Math.max(1,oldLine)));}
  checks.push(changed>20?{id:"S5",pass:false,message:"S5 failed: diff too large"}:
    start>end||end>count||!touched.some(n=>n>=start&&n<=end)?{id:"S5",pass:false,message:"S5 failed: no overlap with defectLines"}:{id:"S5",pass:true});
  return checks;
}
