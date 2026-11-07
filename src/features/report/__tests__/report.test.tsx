// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "@/lib/codex/fixtures/analyst.json";
import { useSessionStore } from "@/features/session";
import { AssessmentList, useAssessmentStore } from "@/features/assessment";
import { useReportStore } from "@/features/analyst";
import { useDecisionStore } from "../decisionStore";
import { ReportPage } from "../components/ReportPage";
import { ClaimList } from "../components/ClaimList";
import { DecisionPanel } from "../components/DecisionPanel";
import { evidenceTargetId } from "../lib/events";
import { challenge, fixtureSession, secret } from "./fixtures";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock("@/components/ui/environment",async(original)=>({...await original<typeof import("@/components/ui/environment")>(),useUiMotion:()=>({duration:.15,decorative:false})}));
beforeEach(async()=>{
 localStorage.clear();await useSessionStore.persist.rehydrate();await useAssessmentStore.persist.rehydrate();await useReportStore.persist.rehydrate();await useDecisionStore.persist.rehydrate();
 useSessionStore.setState({sessions:{}});useAssessmentStore.setState({assessments:{},challenges:{}});useReportStore.setState({reports:{},cache:{}});useDecisionStore.setState({decisions:{}});
 vi.stubGlobal("fetch",vi.fn().mockImplementation(async()=>Response.json({output:fixture,meta:{role:"analyst",model:"mock",promptVersion:"analyst@2",latencyMs:800,attempts:1,mock:true}})));
 Object.defineProperty(Element.prototype,"scrollIntoView",{configurable:true,value:vi.fn()});
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function seed(ai=true){const session=fixtureSession();session.aiAssistance=ai;await useAssessmentStore.getState().addAssessment({id:session.assessmentId,challengeId:challenge.id,candidateAlias:"Candidate A — Rani (fictional)",level:"mid",aiAssistance:ai,durationMin:45,proctoring:{mode:"browser",required:false,captureSnapshots:false},locale:"en",createdAt:session.startedAt,token:"signed"},challenge,secret);useSessionStore.setState({sessions:{[session.id]:session}});return session;}
it("renders objective metrics and a citable timeline before analysis exists",async()=>{
 const session=await seed();render(<ReportPage sessionId={session.id}/>);
 expect(await screen.findByRole("heading",{name:"Objective"})).toBeInTheDocument();expect(screen.getByRole("list",{name:"Session timeline"})).toBeInTheDocument();expect(screen.getByText("6/6 ✓ all passing")).toBeInTheDocument();expect(screen.getByText("07:41")).toBeInTheDocument();
 expect(screen.getByRole("button",{name:"Generate analysis"})).toBeEnabled();expect(screen.getByText("0 claims shown · 0 unverifiable claims removed")).toBeInTheDocument();expect(screen.queryByText(/Total.*100|Evidence score/)).not.toBeInTheDocument();expect(fetch).not.toHaveBeenCalled();
});
it("generates the mock report, drops one claim, and focuses event and code evidence",async()=>{
 const session=await seed();render(<ReportPage sessionId={session.id}/>);fireEvent.click(await screen.findByRole("button",{name:"Generate analysis"}));
 expect(await screen.findByText("8 claims shown · 1 unverifiable claim removed")).toBeInTheDocument();expect(screen.queryByText(/CIRCUIT_BREAKER_EVIDENCE/)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"e3 · triage_mark"}));expect(document.activeElement).toHaveAttribute("id",evidenceTargetId("event","e3"));expect(document.activeElement).toHaveAttribute("data-highlighted","true");expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
 const chip=screen.getByRole("button",{name:/^L\d+$/});fireEvent.click(chip);const line=Number(chip.textContent?.slice(1));expect(document.activeElement).toHaveAttribute("id",evidenceTargetId("code_line",line));expect(screen.getByText("Final code · evidence locations").closest("details")).toHaveAttribute("open");
 expect(screen.getByRole("button",{name:"Regenerate analysis"})).toBeInTheDocument();
});
it("keeps objective and timeline visible if analysis is unavailable",async()=>{
 const session=await seed();vi.mocked(fetch).mockResolvedValueOnce(Response.json({error:{code:"upstream",message:"Private failure"}},{status:502}));render(<ReportPage sessionId={session.id}/>);fireEvent.click(await screen.findByRole("button",{name:"Generate analysis"}));expect(await screen.findByRole("alert")).toHaveTextContent("Analysis unavailable — retry");expect(screen.getByRole("heading",{name:"Objective"})).toBeInTheDocument();expect(screen.getByRole("list",{name:"Session timeline"})).toBeInTheDocument();expect(screen.queryByText("Private failure")).not.toBeInTheDocument();
});
it("labels AI-off evidence without zero percentages and greys the unassessed AI tile",async()=>{
 const session=await seed(false);render(<ReportPage sessionId={session.id}/>);await screen.findByRole("heading",{name:"Competency map"});expect(screen.getAllByText("AI assistance was off").length).toBeGreaterThan(0);expect(screen.getByText("Not assessed").closest(".he-card")).toHaveClass("text-he-muted");expect(screen.queryByText("0%")).not.toBeInTheDocument();
});
it("shows a friendly state for unknown sessions",async()=>{render(<ReportPage sessionId="unknown"/>);expect(await screen.findByRole("heading",{name:"Session not found"})).toBeInTheDocument();expect(screen.getByRole("link",{name:"Back to manager"})).toHaveAttribute("href","/manager");});
it("always displays the removed count and labels predicted claims",()=>{render(<ClaimList claims={[{id:"c1",dimension:"design",signal:"observation",statement:"Possible runtime behaviour",evidence:[{kind:"event",eventId:"e3",quote:"cache"}],basis:"ai_predicted"}]} droppedClaims={1} events={fixtureSession().events} onEvidence={vi.fn()}/>);expect(screen.getByText("1 claims shown · 1 unverifiable claim removed")).toBeInTheDocument();expect(screen.getByText("AI-predicted, not executed")).toBeInTheDocument();});
it("requires a decision and at least twenty non-whitespace note characters, then persists locally",async()=>{
 const view=render(<DecisionPanel sessionId="fictional-session"/>);const save=await screen.findByRole("button",{name:"Save decision"});expect(save).toBeDisabled();fireEvent.click(screen.getByRole("radio",{name:"Hold"}));const note=screen.getByRole("textbox");fireEvent.change(note,{target:{value:"Too short"}});expect(save).toBeDisabled();fireEvent.change(note,{target:{value:" ".repeat(25)}});expect(save).toBeDisabled();fireEvent.change(note,{target:{value:"Review the recorded cache failure explanation."}});expect(save).toBeEnabled();fireEvent.click(save);expect(await screen.findByText("Decision saved locally.")).toBeInTheDocument();expect(localStorage.getItem("he:decisions")).toContain("Review the recorded cache failure explanation.");view.unmount();render(<DecisionPanel sessionId="fictional-session"/>);expect(await screen.findByRole("radio",{name:"Hold"})).toBeChecked();expect(screen.getByRole("textbox")).toHaveValue("Review the recorded cache failure explanation.");
});
it("waits for asynchronous hydration before showing not found",async()=>{
 const persistence=useSessionStore.persist,original=persistence.getOptions().storage;let finish!:(value:{state:{sessions:Record<string,never>};version:number})=>void;const loaded=new Promise<{state:{sessions:Record<string,never>};version:number}>(resolve=>{finish=resolve;});persistence.setOptions({storage:{getItem:()=>loaded,setItem:()=>{},removeItem:()=>{}}});
 try{const loading=persistence.rehydrate();render(<ReportPage sessionId="unknown"/>);expect(screen.getByRole("heading",{name:"Loading session evidence"})).toBeInTheDocument();await act(async()=>{finish({state:{sessions:{}},version:0});await loading;});await waitFor(()=>expect(screen.getByRole("heading",{name:"Session not found"})).toBeInTheDocument());}finally{persistence.setOptions({storage:original});}
});
it("treats truly empty session storage as not found rather than a crash",async()=>{
 localStorage.removeItem("he:sessions");await useSessionStore.persist.rehydrate();render(<ReportPage sessionId="empty-browser"/>);expect(await screen.findByRole("heading",{name:"Session not found"})).toBeInTheDocument();
});
it("shows a friendly hydration error for corrupt storage",async()=>{
 localStorage.setItem("he:sessions","{broken");await useSessionStore.persist.rehydrate();render(<ReportPage sessionId="corrupt-browser"/>);expect(await screen.findByRole("heading",{name:"Session could not be loaded"})).toBeInTheDocument();
});

it("opens a report after importing a backup through the manager UI",async()=>{
 const session=fixtureSession();
 const backup={version:1,assessments:[{id:session.assessmentId,challengeId:challenge.id,candidateAlias:"Candidate A — Rani (fictional)",level:"mid",aiAssistance:true,durationMin:45,proctoring:{mode:"browser",required:false,captureSnapshots:false},locale:"en",createdAt:session.startedAt,token:"signed"}],challenges:[challenge],secrets:[secret],sessions:[session],reports:[],integrity:[]};
 const json=process.env.HIRESCAPE_REVIEW_BACKUP?await (await import("node:fs/promises")).readFile(process.env.HIRESCAPE_REVIEW_BACKUP,"utf8"):JSON.stringify(backup);
 const view=render(<AssessmentList/>);const input=await screen.findByLabelText("Import JSON");
 const file=new File([json],"report-backup.json",{type:"application/json"});Object.defineProperty(file,"text",{value:async()=>json});fireEvent.change(input,{target:{files:[file]}});
 expect(await screen.findByText("Backup imported. Newer existing records were preserved.")).toBeInTheDocument();expect(useSessionStore.getState().sessions[session.id]).toBeDefined();
 view.unmount();render(<ReportPage sessionId={session.id}/>);expect(await screen.findByRole("heading",{name:"Objective"})).toBeInTheDocument();
});
