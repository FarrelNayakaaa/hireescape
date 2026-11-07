"use client";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui";
import type { IntegritySignal } from "@/lib/contracts";
import { copy } from "../lib/copy";
export function IntegrityNotice({ signals, locale }: { signals: readonly IntegritySignal[]; locale: "en" | "id" }) {
  const seen = useRef(new Set(signals.map((signal) => `${signal.type}:${signal.start}`))); const { push } = useToast();
  useEffect(() => {
    for (const signal of signals) {
      const key = `${signal.type}:${signal.start}`; if (seen.current.has(key)) continue; seen.current.add(key);
      const message = signal.type === "face_absent" ? "faceAbsent" : signal.type === "multiple_faces" ? "multiple" : signal.type === "tab_hidden" ? "welcome" : null;
      if (message && (signal.type !== "tab_hidden" || !document.hidden)) push({ tone: "info", title: copy(locale, message) });
    }
  }, [signals, locale, push]);
  return null;
}
