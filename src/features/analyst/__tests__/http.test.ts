import { expect, test } from "vitest";
import { AnalystOutput } from "../schema";
import { buildAnalysisRequest } from "../lib/buildRequest";
import { verifyClaims } from "../lib/verifyClaims";
import { challenge, fixtureSession, secret } from "./fixtures";
const baseURL=process.env.HIRESCAPE_DEV_URL;
test.skipIf(!baseURL)("returns mock Analyst output over HTTP and drops exactly one unverifiable claim",async()=>{
 const session=fixtureSession();const input=buildAnalysisRequest(session,challenge,secret);
 const response=await fetch(new URL("/api/analyst",baseURL),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
 expect(response.status).toBe(200);const body=await response.json() as {output:unknown;meta:{mock:boolean}};expect(body.meta.mock).toBe(true);const output=AnalystOutput.parse(body.output);expect(verifyClaims(output.claims,session,input.objective).droppedClaims).toBe(1);
 const rejected=await fetch(new URL("/api/analyst",baseURL),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,integrity:{camera:"must-not-reach-model"}})});expect(rejected.status).toBe(400);
},20000);
