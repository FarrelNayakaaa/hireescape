"use client";
import { AgentAvatar, StepList } from "@/components/ui";
import type { GenerateState } from "../hooks/useGenerateChallenge";
export function SaboteurProgress({state}:{state:GenerateState}) {
  const failure=state.attempts.find(a=>a.n===state.attempt-1)?.failures[0];
  return <><div className="flex items-center gap-4 mb-6"><AgentAvatar agent="saboteur" state={state.status==="running"?"thinking":state.status==="done"?"done":state.status==="error"?"error":"idle"}/><div><h2>Saboteur</h2><p className="he-small he-muted">Generate, then prove by execution</p></div></div>
    <p role="status" className="he-small mb-5">{state.usedFallback?"Validating a seeded fallback":state.attempt?`Attempt ${state.attempt}/3${failure?` — fixing: ${failure}`:""}`:"Ready to generate"}</p>
    <StepList steps={state.steps}/></>;
}
