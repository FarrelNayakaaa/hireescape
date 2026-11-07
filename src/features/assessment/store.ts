"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { AssessmentConfig, Challenge, ChallengeSecret } from "@/lib/contracts";
import { assessmentDataSchema, assessmentSchema, challengeSchema, secretDataSchema, secretSchema } from "./schemas";

let persistenceWarning: string | null = null;
export function getPersistenceWarning(): string | null { return persistenceWarning; }
const warnStorage = () => { persistenceWarning = "Browser storage is unavailable or unreadable. Keep this tab open and export a backup."; };
const storage: StateStorage = {
  getItem(name) {
    if (typeof window === "undefined") return null;
    try {
      const value = localStorage.getItem(name);
      if (value !== null) JSON.parse(value);
      return value;
    } catch { warnStorage(); return null; }
  },
  setItem(name, value) {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(name, value); } catch { warnStorage(); }
  },
  removeItem(name) {
    if (typeof window === "undefined") return;
    try { localStorage.removeItem(name); } catch { warnStorage(); }
  },
};

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

interface AssessmentState {
  assessments: Record<string, AssessmentConfig>;
  challenges: Record<string, Challenge>;
  addAssessment: (assessment: AssessmentConfig, challenge: Challenge, secret: ChallengeSecret) => Promise<void>;
  removeAssessment: (id: string) => Promise<void>;
  setToken: (id: string, token: string) => Promise<void>;
}

export const useAssessmentStore = create<AssessmentState>()(persist((set, get) => ({
  assessments: {}, challenges: {},
  async addAssessment(assessment, challenge, secret) {
    const safeAssessment = assessmentSchema.parse(assessment);
    const safeChallenge = challengeSchema.parse(challenge);
    const safeSecret = secretSchema.parse(secret);
    if (safeAssessment.challengeId !== safeChallenge.id || safeSecret.challengeId !== safeChallenge.id) throw new Error("Assessment and challenge IDs do not match.");
    await hydrateManagerStores();
    useSecretStore.setState((state) => ({ secrets: { ...state.secrets, [safeSecret.challengeId]: safeSecret } }));
    set((state) => ({ assessments: { ...state.assessments, [safeAssessment.id]: safeAssessment }, challenges: { ...state.challenges, [safeChallenge.id]: safeChallenge } }));
  },
  async removeAssessment(id) {
    await hydrateManagerStores();
    const assessment = get().assessments[id];
    if (!assessment) return;
    const assessments = { ...get().assessments };
    const challenges = { ...get().challenges };
    delete assessments[id];
    if (!Object.values(assessments).some((item) => item.challengeId === assessment.challengeId)) {
      delete challenges[assessment.challengeId];
      useSecretStore.setState((state) => {
        const secrets = { ...state.secrets };
        delete secrets[assessment.challengeId];
        return { secrets };
      });
    }
    set({ assessments, challenges });
  },
  async setToken(id, token) {
    await hydrateAssessments();
    const assessment = get().assessments[id];
    if (!assessment) throw new Error("Assessment not found.");
    set((state) => ({ assessments: { ...state.assessments, [id]: assessmentSchema.parse({ ...assessment, token }) } }));
  },
}), {
  name: "he:assessments", storage: createJSONStorage(() => storage), skipHydration: true,
  partialize: (state) => assessmentDataSchema.parse(state),
  merge: (saved, current) => {
    const parsed = assessmentDataSchema.safeParse(saved);
    if (!parsed.success) { if (saved !== undefined) warnStorage(); return current; }
    return { ...current, ...parsed.data };
  },
}));

let publicHydration: Promise<void> | undefined;
let secretHydration: Promise<void> | undefined;
export function hydrateAssessments(): Promise<void> {
  if (useAssessmentStore.persist.hasHydrated()) return Promise.resolve();
  publicHydration ??= Promise.resolve(useAssessmentStore.persist.rehydrate()).finally(() => { publicHydration = undefined; });
  return publicHydration;
}
export async function hydrateManagerStores(): Promise<void> {
  if (!useSecretStore.persist.hasHydrated()) {
    secretHydration ??= Promise.resolve(useSecretStore.persist.rehydrate()).finally(() => { secretHydration = undefined; });
  }
  await Promise.all([hydrateAssessments(), secretHydration]);
}

const subscribeHydration = (notify: () => void) => {
  const start = useAssessmentStore.persist.onHydrate(notify);
  const finish = useAssessmentStore.persist.onFinishHydration(notify);
  return () => { start(); finish(); };
};
export function useAssessmentHydration(): boolean {
  const hydrated = useSyncExternalStore(subscribeHydration, useAssessmentStore.persist.hasHydrated, () => false);
  useEffect(() => { void hydrateAssessments(); }, []);
  return hydrated;
}
