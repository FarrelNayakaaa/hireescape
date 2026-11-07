import type { AssessmentConfig, Challenge } from "@/lib/contracts";

export const assessment: AssessmentConfig = {
  id: "assessment-fictional", challengeId: "challenge-fixture", candidateAlias: "Candidate A (fictional)",
  level: "mid", aiAssistance: true, durationMin: 45,
  proctoring: { mode: "off", required: false, captureSnapshots: false },
  locale: "en", createdAt: "2026-11-07T02:30:00.000Z", token: "fixture-token",
};
export const challenge: Challenge = {
  id: "challenge-fixture", title: "INC-TEST: cache unavailable", level: "mid", defectType: "cache_no_fallback",
  language: "javascript", brief: "Restore the fallback", starterCode: "first\nsecond\nthird",
  visibleTests: "", hiddenTests: "", defectLines: [2, 2], rubricHints: [], source: "seeded",
  validation: { brokenFailsHidden: true, fixPassesHidden: true, attempts: 1, validatedAt: "2026-11-07T02:30:00.000Z" },
};
