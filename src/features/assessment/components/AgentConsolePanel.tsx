"use client";
import { AccentCard, AgentChip } from "@/components/ui";
import { useAgentConsole } from "@/lib/codex/agentConsole";
export function AgentConsolePanel(){
 const entries=useAgentConsole(state=>state.entries);
 return <AccentCard><details><summary className="cursor-pointer">Codex agents</summary>{!entries.length?<p className="he-small he-muted mt-4">No agent calls yet.</p>:<ol className="space-y-4 mt-5" aria-label="Agent calls">{entries.map((meta,i)=><li key={`${meta.role}-${meta.promptVersion}-${i}`}><AgentChip agent={meta.role} status="Call completed" latencyMs={meta.latencyMs} mock={meta.mock}/><dl className="he-small he-muted mt-2 space-y-1 break-all"><div><dt className="inline">Model: </dt><dd className="inline he-mono">{meta.model}</dd></div><div><dt className="inline">Attempts: </dt><dd className="inline he-mono">{meta.attempts}</dd></div><div><dt className="inline">Prompt: </dt><dd className="inline he-mono">{meta.promptVersion}</dd></div></dl></li>)}</ol>}</details></AccentCard>;
}
