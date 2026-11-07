// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { getSeededChallenge } from "@challenges";
import { getSeededSecret } from "@challenges/secrets";
import { useAnalysis, useReportStore } from "@/features/analyst";
import { demoSession } from "../fixtures/demoSession";
import { demoOutput, demoMeta } from "../fixtures/demoOutput";
import { demoReport } from "../fixtures/demoReport";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("generates the static demo report through real client verification, dropping exactly one claim",async()=>{
 localStorage.clear();await useReportStore.persist.rehydrate();useReportStore.setState({reports:{},cache:{}});
 vi.stubGlobal("fetch",vi.fn().mockImplementation(async()=>Response.json({output:demoOutput,meta:demoMeta})));
 const challenge=getSeededChallenge();const secret=getSeededSecret(challenge.id)!;
 const {result}=renderHook(()=>useAnalysis(demoSession,{challenge,secret}));let actual!:typeof demoReport;
 await act(async()=>{actual=await result.current.generate();});actual={...actual,generatedAt:"2026-11-07T00:12:00.000Z"};
 expect(actual.droppedClaims).toBe(1);expect(actual.claims).toHaveLength(8);expect(actual.claims.some(c=>c.signal==="concern")).toBe(true);
 if(process.env.HIRESCAPE_WRITE_DEMO==="1"){
  const {writeFileSync}=await import("node:fs");writeFileSync("src/features/report/fixtures/demoReport.ts",'import type { Report } from "@/lib/contracts";\n// Generated through client-side evidence verification; no model call is needed by /report/demo.\nexport const demoReport:Report='+JSON.stringify(actual,null,2)+';\n');
 }else expect(actual).toEqual(demoReport);
});
