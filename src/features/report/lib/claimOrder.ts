import type { Claim, Dimension } from "@/lib/contracts";
export const dimensions:Dimension[]=["debugging","design","communication","ai_supervision"];
export const dimensionLabels:Record<Dimension,string>={debugging:"Debugging",design:"Design",communication:"Communication",ai_supervision:"AI supervision"};
/** Within each dimension, alternate concerns and strengths (concern first); observations come last. */
export function orderClaims(claims:Claim[]):Claim[]{
 const primary=dimensions.flatMap(dimension=>{
  const group=claims.filter(c=>c.dimension===dimension),concerns=group.filter(c=>c.signal==="concern"),strengths=group.filter(c=>c.signal==="strength");
  const ordered:Claim[]=[];
  for(let i=0;i<Math.max(concerns.length,strengths.length);i++){if(concerns[i])ordered.push(concerns[i]);if(strengths[i])ordered.push(strengths[i]);}
  return ordered;
 });
 return [...primary,...dimensions.flatMap(d=>claims.filter(c=>c.dimension===d&&c.signal==="observation"))];
}
