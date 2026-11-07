import type { Challenge, ChallengeSecret, Session } from "@/lib/contracts";
import { AnalystRequest, type AnalystInput } from "../schema";
import { compactSession } from "./compact";
import { computeObjectiveMetrics } from "./metrics";
export function buildAnalysisRequest(session:Session,challenge:Challenge,secret:ChallengeSecret):AnalystInput {
 if(session.challengeId!==challenge.id||secret.challengeId!==challenge.id)throw new Error("Analysis context does not match the session.");
 return AnalystRequest.parse({aiAssistance:session.aiAssistance,challenge:{brief:challenge.brief,defectType:challenge.defectType,rubricHints:[...challenge.rubricHints]},referenceFix:secret.referenceFix,starterCode:challenge.starterCode,finalCode:session.finalCode,timeline:compactSession(session),objective:computeObjectiveMetrics(session,challenge),suggestions:session.suggestions.map(s=>({id:s.id,code:s.code}))});
}
