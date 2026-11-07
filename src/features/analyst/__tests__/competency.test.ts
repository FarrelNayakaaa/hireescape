import { expect, it } from "vitest";
import type { Claim } from "@/lib/contracts";
import { deriveCompetency } from "../lib/competency";
import { computeObjectiveMetrics } from "../lib/metrics";
import { challenge, fixtureSession } from "./fixtures";
const objective=computeObjectiveMetrics(fixtureSession(),challenge);
it.each([[0,0,"insufficient"],[1,0,"some"],[2,0,"strong"],[0,1,"concern"],[1,2,"concern"],[2,1,"some"],[1,1,"some"]] as const)("derives %i strengths / %i concerns → %s",(s,c,level)=>{const claims:Claim[]=Array.from({length:s+c},(_,i)=>({id:`c${i}`,dimension:"debugging",signal:i<s?"strength":"concern",statement:"Verified behaviour",evidence:[],basis:"executed"}));expect(deriveCompetency(claims,objective,true).debugging).toBe(level);});
it("caps debugging at some for incomplete hidden tests and disables AI assessment when off",()=>{const claims:Claim[]=Array.from({length:2},(_,i)=>({id:`c${i}`,dimension:"debugging",signal:"strength",statement:"Verified",evidence:[],basis:"executed"}));expect(deriveCompetency(claims,{...objective,hiddenPassed:3},false)).toMatchObject({debugging:"some",ai_supervision:"not_assessed"});});
