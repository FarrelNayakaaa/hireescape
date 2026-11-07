import { expect, it } from "vitest";
import { capturedSignals } from "../lib/signals";
import type { Session, SessionEvent } from "@/lib/contracts";
const event = (id: number, type: SessionEvent["type"], room: SessionEvent["room"], data = {}, text?: string): SessionEvent => ({ id: `e${id}`, type, room, data, text, t: id * 100 });
const events = [event(1, "triage_mark", 1, {}, "An unavailable dependency prevents a fallback"), event(2, "test_run", 2), event(3, "room_complete", 2, { room: 2 }), event(4, "candidate_answer", 2), event(5, "candidate_answer", 3), event(6, "assistant_prompt", 2), event(7, "ai_diff_view", 2), event(8, "ai_apply", 2), event(9, "test_run", 2), event(10, "edit", 2)];
const session: Session = { id: "fictional", assessmentId: "fictional", challengeId: "fictional", aiAssistance: true, startedAt: new Date(0).toISOString(), finalCode: "safe\ntry { external(); }", events, suggestions: [], lineOrigins: ["starter", "ai_edited"], snapshots: [{ eventId: "e9", t: 900, code: "safe\nexternal();" }, { eventId: "e10", t: 1000, code: "safe\ntry { external(); }" }] };
it("maps evidence to raw counts per axis without double counting Room 3 communication", () => {
  expect(capturedSignals(session, { starterCode: "safe\nexternal();", defectLines: [1, 1] })).toEqual({ debugging: 4, design: 2, communication: 3, ai_supervision: 4 });
});
it("does not assess AI supervision when assistance is off, and requires retained error-handling edits outside the defect", () => {
  expect(capturedSignals({ ...session, aiAssistance: false }, { starterCode: "safe\nexternal();", defectLines: [2, 2] })).toEqual({ debugging: 4, design: 1, communication: 3, ai_supervision: null });
  expect(capturedSignals({ ...session, snapshots: [] }, { starterCode: "safe\nexternal();", defectLines: [1, 1] }).design).toBe(1);
});
