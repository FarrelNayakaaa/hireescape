"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Room } from "@/lib/contracts";

export function RoomIntroCard({ room, title, goal, skipLabel, continueLabel, onDismiss }: {
  room: Room; title: string; goal: string; skipLabel: string; continueLabel: string; onDismiss(): void;
}) {
  const dismissed = useRef(false);
  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    onDismiss();
  }, [onDismiss]);
  useEffect(() => {
    const timer = setTimeout(dismiss, 1500);
    const onKey = () => dismiss();
    window.addEventListener("keydown", onKey, { once: true });
    return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, [dismiss]);
  return <section aria-label={title} className="space-y-3 rounded-xl border border-t-4 border-he-border border-t-he-blue bg-he-surface p-6 text-he-text">
    <span className="inline-flex h-9 w-9 items-center justify-center rounded border border-he-blue font-mono text-he-blue">{String(room).padStart(2, "0")}</span>
    <h2 className="text-2xl font-bold">{title}</h2><p className="text-he-muted">{goal}</p>
    <p className="text-xs text-he-muted">{skipLabel}</p>
    <button type="button" onClick={dismiss} className="min-h-10 rounded-lg border border-he-border px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-he-blue">{continueLabel}</button>
  </section>;
}
