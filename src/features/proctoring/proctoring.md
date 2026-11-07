# features/proctoring — AGENTS.md (camera, microphone & browser integrity signals)

> **Owner: Dev B** · **Tier 3** (build only after Integration 2 passes; browser-only signals first) · Consumed by: Dev A's `report` through `IntegrityReport` + `getIntegrityRecord` (H10).

> Inherits the root `AGENTS.md`. Proctoring produces **integrity signals for a human reviewer**:
> neutral, time-bounded observations such as "no face visible for 47s" or "tab hidden for 1m12s".
> It never accuses, never auto-rejects, and never feeds the Analyst.
>
> Everything runs **in the candidate's browser**. Raw video and audio are **never recorded, never
> uploaded, and never sent to any Codex agent**. Only derived signals (type, start, end) are stored.

---

## Build order (Tier 3)

1. Browser-only signals (`browserSignals.ts`, `integrity.ts` + tests, store, `IntegrityReport`) — about 30 minutes.
2. Consent + Room 0 Security Check + `IntegrityHud`.
3. Camera face presence (MediaPipe) and mic voice activity.

If Integration 2 (13:30) has not passed, skip this feature and say "browser-only signals" or nothing in the writeup.

## 🔒 Proctoring principles (no other file may override)

1. **Consent first.** Camera/mic start only after an explicit consent screen that says what is
   collected, why, where it is stored, who sees it, and how long it is kept.
2. **Detection, not recognition.** We detect *whether* and *how many* faces are visible. We never
   identify who the person is, never store face embeddings/templates, never estimate emotion,
   attention, age, gender, or ethnicity.
3. **Signals, not verdicts.** The report shows signals with caveats and an optional "Review suggested"
   flag from deterministic thresholds. A human decides. Integrity signals never change competency levels.
4. **Isolation from evaluation.** Integrity signals are stored separately from session events. They are
   excluded from `compactSession()` and are never sent to the Analyst, Inquisitor, or Assistant.
5. **Transparency to the candidate.** The candidate sees the live status HUD and gets a gentle in-app
   notice when a signal starts (e.g. "We can't see you — is your camera covered?").
6. **Fairness by calibration.** Face signals are enabled only if the detector works reliably for *this*
   candidate in *their* lighting during the pre-check. Otherwise face signals are disabled for the session
   and the report says so. (Face detectors can perform worse in low light, with some skin tones, glasses,
   or head coverings such as hijab — calibration prevents penalising people for the model's limits.)
7. **No claim of AI-tool detection.** A hidden tab is reported as "tab hidden", never as "used ChatGPT".

> Legal note for the pitch/Q&A: Indonesia's Personal Data Protection Law (UU PDP No. 27/2022) treats
> biometric data as a specific category of personal data. Our design avoids biometric identification
> entirely and keeps media on-device; a production rollout still needs legal review, a retention policy,
> and an accommodations process.

---

## Modes (set by the hiring manager per assessment)

| `ProctoringConfig.mode` | Collects | Use when |
|---|---|---|
| `off` | nothing | trust-based or take-home style |
| `browser` | tab visibility, window focus, fullscreen exits, large external pastes | default; zero hardware, zero media |
| `camera_mic` | everything in `browser` + face presence/count (camera) + voice activity level (mic) | AI-OFF assessments where integrity matters most |

Other config:
- `required: boolean` — if true and the candidate declines consent or has no camera, they cannot start
  and see "Contact the hiring team for an alternative arrangement" (accommodation path). If false,
  they continue in `browser` mode and `consent_declined` is recorded **neutrally**.
- `captureSnapshots: boolean` (default **false**) — if true, a single 160×120 JPEG thumbnail is taken
  at the *start* of a `multiple_faces` or `face_absent` signal (max 10 per session), stored locally only,
  visible only on the report, deletable by the manager. Never for `voice_activity` or browser signals.

---

## Libraries (existing only — no custom ML)

| Need | Library / API | Notes |
|---|---|---|
| Camera + mic access | `navigator.mediaDevices.getUserMedia` (browser built-in) | Requires HTTPS (Vercel) or localhost. |
| Face presence & count | **`@mediapipe/tasks-vision`** → `FaceDetector` with the `blaze_face_short_range` model | Google MediaPipe, Apache-2.0. Runs fully in-browser (WASM/GPU). |
| Voice activity | **Web Audio API** `AudioContext` + `AnalyserNode` (built-in) | RMS level vs. calibrated noise floor. Optional upgrade: `@ricky0123/vad-web` (Silero VAD) if time allows — not required. |
| Tab / focus | Page Visibility API (`visibilitychange`), `window` `blur`/`focus` | Built-in. |
| Fullscreen | Fullscreen API (`requestFullscreen`, `fullscreenchange`) | Built-in. |
| Signal folding & summary | `starter-kit/proctoring/integrity.js` (ours, tested) | Pure; port to `lib/integrity.ts`. |

### Self-host MediaPipe assets (demo must not depend on a CDN)

```bash
pnpm add @mediapipe/tasks-vision
# copy the WASM runtime into /public so it's served by our own app
mkdir -p public/mediapipe && cp -r node_modules/@mediapipe/tasks-vision/wasm public/mediapipe/wasm
# download the face model ONCE and commit it (small file)
curl -L -o public/mediapipe/blaze_face_short_range.tflite \
  https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
```

Add a `postinstall` script that re-copies the WASM folder so it always matches the installed package version.

### Required headers (`next.config.ts`)

```ts
async headers() {
  return [{ source: "/:path*", headers: [
    { key: "Permissions-Policy", value: "camera=(self), microphone=(self), fullscreen=(self)" },
  ]}];
}
```

---

## Files

```text
features/proctoring/
  store.ts                    zustand (persist key "he:integrity") — separate from session store
  lib/integrity.ts            port of starter-kit/proctoring/integrity.js (foldSignals, summarizeIntegrity)
  lib/thresholds.ts           DEFAULT_RULES + REVIEW_THRESHOLDS (re-exported, single place to tune)
  media/useMediaStream.ts     getUserMedia lifecycle, device lost/restored → "device" samples
  media/faceSampler.ts        MediaPipe FaceDetector init + 1 fps sampling loop → "face" samples
  media/voiceMeter.ts         AnalyserNode RMS → "voice" samples (1 per second)
  media/browserSignals.ts     visibility / focus / fullscreen listeners → samples
  media/snapshot.ts           optional thumbnail capture (only if captureSnapshots)
  components/ConsentScreen.tsx
  components/SecurityCheck.tsx     "Room 0" pre-check (gamified, see ui AGENTS.md)
  components/IntegrityHud.tsx      camera bubble + shield status in the room header
  components/IntegrityNotice.tsx   gentle toast when a signal starts
  components/IntegrityReport.tsx   report section (used by features/report)
  __tests__/integrity.test.ts  __tests__/thresholds.test.ts
```

---

## Reference implementation (browser parts)

### Face sampler (1 fps — `detectForVideo` blocks the main thread, so never run it per frame)

```ts
"use client";
import { FilesetResolver, FaceDetector } from "@mediapipe/tasks-vision";

export async function createFaceSampler(video: HTMLVideoElement, onSample: (s: FaceSample) => void, now: () => number) {
  const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const detector = await FaceDetector.createFromOptions(vision, {
    baseOptions: { modelAssetPath: "/mediapipe/blaze_face_short_range.tflite", delegate: "GPU" },
    runningMode: "VIDEO",
    minDetectionConfidence: 0.5,
  });
  const id = window.setInterval(() => {
    if (video.readyState < 2) return;                       // no frame yet
    const res = detector.detectForVideo(video, performance.now());
    const confidence = Math.max(0, ...res.detections.map((d) => d.categories[0]?.score ?? 0));
    onSample({ t: now(), kind: "face", faces: res.detections.length, confidence });
  }, 1000);
  return () => { window.clearInterval(id); detector.close(); };
}
```

- Video element: `muted playsInline autoPlay`, constraints `{ video: { width: 320, height: 240, facingMode: "user" } }`
  (small resolution = fast detection, enough for presence/count).
- If GPU delegate init fails, retry with `delegate: "CPU"`.

### Voice meter

```ts
export function createVoiceMeter(stream: MediaStream, noiseFloor: number, onSample: (s: VoiceSample) => void, now: () => number) {
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);    // NOT connected to destination: no playback, no recording
  const buf = new Float32Array(analyser.fftSize);
  let activeMs = 0;
  const tick = window.setInterval(() => {                   // 5 Hz measurement, 1 Hz sample
    analyser.getFloatTimeDomainData(buf);
    const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length);
    activeMs += rms > noiseFloor * 3 ? 200 : 0;
  }, 200);
  const emit = window.setInterval(() => {
    onSample({ t: now(), kind: "voice", active: activeMs >= 600 });  // ≥ 60% of the last second
    activeMs = 0;
  }, 1000);
  return () => { clearInterval(tick); clearInterval(emit); ctx.close(); };
}
```

### Browser signals

```ts
export function listenBrowserSignals(onSample: (s: BrowserSample) => void, now: () => number) {
  const vis = () => onSample({ t: now(), kind: "visibility", hidden: document.hidden });
  const blur = () => onSample({ t: now(), kind: "focus", focused: false });
  const focus = () => onSample({ t: now(), kind: "focus", focused: true });
  const fs = () => onSample({ t: now(), kind: "fullscreen", active: !!document.fullscreenElement });
  document.addEventListener("visibilitychange", vis);
  window.addEventListener("blur", blur); window.addEventListener("focus", focus);
  document.addEventListener("fullscreenchange", fs);
  return () => { /* remove all four listeners */ };
}
```

Note: focusing the Monaco editor or a modal inside the page does **not** fire `window.blur`, so in-app
interaction is never flagged. Large external pastes are already recorded by `features/session` as
`paste` events; the integrity report reads the count from there instead of duplicating it.

### Folding

Raw samples are kept in memory (and persisted every 10s for reload safety). At session end — and
every 30s for the live HUD — call `foldSignals(samples, { endT, faceSignalsEnabled })` then
`summarizeIntegrity(signals, { aiAssistance })`. Store `signals` + `summary`; **discard raw samples at
session end**.

---

## Security Check ("Room 0") — runs before the rules screen when mode ≠ off

| Step | What happens | Pass condition |
|---|---|---|
| 1 Consent | Plain-language consent (see copy below); "I agree" / "I don't agree" | explicit click |
| 2 Camera | Live preview in a neon frame; face box drawn from the detector | ≥ 1 face in ≥ 4 of 5 samples with mean confidence ≥ 0.7 |
| 3 Microphone | "Stay quiet for 3 seconds" → measure `noiseFloor` (median RMS); then "Say *siap!*" → level bar jumps | speech RMS > 3× floor |
| 4 Fullscreen | "Enter the vault" button → `requestFullscreen()` | fullscreen active (if refused: allowed, recorded once) |

If step 2 fails after 3 tries: continue with `faceSignalsEnabled = false` and record
`calibration: { faceOk: false }`. The candidate sees "Camera check couldn't confirm your face clearly —
that's okay, you can continue." Never block a candidate because of detector quality.

Consent copy (EN):
> "This assessment uses your camera and microphone to create **integrity signals** for a human reviewer:
> whether a face is visible, how many faces are visible, whether there is sustained voice activity, and
> when you leave this tab. **No video or audio is recorded or uploaded.** Signals are stored with your
> assessment and shown only to the hiring team. They are never used to score your skills, and nothing is
> decided automatically."

---

## Live HUD (in the room header)

- Small circular camera bubble (64px) with a neon ring: green = all good, yellow = a signal is active,
  grey = signal type disabled. Candidate can **minimise** it to a dot (does not stop sampling).
- Shield icon + text: "Integrity: active" / "Camera paused" / "Browser-only".
- Toast (`IntegrityNotice`) when a signal *starts* (once per signal, not repeatedly):
  - face_absent: "We can't see you — is your camera covered or off-frame?"
  - multiple_faces: "We see more than one person. If someone joined you, that's noted for the reviewer."
  - tab_hidden (on return): "Welcome back — time away from this tab is noted for the reviewer."
  - No toast for voice_activity (thinking aloud is normal and shouldn't feel monitored).

---

## Contracts (add to `src/lib/contracts.ts`)

```ts
export type ProctoringMode = "off" | "browser" | "camera_mic";
export interface ProctoringConfig { mode: ProctoringMode; required: boolean; captureSnapshots: boolean }

export type IntegritySignalType =
  | "tab_hidden" | "window_blur" | "fullscreen_exit"
  | "face_absent" | "multiple_faces" | "voice_activity"
  | "camera_off" | "mic_off";

export interface IntegritySignal {
  id: string;                 // "i1", "i2"… (separate namespace from session events "e1"…)
  type: IntegritySignalType;
  start: number; end: number; durationMs: number;   // ms since session start
  room?: Room | 0;
  snapshot?: string;          // data:image/jpeg;base64,… only if captureSnapshots
}

export interface IntegrityRecord {
  sessionId: string;
  mode: ProctoringMode;
  consent: "given" | "declined" | "not_required";
  consentAt?: string;
  calibration: { faceOk: boolean | null; noiseFloor: number | null; fullscreen: boolean | null };
  signals: IntegritySignal[];
  summary: {
    counts: Partial<Record<IntegritySignalType, number>>;
    totalsMs: Partial<Record<IntegritySignalType, number>>;
    reviewSuggested: boolean;
    reasons: string[];
    caveats: string[];
  };
}
```

`AssessmentConfig` gains `proctoring: ProctoringConfig`.

---

## Report section ("Integrity signals" — rendered by `features/report`)

- Placed **after** the human decision context, visually separate (neutral grey accent, not red).
- Header line: mode, consent state, calibration result.
- If `reviewSuggested`: a neutral banner "Review suggested: tab hidden 77s (threshold 60s)" — never
  "Suspicious" or "Cheating".
- Timeline strip aligned with the replay scrubber: signal intervals as thin bars; clicking a bar jumps the
  replay to that moment, so the reviewer sees what the candidate was doing in the editor at the time.
- Snapshots (if enabled) as small thumbnails with a "Delete snapshots" button.
- Caveats always visible.

---

## Definition of Done

- [ ] `integrity.test.ts`: face_absent / multiple_faces / voice thresholds, short focus losses ignored,
      open intervals closed at `endT`, sample gaps close runs, `reviewSuggested` thresholds.
- [ ] Mode `off` → no permission prompt ever appears.
- [ ] Mode `browser` → no camera/mic prompt; tab switching produces a signal.
- [ ] Mode `camera_mic` → covering the camera for 10s produces one `face_absent`; a second person in frame produces `multiple_faces`.
- [ ] Revoking camera permission mid-session → `camera_off`, session continues.
- [ ] Network tab shows **zero** requests containing media during the session.
- [ ] `compactSession()` output contains no integrity data (unit test).
