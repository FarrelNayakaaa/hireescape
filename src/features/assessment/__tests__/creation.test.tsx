// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "@/lib/codex/fixtures/saboteur.json";
import { SetupForm } from "../components/SetupForm";
import { useCreateAssessment } from "../hooks/useCreateAssessment";
import { hydrateManagerStores, useAssessmentStore, useSecretStore } from "../store";
vi.mock("@/components/ui/environment",()=>({useUiMotion:()=>({duration:0,decorative:false})}));
beforeEach(async()=>{localStorage.clear();await hydrateManagerStores();useAssessmentStore.setState({assessments:{},challenges:{}});useSecretStore.setState({secrets:{}});vi.stubGlobal("fetch",vi.fn().mockImplementation(async (url: string) => {
    if (url === "/api/assessment/token") return Response.json({token:"signed-token"});
    if (url === "/api/saboteur") return Response.json({output:fixture,meta:{role:"saboteur",model:"mock",promptVersion:"saboteur@2",latencyMs:750,attempts:1,mock:true}});
    throw new Error(`Unexpected request: ${url}`);
  }));});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
const defaults={candidateAlias:"Candidate A — Rani (fictional)",level:"mid" as const,defectType:"surprise" as const,aiAssistance:true,durationMin:45,proctoring:{mode:"browser" as const,required:false,captureSnapshots:false},locale:"en" as const};
describe("manager creation",()=>{
 it("coalesces duplicate submissions and saves exactly one complete assessment",async()=>{
  const {result}=renderHook(()=>useCreateAssessment());let a!:Promise<string>;let b!:Promise<string>;
  await act(async()=>{a=result.current.create(defaults);b=result.current.create(defaults);await a;});
  expect(a).toBe(b);expect(await a).toBe(await b);expect(fetch).toHaveBeenCalledTimes(2);
  expect(vi.mocked(fetch).mock.calls.map(([url])=>url)).toEqual(["/api/assessment/token","/api/saboteur"]);
  expect(Object.keys(useAssessmentStore.getState().assessments)).toHaveLength(1);expect(Object.keys(useAssessmentStore.getState().challenges)).toHaveLength(1);expect(Object.keys(useSecretStore.getState().secrets)).toHaveLength(1);
  expect(result.current.status).toBe("success");expect(result.current.generator.usedFallback).toBe(false);expect(result.current.generator.fallbackReason).toBeNull();
  expect(result.current.generator.attempt).toBe(1);expect(result.current.generator.checks.every(check=>check.status==="pass")).toBe(true);
  const assessment=Object.values(useAssessmentStore.getState().assessments)[0];
  expect(useAssessmentStore.getState().challenges[assessment.challengeId].source).toBe("generated");
  expect(useSecretStore.getState().secrets[assessment.challengeId].referenceFix).toBe(fixture.referenceFix);
 });
 it("renders every setup control and submits the configured defaults",async()=>{
  render(<SetupForm/>);
  expect(screen.getByLabelText("Candidate alias")).toHaveValue(defaults.candidateAlias);
  expect(screen.getByRole("radio",{name:"mid"})).toBeChecked();expect(screen.getByRole("radio",{name:"Surprise me"})).toBeChecked();
  expect(screen.getAllByRole("radio")).toHaveLength(12);
  expect(screen.getByRole("switch",{name:"AI Assistance ON"})).toBeChecked();
  expect(screen.getByLabelText("Proctoring mode")).toHaveValue("browser");expect(screen.getByLabelText("Language")).toHaveValue("en");expect(screen.getByLabelText("Duration")).toHaveValue("45");
  expect(screen.getByRole("switch",{name:"Capture snapshots"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"Create assessment"}));
  await screen.findByRole("heading",{name:"Challenge sealed ✓"});
  expect(screen.getByRole("link",{name:"Open as candidate"})).toHaveAttribute("href",expect.stringMatching(/^\/play\//));
  const {defectType,...settings}=defaults;void defectType;expect(Object.values(useAssessmentStore.getState().assessments)[0]).toMatchObject(settings);
 });
 it("makes token failures retryable without saving partial records",async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({error:{code:"unavailable",message:"Please retry."}},{status:503}));
  const {result}=renderHook(()=>useCreateAssessment());
  await act(async()=>{await expect(result.current.create(defaults)).rejects.toThrow("Please retry.");});
  expect(result.current.status).toBe("error");expect(useAssessmentStore.getState().assessments).toEqual({});expect(useSecretStore.getState().secrets).toEqual({});
 });
 it("honestly stores the fallback difficulty and responds to control changes",async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({token:"signed-token"}))
    .mockResolvedValueOnce(Response.json({error:{code:"upstream",message:"The model service is unavailable."}},{status:502}));
  render(<SetupForm/>);fireEvent.click(screen.getByRole("radio",{name:"senior"}));fireEvent.click(screen.getByRole("switch",{name:"AI Assistance ON"}));expect(screen.getByText("Measures unaided work.")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Proctoring mode"),{target:{value:"camera_mic"}});expect(screen.getByRole("switch",{name:"Capture snapshots"})).toBeEnabled();
  fireEvent.click(screen.getByRole("button",{name:"Create assessment"}));await screen.findByText(/Requested senior/);
  expect(screen.getAllByText(/Using a pre-validated challenge/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/The model service is unavailable/).length).toBeGreaterThan(0);
  await waitFor(()=>expect(Object.values(useAssessmentStore.getState().assessments)[0].level).toBe("mid"));
 });
});
