"use client";
import { useEffect, useRef, useState } from "react";
import type { AssessmentConfig } from "@/lib/contracts";
import { AccentCard, Button, StepList } from "@/components/ui";
import { ConsentScreen } from "./ConsentScreen";
import { createFaceSampler, faceCalibration, type FaceBox } from "../media/faceSampler";
import { calibrateMicrophone } from "../media/voiceMeter";
import type { FaceSample } from "../lib/samples";
import type { Preparation } from "../schema";
import { preparationFingerprint } from "../store";
import { copy } from "../lib/copy";
import type { useMediaStream } from "../media/useMediaStream";
type Step = "consent" | "requesting" | "camera" | "microphone" | "ready" | "blocked";
export function SecurityCheck({ assessment, media, onReady }: { assessment: AssessmentConfig; media: ReturnType<typeof useMediaStream>; onReady(preparation: Preparation): void }) {
  const locale = assessment.locale, config = assessment.proctoring;
  const [step, setStep] = useState<Step>(config.mode === "camera_mic" ? "consent" : "ready");
  const [consent, setConsent] = useState<Preparation["consent"]>("not_required"), [consentAt, setConsentAt] = useState<string | undefined>();
  const [entering, setEntering] = useState(false); const enterPending = useRef(false);
  const [mode, setMode] = useState<Preparation["mode"]>(config.mode === "camera_mic" ? "camera_mic" : "browser");
  const [faceOk, setFaceOk] = useState<boolean | null>(null), [noiseFloor, setNoiseFloor] = useState<number | null>(null), [count, setCount] = useState(0), [attempt, setAttempt] = useState(1);
  const [boxes, setBoxes] = useState<FaceBox[]>([]), [level, setLevel] = useState(0);
  const [micPhase, setMicPhase] = useState<"quiet" | "speak" | null>(null), [micFailed, setMicFailed] = useState(false), [missing, setMissing] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null), micCancel = useRef<(() => void) | null>(null), agreeing = useRef(false), active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; micCancel.current?.(); }; }, []);
  useEffect(() => { if (video.current && media.stream) video.current.srcObject = media.stream; }, [media.stream, step]);
  useEffect(() => {
    if (step !== "camera" || !media.stream || !video.current) return;
    let alive = true, stop: (() => void) | undefined, tries = 1; let samples: FaceSample[] = [];
    const advance = (passed: boolean) => { if (alive) { setFaceOk(passed); setStep("microphone"); } };
    const timeout = setTimeout(() => advance(false), 20_000);
    void createFaceSampler(video.current, (sample) => {
      if (!alive) return; samples.push(sample); setCount(samples.length);
      if (samples.length < 5) return;
      if (faceCalibration(samples)) advance(true);
      else if (tries++ >= 3) advance(false);
      else { samples = []; setCount(0); setAttempt(tries); }
    }, () => performance.now(), () => advance(false), setBoxes).then((dispose) => { if (!alive) dispose(); else stop = dispose; }).catch(() => advance(false));
    return () => { alive = false; clearTimeout(timeout); stop?.(); };
  }, [media.stream, step]);
  const agree = async () => {
    if (agreeing.current) return; agreeing.current = true; setConsent("given"); setConsentAt(new Date().toISOString()); setStep("requesting");
    try { await media.request(); if (active.current) setStep("camera"); }
    catch { if (active.current) { setMissing(true); setMode("browser"); setStep(config.required ? "blocked" : "ready"); } }
    finally { agreeing.current = false; }
  };
  const decline = () => { media.stop(); setConsent("declined"); setConsentAt(new Date().toISOString()); setMode("browser"); setStep(config.required ? "blocked" : "ready"); };
  const microphone = async () => {
    if (!media.stream || micPhase) return;
    try { const calibration = calibrateMicrophone(media.stream, setMicPhase, setLevel); micCancel.current = calibration.cancel; const result = await calibration.promise; if (active.current) { setNoiseFloor(result.voiceDetected ? result.noiseFloor : null); setMicFailed(!result.voiceDetected); if (!result.voiceDetected && faceOk !== true) { setMode("browser"); media.stop(); } setStep("ready"); } }
    catch { if (active.current) { setMicFailed(true); setStep("ready"); } }
  };
  const enter = async () => {
    if (enterPending.current) return; enterPending.current = true; setEntering(true);
    let fullscreen = false; try { await document.documentElement.requestFullscreen(); fullscreen = true; } catch { /* Refusal is allowed and recorded as one observation. */ }
    if (active.current) onReady({ assessmentId: assessment.id, fingerprint: preparationFingerprint(config), mode, consent, ...(consentAt ? { consentAt } : {}), calibration: { faceOk, noiseFloor, fullscreen } });
    enterPending.current = false; if (active.current) setEntering(false);
  };
  if (step === "consent") return <ConsentScreen locale={locale} captureSnapshots={config.captureSnapshots} onAgree={() => void agree()} onDecline={decline} />;
  if (step === "blocked") return <AccentCard><h1>{copy(locale, "accommodation")}</h1><Button variant="secondary" onClick={() => { setMissing(false); setStep("consent"); }}>{copy(locale, "retry")}</Button></AccentCard>;
  const steps = mode === "browser" ? ["consentStep", "fullscreen"] as const : ["consentStep", "camera", "microphone", "fullscreen"] as const;
  const current = mode === "browser" ? 1 : step === "requesting" || step === "camera" ? 1 : step === "microphone" ? 2 : 3;
  return <AccentCard accent="neutral" className="mx-auto max-w-2xl space-y-5"><h1>{copy(locale, "security")}</h1><StepList steps={steps.map((label, index) => ({ id: label, label: copy(locale, label), status: index < current ? "done" : index === current ? "active" : "pending" }))} />
    {mode === "browser" && <p>{copy(locale, "browserInfo")}</p>}
    {step === "requesting" && <><p role="status">{copy(locale, "requesting")}</p>{!config.required && <Button variant="secondary" onClick={() => { media.stop(); setMode("browser"); setStep("ready"); }}>{copy(locale, "browserOnly")}</Button>}</>}
    {step === "camera" && <><div className="relative h-60 w-80"><video ref={video} muted playsInline autoPlay width={320} height={240} className="h-60 w-80 rounded-xl border-2 border-he-muted" /><svg viewBox="0 0 320 240" className="pointer-events-none absolute inset-0" aria-hidden="true">{boxes.map((box, index) => <rect key={index} {...box} fill="none" stroke="var(--he-blue)" strokeWidth={2} />)}</svg></div><p role="status">{copy(locale, "checkingFace")} · {count}/5 · {attempt}/3</p></>}
    {faceOk === false && <p>{copy(locale, "faceDisabled")}</p>}{missing && <p>{copy(locale, "cameraMissing")}</p>}
    {step === "microphone" && <><p role="status">{copy(locale, micPhase === "speak" ? "speak" : "quiet")}</p><div role="meter" aria-label={copy(locale, "microphone")} aria-valuemin={0} aria-valuemax={12} aria-valuenow={Math.round(level * 12)} className="flex gap-1">{Array.from({ length: 12 }, (_, index) => <span key={index} className={`h-8 w-3 rounded ${index < Math.round(level * 12) ? "bg-he-blue" : "bg-he-surface-2"}`} />)}</div><Button onClick={() => void microphone()} disabled={micPhase !== null}>{copy(locale, "micStart")}</Button></>}
    {micFailed && <p>{copy(locale, "micDisabled")}</p>}{step === "ready" && <Button loading={entering} onClick={() => void enter()}>{copy(locale, "enter")}</Button>}
  </AccentCard>;
}
