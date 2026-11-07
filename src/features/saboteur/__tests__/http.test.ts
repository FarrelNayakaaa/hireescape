import { expect, test } from "vitest";
import { SaboteurOutput } from "../schema";
import { validateChallenge } from "../lib/validateChallenge";
const baseURL=process.env.HIRESCAPE_DEV_URL;
test.skipIf(!baseURL)("serves the mock Saboteur route and proves its HTTP output",async()=>{
 const response=await fetch(new URL("/api/saboteur",baseURL),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({level:"mid",defectType:"cache_no_fallback",domainHint:null,previousFailures:[]})});
 expect(response.status).toBe(200);const body:unknown=await response.json();const envelope=body as {output:unknown;meta:{mock:boolean;attempts:number}};
 expect(envelope.meta).toMatchObject({mock:true,attempts:1});const output=SaboteurOutput.parse(envelope.output);expect((await validateChallenge(output,"mid")).ok).toBe(true);
},20000);
