"use client";

import { z } from "zod";
import type { Session } from "@/lib/contracts";
import { useSessionStore } from "./store";
import { sessionSchema } from "./schema";

export { useSessionStore, findActiveSession } from "./store";
export { useEditorRecorder } from "./hooks/useEditorRecorder";
export type { EditorRecorder } from "./hooks/useEditorRecorder";
export { applyWithProvenance, provenanceMetrics, diffLineOps } from "./lib/provenance";
export type { Session, SessionEvent, Origin } from "@/lib/contracts";

export function getSession(id: string): Session | null {
  return useSessionStore.getState().sessions[id] ?? null;
}

export function listSessions(): Session[] {
  return Object.values(useSessionStore.getState().sessions);
}

export function exportSessions(): Session[] {
  return structuredClone(listSessions());
}

export function importSessions(raw: unknown): number {
  return useSessionStore.getState().mergeSessions(z.array(sessionSchema).parse(raw));
}
