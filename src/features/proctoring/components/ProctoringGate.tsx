"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AssessmentConfig, Session } from "@/lib/contracts";
import { useMediaStream } from "../media/useMediaStream";
import { useIntegrityStore, preparationFingerprint } from "../store";
import type { Preparation } from "../schema";
import { SecurityCheck } from "./SecurityCheck";
import { ProctoringMonitor } from "./ProctoringMonitor";
import { IntegrityContext } from "./context";
export function ProctoringGate({ assessment, session, children }: { assessment: AssessmentConfig; session: Session | null; children: ReactNode }) {
  const saved = useIntegrityStore((state) => state.preparations[assessment.id]); const media = useMediaStream();
  const [paused, setPaused] = useState(false); const video = useRef<HTMLVideoElement | null>(null), restoreRequested = useRef(false);
  const sessionId = session?.id;
  const enabled = assessment.proctoring.mode !== "off";
  const preparation = useMemo<Preparation | null>(() => {
    if (!enabled) return null;
    if (saved?.fingerprint === preparationFingerprint(assessment.proctoring)) return saved;
    // Existing sessions predate this feature; never add retroactive media consent.
    return sessionId ? { assessmentId: assessment.id, fingerprint: preparationFingerprint(assessment.proctoring), mode: "browser", consent: "not_required", calibration: { faceOk: null, noiseFloor: null, fullscreen: null } } : null;
  }, [enabled, saved, assessment.id, assessment.proctoring, sessionId]);
  const { request, stop, stream } = media;
  useEffect(() => { if (video.current) video.current.srcObject = stream; }, [stream]);
  useEffect(() => {
    if (session?.endedAt) { queueMicrotask(stop); return; }
    if (!enabled || preparation?.mode !== "camera_mic" || preparation.consent !== "given" || stream || restoreRequested.current) return;
    restoreRequested.current = true; queueMicrotask(() => { void request().catch(() => setPaused(true)); });
  }, [enabled, preparation, request, session?.endedAt, stop, stream]);
  if (!enabled) return <>{children}</>;
  if (!preparation && !session?.endedAt) return <SecurityCheck assessment={assessment} media={media} onReady={(value) => useIntegrityStore.getState().prepare(value)} />;
  return <IntegrityContext value={{ stream, preparation, locale: assessment.locale, paused, retryMedia: () => { void request().then(() => setPaused(false)).catch(() => setPaused(true)); } }}>
    {!session?.endedAt && preparation?.mode === "camera_mic" && <video ref={video} muted playsInline autoPlay className="pointer-events-none fixed -left-[10000px] h-60 w-80" aria-hidden="true" />}
    {session && preparation && <ProctoringMonitor session={session} assessment={assessment} preparation={preparation} stream={stream} video={video} onPaused={setPaused} />}
    {children}
  </IntegrityContext>;
}
