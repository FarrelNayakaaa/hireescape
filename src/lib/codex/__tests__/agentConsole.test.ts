import { beforeEach, expect, test } from "vitest";
import type { AgentMeta } from "@/lib/contracts";
import { useAgentConsole } from "../agentConsole";

beforeEach(() => useAgentConsole.getState().clear());

test("keeps only the newest 50 telemetry entries and can clear them", () => {
  const entry: AgentMeta = {
    role: "analyst", model: "mock", promptVersion: "test@1", latencyMs: 600, attempts: 1, mock: true,
  };
  for (let index = 0; index < 55; index++) useAgentConsole.getState().push({ ...entry, latencyMs: index });
  const entries = useAgentConsole.getState().entries;
  expect(entries).toHaveLength(50);
  expect(entries[0].latencyMs).toBe(54);
  expect(entries[49].latencyMs).toBe(5);
  useAgentConsole.getState().clear();
  expect(useAgentConsole.getState().entries).toEqual([]);
});
