// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DemoReport } from "../components/DemoReport";
import { AssessmentList } from "@/features/assessment";
import { useAgentConsole } from "@/lib/codex/agentConsole";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock("../components/ReplayEditor",()=>({ReplayEditor:({code}:{code:string})=><pre data-testid="demo-code">{code}</pre>}));
vi.mock("@/components/ui/environment",async(original)=>({...await original<typeof import("@/components/ui/environment")>(),useUiMotion:()=>({duration:.15,decorative:false})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("renders the whole demo without any fetch call or stored assessment/session",async()=>{localStorage.clear();vi.stubGlobal("fetch",vi.fn(()=>{throw new Error("Network forbidden");}));const print=vi.spyOn(window,"print").mockImplementation(()=>{});render(<DemoReport/>);expect(screen.getByText("8 claims shown · 1 unverifiable claim removed")).toBeInTheDocument();expect(screen.getByText(/Applied an unreviewed suggestion/)).toBeInTheDocument();expect(screen.getByText(/Tab hidden: 12 seconds/)).toBeInTheDocument();expect(screen.queryByRole("button",{name:/Generate analysis/})).not.toBeInTheDocument();await screen.findByTestId("demo-code");expect(fetch).not.toHaveBeenCalled();screen.getByRole("button",{name:"Download PDF"}).click();expect(print).toHaveBeenCalledOnce();print.mockRestore();});
it("lists all agent roles, models, attempts, prompt versions, and LIVE/MOCK flags",()=>{useAgentConsole.getState().clear();const view=render(<AssessmentList/>);expect(screen.getByText("No agent calls yet.")).toBeInTheDocument();act(()=>{useAgentConsole.getState().push({role:"analyst",model:"fixture-model",promptVersion:"analyst@2",latencyMs:1000,attempts:1,mock:true});useAgentConsole.getState().push({role:"assistant",model:"live-model",promptVersion:"assistant@1",latencyMs:500,attempts:2,mock:false});});expect(screen.getByText("MOCK")).toBeInTheDocument();expect(screen.getByText("LIVE")).toBeInTheDocument();expect(screen.getByText("live-model")).toBeInTheDocument();expect(screen.getByText("assistant@1")).toBeInTheDocument();view.unmount();});
it("keeps PDF actions below the report header, outside the global theme-control row",()=>{
 render(<DemoReport/>);
 const toolbar=screen.getByRole("toolbar",{name:"Report actions"});
 expect(toolbar).toContainElement(screen.getByRole("button",{name:"Download PDF"}));
 expect(toolbar.closest("header")).toBeNull();
 const header=screen.getByRole("heading",{level:1}).closest("header")!;
 expect(header.compareDocumentPosition(toolbar)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
