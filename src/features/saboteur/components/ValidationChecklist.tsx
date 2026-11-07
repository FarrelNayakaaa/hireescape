"use client";
import { Check, Circle, X } from "lucide-react";
import type { GenerateState } from "../hooks/useGenerateChallenge";
export function ValidationChecklist({state}:{state:GenerateState}) {
  return <section className="mt-6"><h3 className="mb-3">Validation checklist</h3><ul className="space-y-3 he-small">{state.checks.map(check=>{
    const Icon=check.status==="pass"?Check:check.status==="fail"?X:Circle;
    const message=state.attempts.at(-1)?.failures.find(f=>f.startsWith(`${check.id} failed`));
    return <li key={check.id}><div className="flex gap-2 items-start"><Icon size={16} aria-hidden="true" className="shrink-0 mt-1"/><span><span className="he-mono">{check.id}</span> {check.label}<span className="he-muted"> — {check.status==="pending"?"Pending":check.status==="pass"?"Passed":"Failed"}</span></span></div>{check.status==="fail"&&message&&<p className="mt-1 he-muted">{message}</p>}</li>;
  })}</ul></section>;
}
