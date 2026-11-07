import type { AssessmentConfig } from "@/lib/contracts";
import { getSeededChallenge } from "@challenges";
import type { InquisitorInput } from "../schema";
export const challenge = getSeededChallenge("cache_no_fallback", "mid");
export const assessment: AssessmentConfig = { id: "inquisitor-fictional", challengeId: challenge.id, candidateAlias: "Candidate A (fictional)", level: "mid", aiAssistance: true, durationMin: 45, proctoring: { mode: "off", required: false, captureSnapshots: false }, locale: "en", createdAt: new Date(0).toISOString(), token: "fixture" };
export const input: InquisitorInput = { assessmentId: assessment.id, mode: "nudge", locale: "en", challenge: { brief: challenge.brief, defectType: challenge.defectType, rubricHints: challenge.rubricHints }, starterCode: challenge.starterCode, currentCode: challenge.starterCode, recentQA: [], defenceIndex: null };
