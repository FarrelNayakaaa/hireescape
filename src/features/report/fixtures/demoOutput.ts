import type { AgentMeta } from "@/lib/contracts";
export const demoOutput={
  "claims": [
    {
      "dimension": "debugging",
      "signal": "strength",
      "statement": "Identified cache access as the causal boundary in triage.",
      "evidence": [
        {
          "kind": "event",
          "line": null,
          "eventId": "e4",
          "quote": "cache.get throws on timeout and nothing catches it"
        }
      ],
      "basis": "executed"
    },
    {
      "dimension": "debugging",
      "signal": "strength",
      "statement": "All hidden tests passed in the final recorded run.",
      "evidence": [
        {
          "kind": "event",
          "line": null,
          "eventId": "e30",
          "quote": "\"passed\":6"
        }
      ],
      "basis": "executed"
    },
    {
      "dimension": "design",
      "signal": "strength",
      "statement": "Added a warning with cache failure context.",
      "evidence": [
        {
          "kind": "code_line",
          "line": 18,
          "eventId": null,
          "quote": "logger.warn(\"cache.get failed, falling back to repo\""
        }
      ],
      "basis": "executed"
    },
    {
      "dimension": "design",
      "signal": "strength",
      "statement": "Separated cache and repository failure boundaries in the explanation.",
      "evidence": [
        {
          "kind": "event",
          "line": null,
          "eventId": "e34",
          "quote": "repository errors still propagate"
        }
      ],
      "basis": "executed"
    },
    {
      "dimension": "communication",
      "signal": "strength",
      "statement": "Explained why the cache remains optional.",
      "evidence": [
        {
          "kind": "event",
          "line": null,
          "eventId": "e34",
          "quote": "The cache is optional"
        }
      ],
      "basis": "executed"
    },
    {
      "dimension": "communication",
      "signal": "strength",
      "statement": "Identified operation and product id as useful log fields.",
      "evidence": [
        {
          "kind": "event",
          "line": null,
          "eventId": "e36",
          "quote": "I log the operation and product id"
        }
      ],
      "basis": "executed"
    },
    {
      "dimension": "ai_supervision",
      "signal": "strength",
      "statement": "Provided cache timeout context and limited the assistant scope.",
      "evidence": [
        {
          "kind": "event",
          "line": null,
          "eventId": "e12",
          "quote": "why would getProduct fail when the cache times out? only fix the get path"
        }
      ],
      "basis": "executed"
    },
    {
      "dimension": "ai_supervision",
      "signal": "concern",
      "statement": "Applied an unreviewed suggestion and then observed a regression.",
      "evidence": [
        {
          "kind": "event",
          "line": null,
          "eventId": "e20",
          "quote": "\"reviewedFirst\":false"
        },
        {
          "kind": "event",
          "line": null,
          "eventId": "e21",
          "quote": "\"passed\":4"
        }
      ],
      "basis": "executed"
    },
    {
      "dimension": "design",
      "signal": "observation",
      "statement": "Recorded an implemented circuit breaker.",
      "evidence": [
        {
          "kind": "code_line",
          "line": 1,
          "eventId": null,
          "quote": "FABRICATED_CIRCUIT_BREAKER_EVIDENCE"
        }
      ],
      "basis": "executed"
    }
  ],
  "summary": "The final recorded run passed six hidden tests. The candidate explained the separation between cache and repository failures. One suggestion was applied without a prior diff review before a regression appeared."
};
export const demoMeta:AgentMeta={role:"analyst",model:"static-demo",promptVersion:"analyst@2",latencyMs:0,attempts:1,mock:true};
