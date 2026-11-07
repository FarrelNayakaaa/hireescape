"use client";

import { useMemo } from "react";
import type { AssessmentConfig, Challenge } from "@/lib/contracts";
import { assessmentSchema, challengeSchema } from "./publicSchemas";
import { useAssessmentHydration, useAssessmentStore } from "./publicStore";

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
  const manager = await import("./createDemoAssessment");
  return manager.createDemoAssessment();
}
