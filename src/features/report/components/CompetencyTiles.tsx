import type { Claim, CompetencyLevel, Dimension } from "@/lib/contracts";
import { AccentCard } from "@/components/ui";
import { dimensions, dimensionLabels } from "../lib/claimOrder";
const labels:Record<CompetencyLevel,string>={strong:"Strong",some:"Some",concern:"Concern",insufficient:"Insufficient evidence",not_assessed:"Not assessed"};
export function CompetencyTiles({claims,competency,aiAssistance}:{claims:Claim[];competency?:Record<Dimension,CompetencyLevel>;aiAssistance:boolean}){
 return <div data-report-competency className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{dimensions.map(d=>{const level=d==="ai_supervision"&&!aiAssistance?"not_assessed":competency?.[d]??"insufficient";return <AccentCard key={d} className={level==="not_assessed"?"text-he-muted":""}><h3>{dimensionLabels[d]}</h3><p className="mt-3 mb-2 font-semibold">{labels[level]}</p><p className="he-small">based on {claims.filter(c=>c.dimension===d).length} verified claims</p>{level==="not_assessed"&&<p className="he-small mt-3">AI assistance was off</p>}</AccentCard>;})}</div>;
}
