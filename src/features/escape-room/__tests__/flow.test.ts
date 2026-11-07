import { describe, expect, it } from "vitest";
import type { AssessmentConfig, SessionEvent } from "@/lib/contracts";
import { deriveFlow, initialRoomUiState, roomUiReducer } from "../lib/flow";

const assessment: AssessmentConfig = {
  id: "fictional-assessment", challengeId: "fixture", candidateAlias: "Candidate A (fictional)", level: "mid", aiAssistance: true,
  durationMin: 45, proctoring: { mode: "off", required: false, captureSnapshots: false }, locale: "en", token: "fixture",
  createdAt: "2026-11-07T02:30:00.000Z",
};
function event(type: SessionEvent["type"], data?: Record<string, unknown>): SessionEvent {
  return { id: "e1", t: 0, room: 0, type, data };
}
const started = [event("session_start"), event("rules_ack")];

describe("event-derived flow", () => {
  it("handles loading, unknown assessments, and the rules screen", () => {
    expect(deriveFlow(null, undefined).phase).toBe("loading");
    expect(deriveFlow(null, null).phase).toBe("not_found");
    expect(deriveFlow(null, assessment)).toMatchObject({ phase: "rules", room: 0, completedRooms: [], startedAtMs: null });
    expect(deriveFlow([], { ...assessment, proctoring: { mode: "browser", required: false, captureSnapshots: false } }).phase).toBe("rules");
  });
  it("restores the room, completed keys, and persisted timer base", () => {
    const first = deriveFlow(started, assessment, { startedAt: "2026-11-07T03:00:00.000Z" });
    expect(first).toMatchObject({ phase: "room1", room: 1, startedAtMs: Date.parse("2026-11-07T03:00:00.000Z") });
    const second = [...started, event("room_complete", { room: 1 })];
    expect(deriveFlow(second, assessment)).toMatchObject({ phase: "room2", room: 2, completedRooms: [1] });
    expect(deriveFlow([...second, event("room_complete", { room: 2 })], assessment)).toMatchObject({ phase: "room3", room: 3, completedRooms: [1, 2] });
    expect(deriveFlow(started, assessment, { startedAt: "invalid" }).startedAtMs).toBeNull();
  });
  it("does not skip or revisit rooms when events are out of order", () => {
    expect(deriveFlow([event("rules_ack")], assessment).phase).toBe("rules");
    expect(deriveFlow([...started, event("room_enter", { room: 3 }), event("room_complete", { room: 2 })], assessment).phase).toBe("room1");
    expect(deriveFlow([...started, event("room_complete", { room: 1 }), event("room_enter", { room: 1 }), event("room_complete", { room: 1 })], assessment))
      .toMatchObject({ phase: "room2", completedRooms: [1] });
  });
  it.each(["escaped", "timeout"] as const)("restores the terminal %s phase", (reason) => {
    expect(deriveFlow([...started, event("session_end", { reason }), event("room_complete", { room: 1 })], assessment).phase).toBe(reason);
  });
  it("does not label an abandoned session as a timeout", () => {
    expect(deriveFlow([...started, event("session_end", { reason: "abandoned" })], assessment).phase).toBe("blocked");
  });
  it("blocks required consent refusal without adding it to session evidence", () => {
    expect(deriveFlow(null, { ...assessment, proctoring: { mode: "camera_mic", required: true, captureSnapshots: false } }, { consentDeclined: true }).phase).toBe("blocked");
    expect(deriveFlow(null, assessment, { consentDeclined: true }).phase).toBe("rules");
  });
  it("keeps tab and intro state separate from session progression", () => {
    const tabs = roomUiReducer(initialRoomUiState, { type: "select_tab", tab: "tests" });
    expect(tabs.activeTab).toBe("tests");
    const dismissed = roomUiReducer(tabs, { type: "dismiss_intro", room: 1 });
    expect(roomUiReducer(dismissed, { type: "dismiss_intro", room: 1 }).dismissedIntros).toEqual([1]);
    expect(initialRoomUiState.dismissedIntros).toEqual([]);
  });
});

it.each([
  { phase: "rules", events: [] },
  { phase: "room1", events: started },
  { phase: "room2", events: [...started, event("room_complete", { room: 1 })] },
  { phase: "room3", events: [...started, event("room_complete", { room: 1 }), event("room_complete", { room: 2 }), event("room_enter", { room: 3 })] },
  { phase: "escaped", events: [...started, event("session_end", { reason: "escaped" })] },
  { phase: "timeout", events: [...started, event("session_end", { reason: "timeout" })] },
])("restores $phase after a storage round trip", ({ phase, events }) => {
  expect(deriveFlow(JSON.parse(JSON.stringify(events)), assessment, { startedAt: assessment.createdAt }).phase).toBe(phase);
});
