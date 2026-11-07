import type { Claim, CompetencyLevel, Dimension, ObjectiveMetrics } from "@/lib/contracts";
export function deriveCompetency(claims:Claim[],objective:ObjectiveMetrics,aiAssistance:boolean):Record<Dimension,CompetencyLevel> {
  const level=(dimension:Dimension):CompetencyLevel=>{
    if(dimension==="ai_supervision"&&!aiAssistance)return "not_assessed";
    const selected=claims.filter(c=>c.dimension===dimension);
    const strengths=selected.filter(c=>c.signal==="strength").length;
    const concerns=selected.filter(c=>c.signal==="concern").length;
    if(strengths+concerns===0)return "insufficient";
    if(dimension==="debugging"&&objective.hiddenPassed<objective.hiddenTotal&&concerns===0)return "some";
    if(concerns===0&&strengths>=2)return "strong";
    if(concerns>strengths)return "concern";
    return "some";
  };
  return {debugging:level("debugging"),design:level("design"),communication:level("communication"),ai_supervision:level("ai_supervision")};
}
