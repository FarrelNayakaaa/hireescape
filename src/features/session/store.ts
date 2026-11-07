"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import type { AssessmentConfig, Challenge, EventDataMap, Room, Session, SessionEvent, Suggestion } from "@/lib/contracts";
import { applyWithProvenance } from "./lib/provenance";
import { compactSnapshots } from "./lib/snapshots";
import { sessionEventSchema, sessionSchema } from "./schema";

export interface SessionStore {
  sessions: Record<string, Session>;
  start(assessment: AssessmentConfig, challenge: Challenge): string;
  record<T extends keyof EventDataMap>(sessionId: string, event: { type: T; room: Room | 0; text?: string; data?: EventDataMap[T] }): SessionEvent;
  applyCode(sessionId: string, newCode: string, source: "manual" | "ai" | "paste"): void;
  snapshot(sessionId: string, eventId: string, code: string): void;
  addSuggestion(sessionId: string, suggestion: Omit<Suggestion, "id">): Suggestion;
  finish(sessionId: string, reason: "escaped" | "timeout" | "abandoned", finalCode: string): void;
  mergeSessions(sessions: Session[]): number;
}

function nextId(prefix: string, items: { id: string }[]): string {
  return `${prefix}${items.reduce((max, item) => Math.max(max, Number(item.id.slice(1)) || 0), 0) + 1}`;
}

function updatedAt(session: Session): number {
  return Math.max(Date.parse(session.endedAt ?? session.startedAt), Date.parse(session.startedAt) + (session.events.at(-1)?.t ?? 0));
}

export const useSessionStore = create<SessionStore>()(persist((set, get) => {
  const requireSession = (id: string): Session => {
    const session = get().sessions[id];
    if (!session) throw new Error(`Session not found: ${id}`);
    return session;
  };
  const save = (session: Session) => set((state) => ({ sessions: { ...state.sessions, [session.id]: session } }));

  return {
    sessions: {},
    start(assessment, challenge) {
      const id = crypto.randomUUID();
      save({ id, assessmentId: assessment.id, challengeId: challenge.id, aiAssistance: assessment.aiAssistance,
        startedAt: new Date().toISOString(), events: [], snapshots: [], suggestions: [],
        finalCode: challenge.starterCode, lineOrigins: challenge.starterCode.split("\n").map(() => "starter"),
      });
      get().record(id, { type: "session_start", room: 0, data: {
        aiAssistance: assessment.aiAssistance, level: assessment.level, defectType: challenge.defectType,
      } });
      return id;
    },
    record(id, input) {
      const session = requireSession(id);
      if (session.endedAt) throw new Error("Session has ended");
      const event = sessionEventSchema.parse({ ...input, id: nextId("e", session.events),
        t: Math.max(0, Date.now() - Date.parse(session.startedAt), session.events.at(-1)?.t ?? 0),
      });
      const events = [...session.events, event];
      save({ ...session, events, snapshots: compactSnapshots([...session.snapshots,
        { eventId: event.id, t: event.t, code: session.finalCode },
      ], events) });
      return event;
    },
    applyCode(id, newCode, source) {
      const session = requireSession(id);
      if (session.endedAt) return;
      save({ ...session, finalCode: newCode, lineOrigins: applyWithProvenance(session.finalCode, session.lineOrigins, newCode, source) });
    },
    snapshot(id, eventId, code) {
      const session = requireSession(id);
      const event = session.events.find((item) => item.id === eventId);
      if (!event) throw new Error(`Snapshot event not found: ${eventId}`);
      const snapshots = session.snapshots.filter((item) => item.eventId !== eventId);
      save({ ...session, snapshots: compactSnapshots([...snapshots, { eventId, t: event.t, code }], session.events) });
    },
    addSuggestion(id, input) {
      const session = requireSession(id);
      if (session.endedAt) throw new Error("Session has ended");
      const suggestion = { ...input, id: nextId("s", session.suggestions) };
      save({ ...session, suggestions: [...session.suggestions, suggestion] });
      return suggestion;
    },
    finish(id, reason, finalCode) {
      const session = requireSession(id);
      if (session.endedAt) return;
      get().applyCode(id, finalCode, "manual");
      get().record(id, { type: "session_end", room: session.events.at(-1)?.room ?? 0, data: { reason } });
      save({ ...requireSession(id), endedAt: new Date().toISOString(), endReason: reason });
    },
    mergeSessions(incoming) {
      const sessions = { ...get().sessions };
      let count = 0;
      for (const session of z.array(sessionSchema).parse(incoming)) {
        if (!sessions[session.id] || updatedAt(session) > updatedAt(sessions[session.id])) {
          sessions[session.id] = session;
          count++;
        }
      }
      set({ sessions });
      return count;
    },
  };
}, {
  name: "he:sessions", storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ sessions: state.sessions }),
  merge: (persisted, current) => {
    const parsed = z.object({ sessions: z.record(z.string(), sessionSchema) }).strict().parse(persisted);
    return { ...current, sessions: parsed.sessions };
  },
}));

export function findActiveSession(assessmentId: string): Session | null {
  return Object.values(useSessionStore.getState().sessions)
    .filter((session) => session.assessmentId === assessmentId && !session.endedAt)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0] ?? null;
}
