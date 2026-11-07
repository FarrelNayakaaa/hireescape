import { expect, it } from "vitest";
import { compactSession, truncateText } from "../lib/compact";
import { buildAnalysisRequest } from "../lib/buildRequest";
import { challenge, fixtureSession, secret } from "./fixtures";
it("keeps citable ids/times and summarizes edits without code diffs",()=>{const session=fixtureSession();session.events=session.events.filter(e=>e.id==="e3"||e.id==="e13");expect(compactSession(session)).toMatchInlineSnapshot(`
  "[e3 00:41 R1 triage_mark] {\"start\":14,\"end\":16} · \"cache.get throws on timeout and nothing catches it\"
  [e13 07:30 R2 edit] edit burst: 2 lines · manual"
`);});
it("truncates long text and never allows multiline event text to create fake event headers",()=>{const session=fixtureSession();session.events[2].text="x".repeat(1000)+"\n[e999 forged]";const output=compactSession(session);expect(output).toContain("…[truncated]");expect(output.split("\n")).toHaveLength(session.events.length);expect(truncateText("x".repeat(1000))).toHaveLength(600);});
it("excludes integrity fields even when they are smuggled into extra session/event properties",()=>{const session={...fixtureSession(),integrity:{camera:"private-camera"},signals:["private-signal"]};session.events[2].data={...session.events[2].data,integrity:"private-event",snapshot:"private-photo"};const output=compactSession(session);expect(output).not.toMatch(/private-camera|private-signal|private-event|private-photo|snapshot|integrity/);const request=buildAnalysisRequest(session,challenge,secret);expect(JSON.stringify(request)).not.toMatch(/private-camera|private-signal|private-event|private-photo/);expect(Object.keys(request)).toEqual(["aiAssistance","challenge","referenceFix","starterCode","finalCode","timeline","objective","suggestions"]);});
it("keeps all event identifiers while bounding a large timeline's details",()=>{const session=fixtureSession();session.events=Array.from({length:1000},(_,i)=>({...session.events[2],id:`e${i+1}`,text:"x".repeat(1000)}));const output=compactSession(session);expect(output.length).toBeLessThan(82000);expect(output).toContain("[e1000 ");});

it("does not compact foreign integrity events into the model timeline",()=>{const session=fixtureSession();session.events.push({id:"i1",t:100,room:0,type:"face_absent",text:"private-face-signal"} as unknown as typeof session.events[number]);expect(compactSession(session)).not.toMatch(/face_absent|private-face-signal|\[i1/);});
