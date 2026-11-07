"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";
import { readStoredTheme } from "./theme";

export type Theme = "default" | "retro";
export const viewportQuery = "(min-width: 768px)";
const motionQuery = "(prefers-reduced-motion: reduce)";
const serverSnapshot = { ready: false, supported: false, admitted: false, theme: "default" as Theme, reducedMotion: true };
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();
let lastApplicationFocus: HTMLElement | null = null;
let detach: (() => void) | undefined;

function publish(next: typeof snapshot) {
  if (Object.keys(next).every((key) => next[key as keyof typeof next] === snapshot[key as keyof typeof snapshot])) return;
  snapshot = next;
  for (const listener of listeners) listener();
}

function initialize() {
  const width = window.matchMedia?.(viewportQuery);
  const motion = window.matchMedia?.(motionQuery);
  let theme = snapshot.theme;
  if (!snapshot.ready) {
    theme = readStoredTheme(() => localStorage.getItem("he-theme"));
  }
  document.documentElement.dataset.theme = theme;
  const update = () => {
    const supported = width?.matches ?? window.innerWidth >= 768;
    if (snapshot.supported && !supported) {
      const active = document.activeElement;
      lastApplicationFocus = active instanceof HTMLElement && active.closest("[data-he-application]") ? active : null;
    }
    publish({ ready: true, supported, admitted: snapshot.admitted || supported, theme: snapshot.ready ? snapshot.theme : theme, reducedMotion: motion?.matches ?? true });
  };
  update();
  width?.addEventListener("change", update);
  motion?.addEventListener("change", update);
  detach = () => { width?.removeEventListener("change", update); motion?.removeEventListener("change", update); };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) initialize();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) { detach?.(); detach = undefined; }
  };
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  publish({ ...snapshot, theme });
  try { localStorage.setItem("he-theme", theme); } catch { /* Browsers can deny storage; switching must still work. */ }
}

export function getLastApplicationFocus(): HTMLElement | null { return lastApplicationFocus; }

export function useUiEnvironment() {
  return useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
}

export const ReportMotionContext = createContext(false);

export function useUiMotion() {
  const environment = useUiEnvironment();
  const initialPreference = useReducedMotion();
  const report = useContext(ReportMotionContext);
  const reduced = environment.ready ? environment.reducedMotion : initialPreference ?? true;
  const decorative = environment.theme === "default" && !reduced && !report;
  return { decorative, duration: decorative ? 0.25 : 0.15 };
}
