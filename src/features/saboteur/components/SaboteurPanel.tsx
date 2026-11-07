"use client";
import { AccentCard, AgentChip } from "@/components/ui";
import { useAgentConsole } from "@/lib/codex/agentConsole";
import type { GenerateState } from "../hooks/useGenerateChallenge";
import { SaboteurProgress } from "./SaboteurProgress";
import { ValidationChecklist } from "./ValidationChecklist";
export function SaboteurPanel({state}:{state:GenerateState}) {
  const entries=useAgentConsole(s=>s.entries);
  return <div className="space-y-6"><AccentCard accent="agent"><SaboteurProgress state={state}/><ValidationChecklist state={state}/>{state.usedFallback&&<p role="status" className="mt-5 he-small">Using a pre-validated challenge. {state.fallbackReason}</p>}{state.error&&<p role="alert" className="mt-5">{state.error}</p>}</AccentCard>
    <AccentCard accent="neutral"><details open={state.status!=="idle"}><summary className="cursor-pointer">Agent Console</summary><ul className="space-y-4 mt-4">{entries.filter(e=>e.role==="saboteur").map((meta,i)=><li key={`${meta.promptVersion}-${i}`}><AgentChip agent="saboteur" status="Call completed" latencyMs={meta.latencyMs} mock={meta.mock}/><p className="he-small he-muted mt-1 break-all">{meta.model} · {meta.promptVersion} · {meta.attempts} SDK attempt(s)</p></li>)}</ul>{!entries.some(e=>e.role==="saboteur")&&<p className="he-small he-muted mt-3">No completed Saboteur calls yet.</p>}</details></AccentCard></div>;
}
