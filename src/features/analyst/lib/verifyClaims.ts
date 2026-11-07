import type { Claim, Evidence, ObjectiveMetrics, Session } from "@/lib/contracts";
import type { AnalysisOutput } from "../schema";
import { AnalystOutput } from "../schema";
import { isSessionEventType, safeEventData } from "./eventData";
import { prohibitedLanguage } from "./sanitize";
const normalize=(text:string)=>text.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g," ").trim();
const injection=/(?:AI\s+reviewer\s*:|SYSTEM\s*:|ignore\b.{0,50}\binstructions|rate\b.{0,50}\bcandidate\b|mark\b.{0,40}\bstrong\b)/i;
function contradicts(statement:string,objective:ObjectiveMetrics):boolean {
  const saysAll=/(?:all|every)\s+(?:hidden\s+)?tests?\s+(?:(?:now|are)\s+)?(?:pass(?:ed|ing)?|green)|(?:pass(?:ed|es)?|passing)\s+all\s+(?:hidden\s+)?tests?|all[- ]green/i;
  const negative=/\b(?:not|never|no)\s+(?:all|every)\b|\b(?:do|did|does)\s+not\s+pass/i.test(statement);
  if(!negative&&saysAll.test(statement)&&(objective.hiddenTotal===0||objective.hiddenPassed<objective.hiddenTotal))return true;
  const ratio=statement.match(/\b(\d+)\s*(?:\/|out of)\s*(\d+)\s+(?:hidden\s+)?tests?/i);
  if(ratio&&(Number(ratio[1])!==objective.hiddenPassed||Number(ratio[2])!==objective.hiddenTotal))return true;
  const passed=statement.match(/\bpassed\s+(\d+)\s+hidden tests?\b/i)??statement.match(/\b(\d+)\s+hidden tests?\s+pass(?:ed)?\b/i);
  if(passed&&Number(passed[1])!==objective.hiddenPassed)return true;
  const runs=statement.match(/\b(\d+)\s+test runs?\b/i);
  if(runs&&Number(runs[1])!==objective.testRuns)return true;
  return false;
}
export function verifyClaims(raw:AnalysisOutput["claims"],session:Session,objective:ObjectiveMetrics):{claims:Claim[];droppedClaims:number} {
  const parsed=AnalystOutput.shape.claims.safeParse(raw);
  if(!parsed.success)return {claims:[],droppedClaims:raw.length};
  const lines=session.finalCode.split("\n");const claims:Claim[]=[];
  for(const [index,claim] of parsed.data.entries()){
    if(prohibitedLanguage.test(claim.statement)||(claim.dimension==="ai_supervision"&&!session.aiAssistance)||(claim.basis==="executed"&&contradicts(claim.statement,objective)))continue;
    let valid=true;let quotedInstruction=false;
    const evidence:Evidence[]=[];
    for(const item of claim.evidence){
      const quote=normalize(item.quote);
      if(!quote){valid=false;break;}
      quotedInstruction ||= injection.test(quote);
      if(item.kind==="code_line"){
        if(item.line===null||item.line<1||item.line>lines.length||![item.line-2,item.line-1,item.line].some(i=>i>=0&&i<lines.length&&normalize(lines[i]).includes(quote))){valid=false;break;}
        evidence.push({kind:"code_line",line:item.line,quote:item.quote});
      }else{
        const event=session.events.find(e=>isSessionEventType(e.type)&&e.id===item.eventId);
        if(!event){valid=false;break;}
        const data=safeEventData(event);
        if(!normalize(event.text??"").includes(quote)&&!(data!==null&&normalize(JSON.stringify(data)).includes(quote))){valid=false;break;}
        evidence.push({kind:"event",eventId:event.id,quote:item.quote});
      }
    }
    if(!valid||(claim.signal==="strength"&&(quotedInstruction||injection.test(claim.statement))))continue;
    const runtime=/\b(?:return(?:s|ed)?|throw(?:s|n)?|log(?:s|ged)?|propagate(?:s|d)?|handle(?:s|d)?|prevent(?:s|ed)?|succeed(?:s|ed)?|fail(?:s|ed)?|work(?:s|ed)?|retries|retry|scales?|performance|latency|throughput|overload|production|load|fallback|falls back|race|deadlock|memory leak)\b/i.test(claim.statement);
    const untested=/\b(?:would|could|under load|production|scales?|scalability|throughput|overload|performance)\b/i.test(claim.statement);
    // Aggregate test counters do not establish coverage for a specific runtime behaviour.
    const basis=claim.basis==="executed"&&(untested||(runtime))?"ai_predicted":claim.basis;
    claims.push({id:`c${index+1}`,dimension:claim.dimension,signal:claim.signal,statement:claim.statement,evidence,basis});
  }
  return {claims,droppedClaims:raw.length-claims.length};
}
