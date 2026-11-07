"use client";

import { useMemo } from "react";
import { getSeededChallenge } from "@challenges";
import type { AssessmentConfig, Challenge } from "@/lib/contracts";
import { assessmentSchema, challengeSchema } from "./schemas";
import { useAssessmentHydration, useAssessmentStore } from "./store";
import { requestAssessmentToken } from "./lib/token";
import { fictionalAliases } from "./lib/aliases";

export type AssessmentBundle = { assessment: AssessmentConfig; challenge: Challenge };

function publicBundle(assessment: unknown, challenge: unknown): AssessmentBundle | null {
  const a = assessmentSchema.safeParse(assessment);
  const c = challengeSchema.safeParse(challenge);
  return a.success && c.success && a.data.challengeId === c.data.id ? { assessment: a.data, challenge: c.data } : null;
}

export function getAssessmentBundle(id: string): AssessmentBundle | null {
  const state = useAssessmentStore.getState();
  const assessment = state.assessments[id];
  return assessment ? publicBundle(assessment, state.challenges[assessment.challengeId]) : null;
}

export function useAssessmentBundle(id: string): { status: "loading" | "ready" | "not_found"; bundle: AssessmentBundle | null } {
  const hydrated = useAssessmentHydration();
  const assessment = useAssessmentStore((state) => state.assessments[id]);
  const challenge = useAssessmentStore((state) => assessment ? state.challenges[assessment.challengeId] : undefined);
  const bundle = useMemo(() => publicBundle(assessment, challenge), [assessment, challenge]);
  return { status: !hydrated ? "loading" : bundle ? "ready" : "not_found", bundle: hydrated ? bundle : null };
}

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
