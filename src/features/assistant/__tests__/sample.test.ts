// @vitest-environment jsdom
import { expect, it } from "vitest";
import sample from "../../../../docs/samples/session.sample.json";
import { getSession, importSessions, useSessionStore } from "@/features/session";
it("imports the real Chrome H9 session with linked Assistant evidence, provenance, and one complete escape", () => {
  useSessionStore.setState({ sessions: {} }); expect(importSessions([sample])).toBe(1);
  const session = getSession(sample.id)!;
  expect(session.endReason).toBe("escaped"); expect(session.lineOrigins).toHaveLength(session.finalCode.split("\n").length);
  expect(session.lineOrigins).toContain("ai"); expect(session.lineOrigins).toContain("ai_edited");
  for (const type of ["assistant_prompt", "assistant_response", "ai_diff_view", "ai_apply"]) expect(session.events.some((event) => event.type === type)).toBe(true);
  expect(session.events.filter((event) => event.type === "session_end")).toHaveLength(1);
  expect(session.events.filter((event) => event.type === "room_enter").map((event) => event.data?.room)).toEqual([1, 2, 3]);
  const defence = session.events.filter((event) => event.type === "inquisitor_question" && event.data?.mode === "defence");
  expect(defence.map((event) => event.data?.intent)).toEqual(["failure_mode", "observability", "tradeoff"]);
  for (const suggestion of session.suggestions) {
    expect(session.events.find((event) => event.id === suggestion.promptEventId)?.type).toBe("assistant_prompt");
    expect(session.events.find((event) => event.id === suggestion.responseEventId)).toMatchObject({ type: "assistant_response", data: { suggestionId: suggestion.id } });
  }
  for (const key of ["integrity", "hiddenTests", "referenceFix"]) expect(session).not.toHaveProperty(key);
});
