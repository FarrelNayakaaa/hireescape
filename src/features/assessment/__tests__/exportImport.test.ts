// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { exportSessions, useSessionStore } from "@/features/session";
import type { IntegrityRecord, Report } from "@/lib/contracts";
import { createDemoAssessment, getAssessmentBundle } from "../bundle";
import { exportAll, importAll } from "../lib/exportImport";
import { hydrateManagerStores, useAssessmentStore, useSecretStore } from "../store";
const report:Report={sessionId:"session-1",generatedAt:"2026-11-07T00:00:00.000Z",promptVersion:"test@1",aiAssistance:true,objective:{hiddenPassed:0,hiddenTotal:6,testRuns:0,timeToFixSec:null,roomTimesSec:{1:null,2:null,3:null},changedLines:0,aiLineShare:null,aiEditedShare:null,pasteCount:0,assistantPrompts:0,diffViewsBeforeApply:0,testRunsAfterApply:0},claims:[],droppedClaims:0,competency:{debugging:"insufficient",design:"insufficient",communication:"insufficient",ai_supervision:"insufficient"},summary:"Fictional test report.",disclaimer:"Human review required."};
const integrity:IntegrityRecord={sessionId:"session-1",mode:"browser",consent:"not_required",calibration:{faceOk:null,noiseFloor:null,fullscreen:null},signals:[{id:"i1",type:"window_blur",start:1,end:2,durationMs:1,snapshot:"data:image/test"}],summary:{counts:{window_blur:1},totalsMs:{window_blur:1},reviewSuggested:false,reasons:[],caveats:[]}};
beforeEach(async()=>{localStorage.clear();await hydrateManagerStores();useAssessmentStore.setState({assessments:{},challenges:{}});useSecretStore.setState({secrets:{}});useSessionStore.setState({sessions:{}});vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({token:"signed"})));});
it("round trips assessments, secrets, sessions, reports, and integrity while excluding optional photos",async()=>{
 const id=await createDemoAssessment();const bundle=getAssessmentBundle(id)!;
 useSessionStore.getState().start(bundle.assessment,bundle.challenge);
 localStorage.setItem("he:reports",JSON.stringify({state:{reports:{"session-1":report}},version:0}));localStorage.setItem("he:integrity",JSON.stringify({state:{records:{"session-1":integrity}},version:0}));
 const backup=await exportAll({getSessions:exportSessions});expect(backup.integrity[0].signals[0]).not.toHaveProperty("snapshot");expect(backup.sessions).toHaveLength(1);
 expect((await exportAll({getSessions:exportSessions,includeSnapshots:true})).integrity[0].signals[0].snapshot).toBe("data:image/test");
 localStorage.clear();useAssessmentStore.setState({assessments:{},challenges:{}});useSecretStore.setState({secrets:{}});useSessionStore.setState({sessions:{}});
 await importAll(JSON.stringify(backup));expect(getAssessmentBundle(id)).toEqual(bundle);expect(useSecretStore.getState().secrets[bundle.challenge.id]).toEqual(backup.secrets[0]);expect(exportSessions()).toEqual(backup.sessions);
 const restored=await exportAll({getSessions:exportSessions});expect(restored.reports).toEqual([report]);expect(restored.integrity).toEqual(backup.integrity);
});
it("rejects malformed backups and invalid event payloads before importing other data",async()=>{
 const id=await createDemoAssessment();const backup=await exportAll({getSessions:()=>[]});const before=JSON.stringify(useAssessmentStore.getState().assessments);
 await expect(importAll('{"version":2}')).rejects.toThrow();
 const b=getAssessmentBundle(id)!;const sid=useSessionStore.getState().start(b.assessment,b.challenge);const session=exportSessions()[0];session.events[0].data={aiAssistance:"wrong"};backup.sessions=[session];useSessionStore.setState({sessions:{}});
 await expect(importAll(backup)).rejects.toThrow();expect(useSessionStore.getState().sessions[sid]).toBeUndefined();expect(JSON.stringify(useAssessmentStore.getState().assessments)).toBe(before);
});
it("keeps newer assessments and reports on collisions",async()=>{
 const id=await createDemoAssessment();const backup=await exportAll({getSessions:()=>[]});backup.assessments[0].createdAt="2020-01-01T00:00:00.000Z";backup.assessments[0].token="old";backup.reports=[report];
 localStorage.setItem("he:reports",JSON.stringify({state:{reports:{"session-1":{...report,generatedAt:"2026-11-08T00:00:00.000Z",summary:"Newer report."}}},version:0}));
 await importAll(backup);expect(getAssessmentBundle(id)?.assessment.token).toBe("signed");expect((await exportAll({getSessions:()=>[]})).reports[0].summary).toBe("Newer report.");
});
it("preserves newer challenge data and its paired secret, including unreferenced catalogue entries",async()=>{
 const id=await createDemoAssessment();const backup=await exportAll({getSessions:()=>[]});
 const challenge=backup.challenges[0];const secret=backup.secrets[0];
 useAssessmentStore.setState({challenges:{[challenge.id]:{...challenge,title:"Newer seed",validation:{...challenge.validation,validatedAt:"2026-12-01T00:00:00.000Z"}}}});
 useSecretStore.setState({secrets:{[challenge.id]:{...secret,referenceFix:"newer paired fix"}}});
 backup.challenges.push({...challenge,id:"orphan-seed"});backup.secrets.push({...secret,challengeId:"orphan-seed"});
 await importAll(backup);
 expect(getAssessmentBundle(id)?.challenge.title).toBe("Newer seed");expect(useSecretStore.getState().secrets[challenge.id].referenceFix).toBe("newer paired fix");expect(useAssessmentStore.getState().challenges["orphan-seed"]).toBeDefined();
});

it("shows a recoverable malformed-file error in the manager UI without replacing saved data",async()=>{
 const { cleanup, fireEvent, render, screen }=await import("@testing-library/react");
 const { createElement }=await import("react");
 const { ExportImportMenu }=await import("../components/ExportImportMenu");
 const id=await createDemoAssessment();const before=getAssessmentBundle(id);
 try {
  render(createElement(ExportImportMenu));
  const file=new File(['{"version":1,"assessments":"broken"}'],"malformed.json",{type:"application/json"});
  Object.defineProperty(file,"text",{value:async()=>'{"version":1,"assessments":"broken"}'});
  fireEvent.change(screen.getByLabelText("Import JSON"),{target:{files:[file]}});
  expect(await screen.findByRole("alert")).toHaveTextContent("Backup is invalid or storage is unavailable");
  expect(screen.getByRole("button",{name:"Export all"})).toBeEnabled();
  expect(getAssessmentBundle(id)).toEqual(before);
 } finally { cleanup(); }
});
