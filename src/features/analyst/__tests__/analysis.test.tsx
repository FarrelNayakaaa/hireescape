// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "@/lib/codex/fixtures/analyst.json";
import { useAssessmentStore } from "@/features/assessment";
import { useAnalysis } from "../hooks/useAnalysis";
import { hydrateReports, useReportStore } from "../store";
import { REPORT_DISCLAIMER } from "../constants";
import { challenge, fixtureSession, secret } from "./fixtures";
const meta={role:"analyst",model:"mock",promptVersion:"analyst@2",latencyMs:800,attempts:1,mock:true};
beforeEach(async()=>{localStorage.clear();await hydrateReports();useReportStore.setState({reports:{},cache:{}});vi.stubGlobal("fetch",vi.fn().mockImplementation(async()=>Response.json({output:fixture,meta})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("assembles only verified claims into a persisted report, with exactly one dropped fixture claim",async()=>{
 const session=fixtureSession();const {result}=renderHook(()=>useAnalysis(session,{challenge,secret}));expect(result.current.status).toBe("idle");
 await act(async()=>{await result.current.generate();});expect(result.current.status).toBe("ready");expect(result.current.report).toMatchObject({sessionId:session.id,droppedClaims:1,disclaimer:REPORT_DISCLAIMER,objective:{hiddenPassed:6,hiddenTotal:6}});
 expect(result.current.report?.claims).toHaveLength(8);expect(JSON.stringify(result.current.report)).not.toContain("CIRCUIT_BREAKER_EVIDENCE");
 const saved=localStorage.getItem("he:reports")!;expect(saved).not.toContain("CIRCUIT_BREAKER_EVIDENCE");expect(saved).not.toContain('"referenceFix"');expect(useReportStore.getState().reports[session.id].droppedClaims).toBe(1);
 const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);expect(body.finalCode).toBe(session.finalCode);expect(body).not.toHaveProperty("integrity");
});
it("uses the cache and bypasses it only for regeneration",async()=>{
 const session=fixtureSession();const {result}=renderHook(()=>useAnalysis(session,{challenge,secret}));await act(async()=>{await result.current.generate();await result.current.generate();});expect(fetch).toHaveBeenCalledTimes(1);
 await act(async()=>{await result.current.regenerate();});expect(fetch).toHaveBeenCalledTimes(2);
 const second=renderHook(()=>useAnalysis(session));await waitFor(()=>expect(second.result.current.status).toBe("ready"));expect(second.result.current.report?.droppedClaims).toBe(1);
});
it("coalesces duplicate generate calls",async()=>{
 const session=fixtureSession();const {result}=renderHook(()=>useAnalysis(session,{challenge,secret}));let first!:ReturnType<typeof result.current.generate>;let second!:typeof first;
 await act(async()=>{first=result.current.generate();second=result.current.generate();await first;});expect(first).toBe(second);expect(fetch).toHaveBeenCalledOnce();
});
it("re-verifies cached evidence when the session changes and never reuses a different prompt version",async()=>{
 const session=fixtureSession();const {result,rerender}=renderHook(({s})=>useAnalysis(s,{challenge,secret}),{initialProps:{s:session}});await act(async()=>{await result.current.generate();});
 const changed={...session,events:session.events.filter(e=>e.id!=="e3")};rerender({s:changed});expect(result.current.report?.droppedClaims).toBe(2);
 act(()=>useReportStore.setState({cache:{},reports:{[session.id]:{...useReportStore.getState().reports[session.id],promptVersion:"analyst@old"}}}));
 const next=renderHook(()=>useAnalysis(session));expect(next.result.current.status).toBe("idle");
});
it("returns a sanitized error and never persists unparsed output",async()=>{
 vi.mocked(fetch).mockResolvedValueOnce(Response.json({output:{summary:"private raw output"},meta}));const session=fixtureSession();const {result}=renderHook(()=>useAnalysis(session,{challenge,secret}));
 await act(async()=>{await expect(result.current.generate()).rejects.toThrow("Analysis unavailable");});expect(result.current).toMatchObject({status:"error",report:null});expect(result.current.error).not.toContain("private");expect(useReportStore.getState().reports).toEqual({});
});
it("supports useAnalysis(session) through the public assessment API and matching manager secret",async()=>{
 const session=fixtureSession();await useAssessmentStore.persist.rehydrate();useAssessmentStore.setState({challenges:{[challenge.id]:challenge},assessments:{[session.assessmentId]:{id:session.assessmentId,challengeId:challenge.id,candidateAlias:"Candidate A — Rani (fictional)",level:"mid",aiAssistance:true,durationMin:45,proctoring:{mode:"browser",required:false,captureSnapshots:false},locale:"en",createdAt:session.startedAt,token:"signed"}}});
 localStorage.setItem("he:secrets",JSON.stringify({state:{secrets:{[challenge.id]:secret}},version:0}));const {result}=renderHook(()=>useAnalysis(session));await act(async()=>{await result.current.generate();});expect(result.current.report?.droppedClaims).toBe(1);
});

it("reads a restored report when reopening analysis after a manager import",async()=>{
 const session=fixtureSession();
 const first=renderHook(()=>useAnalysis(session,{challenge,secret}));
 await act(async()=>{await first.result.current.generate();});
 const report=first.result.current.report!;
 first.unmount();
 // Imports replace persisted reports while this already-hydrated store remains in memory.
 const restored={...report,generatedAt:"2026-11-08T00:00:00.000Z"};
 localStorage.setItem("he:reports",JSON.stringify({state:{reports:{[session.id]:restored}},version:0}));
 const reopened=renderHook(()=>useAnalysis(session));
 await waitFor(()=>expect(reopened.result.current.report?.generatedAt).toBe(restored.generatedAt));
 expect(fetch).toHaveBeenCalledOnce();
});

it("never repeats a model's invented runtime summary for a session with zero tests",async()=>{
 const session=fixtureSession();session.events=session.events.filter(event=>event.type!=="test_run");
 const {result}=renderHook(()=>useAnalysis(session,{challenge,secret}));
 await act(async()=>{await result.current.generate();});
 expect(result.current.report?.summary).toContain("The session recorded 0 test runs.");
 expect(result.current.report?.summary).toContain("No hidden-test result was recorded.");
 expect(result.current.report?.summary).not.toContain(fixture.summary);
});
