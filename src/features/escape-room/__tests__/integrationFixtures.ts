import type { AssessmentConfig } from "@/lib/contracts";
import { getSeededChallenge } from "@challenges";

export const challenge = getSeededChallenge("cache_no_fallback", "mid");
export const assessment: AssessmentConfig = {
  id: "b3-fictional-assessment", challengeId: challenge.id, candidateAlias: "Candidate A (fictional)",
  level: "mid", aiAssistance: true, durationMin: 45, proctoring: { mode: "off", required: false, captureSnapshots: false },
  locale: "en", createdAt: "2026-11-07T03:00:00.000Z", token: "fixture-token",
};
