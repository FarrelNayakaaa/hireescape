"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AssessmentConfig, Challenge, ChallengeSecret } from "@/lib/contracts";
import { assessmentDataSchema, assessmentSchema } from "./publicSchemas";

import { storage, warnStorage } from "./storage";
export { getPersistenceWarning } from "./storage";

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
    const manager = await import("./store");
    return manager.addAssessment(assessment, challenge, secret);
  },
  async removeAssessment(id) {
    const manager = await import("./store");
    return manager.removeAssessment(id);
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
export function hydrateAssessments(): Promise<void> {
  if (useAssessmentStore.persist.hasHydrated()) return Promise.resolve();
  publicHydration ??= Promise.resolve(useAssessmentStore.persist.rehydrate()).finally(() => { publicHydration = undefined; });
  return publicHydration;
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
