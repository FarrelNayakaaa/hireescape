// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import fixture from "@/lib/codex/fixtures/saboteur.json";
import { useAgentConsole } from "@/lib/codex/agentConsole";
import { useGenerateChallenge } from "../hooks/useGenerateChallenge";
import { AssessmentList } from "@/features/assessment/manager/index";
import { SaboteurPanel } from "../components/SaboteurPanel";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock("@/components/ui/environment",()=>({useUiMotion:()=>({duration:0,decorative:false})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("automatically records real postAgent telemetry and renders a complete MOCK checklist",async()=>{
 useAgentConsole.getState().clear();vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({output:fixture,meta:{role:"saboteur",model:"mock",promptVersion:"saboteur@2",latencyMs:750,attempts:1,mock:true}})));
 const {result}=renderHook(()=>useGenerateChallenge());await act(async()=>{await result.current.start({level:"mid",defectType:"cache_no_fallback"});});
 render(<><SaboteurPanel state={result.current}/><AssessmentList/></>);expect(screen.getByText("Attempt 1/3")).toBeInTheDocument();expect(screen.getByText("MOCK")).toBeInTheDocument();expect(screen.getAllByText(/— Passed/)).toHaveLength(10);expect(useAgentConsole.getState().entries).toHaveLength(1);expect(fetch).toHaveBeenCalledOnce();
});
