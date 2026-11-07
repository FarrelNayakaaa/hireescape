"use client";
import Image from "next/image";
import type { IntegrityRecord, IntegritySignalType } from "@/lib/contracts";
import { Button } from "@/components/ui";
import { REVIEW_THRESHOLDS } from "../lib/integrity";
import { useIntegrityStore } from "../store";
import { copy } from "../lib/copy";
const labels: Record<IntegritySignalType, string> = { tab_hidden: "tab hidden", window_blur: "window unfocused", fullscreen_exit: "outside fullscreen", face_absent: "no face visible", multiple_faces: "multiple faces visible", voice_activity: "voice activity", camera_off: "camera off", mic_off: "microphone off" };
export function IntegrityReport({ sessionId, record: supplied, locale = "en", onSeek }: { sessionId: string; record?: IntegrityRecord; locale?: "en" | "id"; onSeek?: (time: number) => void }) {
  const stored = useIntegrityStore((state) => state.records[sessionId]); const record = stored ?? supplied;
  if (!record || record.sessionId !== sessionId) return null;
  const end = Math.max(1, ...record.signals.map((signal) => signal.end));
  return <section className="space-y-4 border border-he-border bg-he-surface p-5 text-he-muted" aria-label={copy(locale, "report")}>
    <p>{copy(locale, "mode")}: {record.mode} · {copy(locale, "consentLabel")}: {record.consent}</p>
    <p>{copy(locale, "face")}: {record.calibration.faceOk === null ? copy(locale, "notRequired") : String(record.calibration.faceOk)} · {copy(locale, "noise")}: {record.calibration.noiseFloor ?? copy(locale, "disabled")} · {copy(locale, "fullscreen")}: {String(record.calibration.fullscreen)}</p>
    {record.summary.reviewSuggested && <div role="note" className="rounded border border-he-muted p-3"><strong>{copy(locale, "review")}</strong>{Object.entries(REVIEW_THRESHOLDS).filter(([type, threshold]) => (record.summary.totalsMs[type as IntegritySignalType] ?? 0) > threshold).map(([type, threshold]) => <p key={type}>{labels[type as IntegritySignalType]} {Math.round((record.summary.totalsMs[type as IntegritySignalType] ?? 0) / 1000)} s (threshold {threshold / 1000} s)</p>)}</div>}
    <ul className="space-y-3">{record.signals.map((signal) => <li key={signal.id}><div className="relative h-3 rounded bg-he-surface-2" aria-hidden="true"><span className="absolute h-3 min-w-1 rounded bg-he-muted" style={{ left: `${signal.start / end * 100}%`, width: `${signal.durationMs / end * 100}%` }} /></div><button type="button" disabled={!onSeek} onClick={() => onSeek?.(signal.start)} className="min-h-10 text-left text-sm underline" title={copy(locale, "replay")}>{labels[signal.type]} · {copy(locale, "start")}: {(signal.start / 1000).toFixed(1)} s · {copy(locale, "duration")}: {(signal.durationMs / 1000).toFixed(1)} s</button>
      {signal.snapshot && <Image unoptimized src={signal.snapshot} alt={`${labels[signal.type]} at ${signal.start / 1000}s`} width={160} height={120} />}
    </li>)}</ul>
    {record.signals.some((signal) => signal.snapshot) && stored && <Button variant="secondary" onClick={() => useIntegrityStore.getState().deleteSnapshots(sessionId)}>{copy(locale, "delete")}</Button>}
    <h3>{copy(locale, "caveats")}</h3><ul>{record.summary.caveats.map((text) => <li key={text}>{text}</li>)}</ul>
  </section>;
}
