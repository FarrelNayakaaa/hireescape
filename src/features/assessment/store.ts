"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AssessmentConfig, Challenge, ChallengeSecret } from "@/lib/contracts";
import { assessmentSchema, challengeSchema, secretDataSchema, secretSchema } from "./schemas";
import { hydrateAssessments, useAssessmentStore } from "./publicStore";
import { storage, warnStorage } from "./storage";
export { getPersistenceWarning, useAssessmentHydration, useAssessmentStore, hydrateAssessments } from "./publicStore";

interface SecretState { secrets: Record<string, ChallengeSecret> }
export const useSecretStore = create<SecretState>()(persist(() => ({ secrets: {} }), {
  name: "he:secrets", storage: createJSONStorage(() => storage), skipHydration: true,
  partialize: (state) => secretDataSchema.parse(state),
  merge: (saved, current) => {
    const parsed = secretDataSchema.safeParse(saved);
    if (!parsed.success) { if (saved !== undefined) warnStorage(); return current; }
    return { ...current, ...parsed.data };
  },
}));

export async function addAssessment(assessment: AssessmentConfig, challenge: Challenge, secret: ChallengeSecret): Promise<void> {
    const safeAssessment = assessmentSchema.parse(assessment);
    const safeChallenge = challengeSchema.parse(challenge);
    const safeSecret = secretSchema.parse(secret);
    if (safeAssessment.challengeId !== safeChallenge.id || safeSecret.challengeId !== safeChallenge.id) throw new Error("Assessment and challenge IDs do not match.");
    await hydrateManagerStores();
    useSecretStore.setState((state) => ({ secrets: { ...state.secrets, [safeSecret.challengeId]: safeSecret } }));
    useAssessmentStore.setState((state) => ({ assessments: { ...state.assessments, [safeAssessment.id]: safeAssessment }, challenges: { ...state.challenges, [safeChallenge.id]: safeChallenge } }));
}

export async function removeAssessment(id: string): Promise<void> {
    await hydrateManagerStores();
    const assessment = useAssessmentStore.getState().assessments[id];
    if (!assessment) return;
    const assessments = { ...useAssessmentStore.getState().assessments };
    const challenges = { ...useAssessmentStore.getState().challenges };
    delete assessments[id];
    if (!Object.values(assessments).some((item) => item.challengeId === assessment.challengeId)) {
      delete challenges[assessment.challengeId];
      useSecretStore.setState((state) => {
        const secrets = { ...state.secrets };
        delete secrets[assessment.challengeId];
        return { secrets };
      });
    }
    useAssessmentStore.setState({ assessments, challenges });
}

let secretHydration: Promise<void> | undefined;
export async function hydrateManagerStores(): Promise<void> {
  if (!useSecretStore.persist.hasHydrated()) {
    secretHydration ??= Promise.resolve(useSecretStore.persist.rehydrate()).finally(() => { secretHydration = undefined; });
  }
  await Promise.all([hydrateAssessments(), secretHydration]);
}
