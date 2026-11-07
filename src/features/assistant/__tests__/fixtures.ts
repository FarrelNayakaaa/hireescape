import type { AssessmentConfig } from "@/lib/contracts";
import { getSeededChallenge } from "@challenges";
import type { AssistantInput } from "../schema";
export const challenge = getSeededChallenge("cache_no_fallback", "mid");
export const assessment: AssessmentConfig = { id: "assistant-fictional", challengeId: challenge.id, candidateAlias: "Candidate A (fictional)", level: "mid", aiAssistance: true, durationMin: 45, proctoring: { mode: "off", required: false, captureSnapshots: false }, locale: "en", createdAt: new Date(0).toISOString(), token: "fixture-token" };
export const input: AssistantInput = { assessmentId: assessment.id, room: 2, locale: "en", brief: challenge.brief, currentCode: challenge.starterCode, visibleTests: challenge.visibleTests, lastRun: null, history: [], prompt: "fix it" };
