// integrity.js — pure, dependency-free folding of proctoring samples into integrity signals.
// Browser code (MediaPipe face detector, Web Audio meter, visibility/fullscreen listeners) produces
// raw samples; THIS file turns them into neutral, time-bounded signals and a summary.
// No model is involved. Same input → same output (unit-testable in Node).

/**
 * Sample shapes (t = ms since session start):
 *  { t, kind: "face",  faces: number, confidence: number }     // 1 per second from the face detector
 *  { t, kind: "voice", active: boolean }                       // 1 per second from the audio meter
 *  { t, kind: "visibility", hidden: boolean }                  // on visibilitychange
 *  { t, kind: "focus", focused: boolean }                      // on window focus/blur
 *  { t, kind: "fullscreen", active: boolean }                  // on fullscreenchange
 *  { t, kind: "device", camera: boolean, mic: boolean }        // track ended / muted / restored
 */

export const DEFAULT_RULES = {
  faceAbsentMinMs: 5000,     // 0 faces for >= 5s → face_absent
  multipleFacesMinMs: 3000,  // >= 2 faces for >= 3s → multiple_faces
  voiceMinMs: 4000,          // voice active for >= 4s → voice_activity (neutral: many people think aloud)
  focusLossMinMs: 2000,      // ignore blur/hidden shorter than 2s (notifications, alt-tab slips)
  sampleGapMs: 1500,         // a gap larger than this between face/voice samples closes a run
};

// Generic run-length folding: condition(sample) true for a continuous stretch → one interval.
function foldRuns(samples, condition, minMs, gapMs) {
  const out = [];
  let start = null, last = null;
  const close = () => {
    if (start !== null && last - start >= minMs) out.push({ start, end: last });
    start = null; last = null;
  };
  for (const s of samples) {
    if (last !== null && s.t - last > gapMs) close();
    if (condition(s)) { if (start === null) start = s.t; last = s.t; }
    else if (start !== null) { last = s.t; close(); }
  }
  close();
  return out;
}

// Toggle folding: on/off events (visibility, focus, fullscreen, device) → intervals of the "bad" state.
function foldToggles(events, isBad, minMs, endT) {
  const out = [];
  let start = null;
  for (const e of events) {
    if (isBad(e) && start === null) start = e.t;
    else if (!isBad(e) && start !== null) { if (e.t - start >= minMs) out.push({ start, end: e.t }); start = null; }
  }
  if (start !== null && endT - start >= minMs) out.push({ start, end: endT });
  return out;
}

export function foldSignals(samples, { endT, rules = DEFAULT_RULES, faceSignalsEnabled = true } = {}) {
  const by = (k) => samples.filter((s) => s.kind === k).sort((a, b) => a.t - b.t);
  const face = by("face"), voice = by("voice");
  const signals = [];
  const push = (type, iv) => signals.push({ type, start: iv.start, end: iv.end, durationMs: iv.end - iv.start });

  if (faceSignalsEnabled) {
    foldRuns(face, (s) => s.faces === 0, rules.faceAbsentMinMs, rules.sampleGapMs).forEach((iv) => push("face_absent", iv));
    foldRuns(face, (s) => s.faces >= 2, rules.multipleFacesMinMs, rules.sampleGapMs).forEach((iv) => push("multiple_faces", iv));
  }
  foldRuns(voice, (s) => s.active, rules.voiceMinMs, rules.sampleGapMs).forEach((iv) => push("voice_activity", iv));
  foldToggles(by("visibility"), (e) => e.hidden, rules.focusLossMinMs, endT).forEach((iv) => push("tab_hidden", iv));
  foldToggles(by("focus"), (e) => !e.focused, rules.focusLossMinMs, endT).forEach((iv) => push("window_blur", iv));
  foldToggles(by("fullscreen"), (e) => !e.active, rules.focusLossMinMs, endT).forEach((iv) => push("fullscreen_exit", iv));
  foldToggles(by("device"), (e) => !e.camera, 0, endT).forEach((iv) => push("camera_off", iv));
  foldToggles(by("device"), (e) => !e.mic, 0, endT).forEach((iv) => push("mic_off", iv));

  signals.sort((a, b) => a.start - b.start);
  return signals.map((s, i) => ({ id: `i${i + 1}`, ...s }));
}

// Deterministic "review suggested" thresholds. This is a prompt for a HUMAN to look, never a verdict.
export const REVIEW_THRESHOLDS = {
  tab_hidden: 60_000,       // > 60s total away from the tab
  window_blur: 120_000,
  face_absent: 120_000,
  multiple_faces: 5_000,
  camera_off: 30_000,
};

export function summarizeIntegrity(signals, { aiAssistance = false } = {}) {
  const totals = {};
  const counts = {};
  for (const s of signals) {
    totals[s.type] = (totals[s.type] || 0) + s.durationMs;
    counts[s.type] = (counts[s.type] || 0) + 1;
  }
  const reasons = Object.entries(REVIEW_THRESHOLDS)
    .filter(([type, ms]) => (totals[type] || 0) > ms)
    .map(([type, ms]) => `${type} total ${Math.round(totals[type] / 1000)}s exceeds ${ms / 1000}s`);
  const caveats = [
    "Signals are observations, not proof of misconduct.",
    "Voice activity is common when people think aloud.",
  ];
  if (aiAssistance) caveats.push("AI assistance was allowed in-app; leaving the tab may have been for documentation.");
  return { counts, totalsMs: totals, reviewSuggested: reasons.length > 0, reasons, caveats };
}
