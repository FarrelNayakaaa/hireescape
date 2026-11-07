"use client";
import { getSeededChallenge } from "@challenges";
import { useAssessmentStore } from "./store";
import { requestAssessmentToken } from "./lib/token";
import { fictionalAliases } from "./lib/aliases";

export async function createDemoAssessment(): Promise<string> {
  const id = crypto.randomUUID();
  const challenge = getSeededChallenge();
  const token = await requestAssessmentToken({ assessmentId: id, aiAssistance: true, durationMin: 45 });
  // Only an explicit creation action loads manager-side fixes; bundle reads never load them.
  const { getSeededSecret } = await import("@challenges/secrets");
  const secret = getSeededSecret(challenge.id);
  if (!secret) throw new Error("The pre-validated demo challenge is unavailable.");
  await useAssessmentStore.getState().addAssessment({
    id, challengeId: challenge.id, candidateAlias: fictionalAliases[0], level: "mid", aiAssistance: true,
    durationMin: 45, proctoring: { mode: "browser", required: false, captureSnapshots: false },
    locale: "en", createdAt: new Date().toISOString(), token,
  }, challenge, secret);
  return id;
}
