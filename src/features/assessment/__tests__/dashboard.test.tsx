// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useSessionStore } from "@/features/session";
import { AssessmentList } from "../components/AssessmentList";
import { CandidateLink } from "../components/CandidateLink";
import { createDemoAssessment, getAssessmentBundle } from "../bundle";
import { hydrateManagerStores, useAssessmentStore, useSecretStore } from "../store";
const {push}=vi.hoisted(()=>({push:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({push})}));
beforeEach(async()=>{localStorage.clear();await hydrateManagerStores();useAssessmentStore.setState({assessments:{},challenges:{}});useSecretStore.setState({secrets:{}});useSessionStore.setState({sessions:{}});push.mockReset();vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({token:"signed"})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("offers an empty-state action and sends a quick demo to the real candidate URL",async()=>{
 render(<AssessmentList/>);expect(await screen.findByRole("link",{name:"Create your first assessment"})).toHaveAttribute("href","/manager/new");
 fireEvent.click(screen.getByRole("button",{name:"Quick demo assessment"}));
 await waitFor(()=>expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/play\//)));
 expect(Object.keys(useAssessmentStore.getState().assessments)).toHaveLength(1);
});
it("reads real session status and exposes reports only when a session exists",async()=>{
 const id=await createDemoAssessment();const bundle=getAssessmentBundle(id)!;const view=render(<AssessmentList/>);
 expect(await screen.findByText("Not started")).toBeInTheDocument();expect(screen.queryByRole("link",{name:"Report"})).not.toBeInTheDocument();
 view.unmount();const sid=useSessionStore.getState().start(bundle.assessment,bundle.challenge);render(<AssessmentList/>);
 expect(screen.getByText("In progress")).toBeInTheDocument();expect(screen.getByRole("link",{name:"Report"})).toHaveAttribute("href",`/report/${sid}`);
});
it("copies an absolute candidate URL and gives a useful fallback when clipboard access fails",async()=>{
 const writeText=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText}});
 render(<CandidateLink id="assessment-1"/>);fireEvent.click(screen.getByRole("button",{name:"Copy candidate link"}));await screen.findByText("Link copied");
 expect(writeText).toHaveBeenCalledWith(new URL("/play/assessment-1",window.location.origin).href);
 writeText.mockRejectedValueOnce(new Error("denied"));fireEvent.click(screen.getByRole("button",{name:"Copy candidate link"}));expect(await screen.findByText(/Copy unavailable/)).toBeInTheDocument();expect(screen.getByRole("link",{name:"Open as candidate"})).toHaveAttribute("href","/play/assessment-1");
});
