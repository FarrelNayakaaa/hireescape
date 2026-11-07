"use client";
import { AccentCard } from "@/components/ui";
import type { GenerateState } from "../hooks/useGenerateChallenge";
import { SaboteurProgress } from "./SaboteurProgress";
import { ValidationChecklist } from "./ValidationChecklist";
export function SaboteurPanel({state}:{state:GenerateState}) {
  return <div className="space-y-6"><AccentCard accent="agent"><SaboteurProgress state={state}/><ValidationChecklist state={state}/>{state.usedFallback&&<p role="status" className="mt-5 he-small">Using a pre-validated challenge. {state.fallbackReason}</p>}{state.error&&<p role="alert" className="mt-5">{state.error}</p>}</AccentCard>
  </div>;
}
