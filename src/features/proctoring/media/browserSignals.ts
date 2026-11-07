import type { BrowserSample } from "../lib/samples";
export function listenBrowserSignals(onSample: (sample: BrowserSample) => void, now: () => number) {
  const visibility = () => onSample({ kind: "visibility", t: now(), hidden: document.hidden });
  const blur = () => onSample({ kind: "focus", t: now(), focused: false });
  const focus = () => onSample({ kind: "focus", t: now(), focused: true });
  const fullscreen = () => onSample({ kind: "fullscreen", t: now(), active: Boolean(document.fullscreenElement) });
  document.addEventListener("visibilitychange", visibility); window.addEventListener("blur", blur); window.addEventListener("focus", focus); document.addEventListener("fullscreenchange", fullscreen);
  visibility();
  return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("blur", blur); window.removeEventListener("focus", focus); document.removeEventListener("fullscreenchange", fullscreen); };
}
