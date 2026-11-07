import "server-only";
import { callStructured } from "@/lib/codex/client";
import { ANALYST_SYSTEM, ANALYST_VERSION, buildAnalystInput } from "@/lib/codex/prompts/analyst";
import mockFixture from "@/lib/codex/fixtures/analyst.json";
import { AnalystOutput, type AnalystInput } from "../schema";
export async function analyse(input:AnalystInput){
  const {data:output,meta}=await callStructured({role:"analyst",promptVersion:ANALYST_VERSION,system:ANALYST_SYSTEM,input:buildAnalystInput({aiAssistance:input.aiAssistance,...input.challenge,starterCode:input.starterCode,finalCode:input.finalCode,referenceFix:input.referenceFix,timeline:input.timeline,objective:input.objective,suggestions:input.suggestions}),schema:AnalystOutput,schemaName:"AnalystOutput",timeoutMs:50000,retries:0,mockFixture});
  return {output,meta};
}
