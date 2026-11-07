import type { CodexRole } from "@/lib/contracts";
import { AgentAvatar } from "./AgentAvatar";
import { ReadableText } from "./ReadableText";

export function AgentChip({ agent, status, mock, latencyMs }: { agent: CodexRole; status?: string; mock?: boolean; latencyMs?: number }) {
  return <span className="he-agent-chip">
    <AgentAvatar agent={agent} size="sm" />
    <span className="he-agent-name">{agent[0].toUpperCase() + agent.slice(1)}</span>
    {status && <span className="he-small he-muted"><ReadableText>{status}</ReadableText></span>}
    {mock !== undefined && <span className="he-chip he-mono">{mock ? "MOCK" : "LIVE"}</span>}
    {latencyMs !== undefined && <span className="he-small he-mono he-muted">{(latencyMs / 1000).toFixed(1)}s</span>}
  </span>;
}
