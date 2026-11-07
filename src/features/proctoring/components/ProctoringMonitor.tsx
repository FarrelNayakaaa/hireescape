"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { AssessmentConfig, IntegritySignal, Session } from "@/lib/contracts";
import { listenBrowserSignals } from "../media/browserSignals";
import { listenDevices } from "../media/useMediaStream";
import { createFaceSampler } from "../media/faceSampler";
import { createVoiceMeter } from "../media/voiceMeter";
import { captureSnapshot } from "../media/snapshot";
import { useIntegrityStore } from "../store";
import { foldSignals } from "../lib/integrity";
import type { IntegritySample } from "../lib/samples";
import type { Preparation } from "../schema";
import { IntegrityNotice } from "./IntegrityNotice";
export function ProctoringMonitor({ session, assessment, preparation, stream, video, onPaused }: { session: Session; assessment: AssessmentConfig; preparation: Preparation; stream: MediaStream | null; video: RefObject<HTMLVideoElement | null>; onPaused(paused: boolean): void }) {
  const room = useRef<0 | 1 | 2 | 3>(0); const [signals, setSignals] = useState<IntegritySignal[]>(() => useIntegrityStore.getState().records[session.id]?.signals ?? []);
  useEffect(() => { room.current = session.events.at(-1)?.room ?? 0; }, [session.events]);
  useEffect(() => {
    const store = useIntegrityStore.getState();
    const endT = Math.max(0, Date.parse(session.endedAt ?? new Date().toISOString()) - Date.parse(session.startedAt));
    if (session.endedAt) { store.finish(session.id, endT); return; }
    store.begin(session.id, session.startedAt, assessment.aiAssistance, preparation);
    const now = () => Math.max(0, Date.now() - Date.parse(session.startedAt));
    const append = (sample: IntegritySample) => store.append(session.id, { ...sample, room: room.current });
    const stopBrowser = listenBrowserSignals(append, now);
    append({ kind: "fullscreen", t: now(), active: Boolean(document.fullscreenElement) });
    const flush = () => { store.checkpoint(session.id); store.refresh(session.id, now()); };
    // Hard navigation does not run React cleanup; preserve the final checkpoint first.
    window.addEventListener("pagehide", flush);
    const checkpoint = setInterval(() => store.checkpoint(session.id), 10_000);
    const refresh = setInterval(() => store.refresh(session.id, now()), 30_000);
    const alreadyPhotographed = new Set<string>();
    const hud = setInterval(() => {
      const folded = foldSignals(store.samples(session.id), { endT: now(), faceSignalsEnabled: preparation.mode === "camera_mic" && preparation.calibration.faceOk === true });
      for (const signal of folded) {
        const key = `${signal.type}:${signal.start}`;
        if (!assessment.proctoring.captureSnapshots || preparation.consent !== "given" || preparation.mode !== "camera_mic" || alreadyPhotographed.has(key) || !["face_absent", "multiple_faces"].includes(signal.type)) continue;
        alreadyPhotographed.add(key); const image = captureSnapshot(video.current); if (image) store.attachSnapshot(session.id, key, image);
      }
      setSignals(folded);
    }, 1000);
    return () => { window.removeEventListener("pagehide", flush); clearInterval(checkpoint); clearInterval(refresh); clearInterval(hud); stopBrowser(); flush(); };
  }, [assessment.aiAssistance, assessment.proctoring.captureSnapshots, preparation, session.id, session.startedAt, session.endedAt, video]);
  useEffect(() => {
    if (session.endedAt || preparation.mode !== "camera_mic" || !stream) return;
    const store = useIntegrityStore.getState(), now = () => Math.max(0, Date.now() - Date.parse(session.startedAt));
    const sample = (value: IntegritySample) => store.append(session.id, { ...value, room: room.current });
    const stopDevices = listenDevices(stream, (state) => { sample({ kind: "device", t: now(), ...state }); onPaused(!state.camera); });
    let alive = true, stopFace: (() => void) | undefined, stopVoice: (() => void) | undefined;
    if (preparation.calibration.faceOk === true && video.current) void createFaceSampler(video.current, sample, now, () => onPaused(true)).then((stop) => { if (alive) stopFace = stop; else stop(); }).catch(() => onPaused(true));
    if (preparation.calibration.noiseFloor !== null) { try { stopVoice = createVoiceMeter(stream, preparation.calibration.noiseFloor, sample, now); } catch { onPaused(true); } }
    return () => { alive = false; stopDevices(); stopFace?.(); stopVoice?.(); };
  }, [preparation, session.id, session.startedAt, session.endedAt, stream, video, onPaused]);
  return <IntegrityNotice signals={signals} locale={assessment.locale} />;
}
