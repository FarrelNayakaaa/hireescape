import type { ObjectiveMetrics, Session } from "@/lib/contracts";
import { AccentCard, BasisLabel } from "@/components/ui";
import { formatDuration, reviewedApplies } from "../lib/events";
export function ObjectiveStrip({objective,session}:{objective:ObjectiveMetrics;session:Session}){
 const review=reviewedApplies(session.events);
 const share=(value:number|null)=>!session.aiAssistance?"AI assistance was off":value===null?"No changed lines":`${Math.round(value*100)}%`;
 const cards=[
  ["Hidden tests",objective.hiddenTotal===0?"No executed result":`${objective.hiddenPassed}/${objective.hiddenTotal} ${objective.hiddenPassed===objective.hiddenTotal?"✓ all passing":"✗ incomplete"}`],
  ["Time to fix",formatDuration(objective.timeToFixSec)],["Test runs",String(objective.testRuns)],["Changed lines",String(objective.changedLines)],
  ["AI line share",share(objective.aiLineShare)],["AI-edited share",share(objective.aiEditedShare)],
  ["Diffs reviewed before apply",session.aiAssistance?`${review.reviewed} of ${review.total}`:"AI assistance was off"],["Paste count",String(objective.pasteCount)],
 ];
 return <div data-report-objective className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value])=><AccentCard key={label}><h3 className="he-small he-muted mb-3">{label}</h3><p className="he-mono text-lg break-words mb-4">{value}</p><BasisLabel basis="executed"/></AccentCard>)}</div>;
}
