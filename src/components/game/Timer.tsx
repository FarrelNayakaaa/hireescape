"use client";

import { useEffect, useRef, useState } from "react";

export function formatTime(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function Timer({ endsAt, durationMs, label, tenMinuteLabel, twoMinuteLabel }: {
  endsAt: number; durationMs: number; label: string; tenMinuteLabel: string; twoMinuteLabel: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const lastRemaining = useRef<number | null>(null);
  useEffect(() => {
    const update = () => {
      const time = Date.now();
      const remaining = Math.max(0, endsAt - time);
      const previous = lastRemaining.current;
      if (previous !== null && previous > 120_000 && remaining <= 120_000 && remaining > 0) setAnnouncement(twoMinuteLabel);
      else if (previous !== null && previous > 600_000 && remaining <= 600_000 && remaining > 120_000) setAnnouncement(tenMinuteLabel);
      lastRemaining.current = remaining;
      setNow(time);
    };
    lastRemaining.current = null;
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endsAt, tenMinuteLabel, twoMinuteLabel]);
  const remaining = now === null ? null : Math.max(0, endsAt - now);
  const ratio = remaining === null || durationMs <= 0 ? 1 : Math.min(1, remaining / durationMs);
  const urgent = remaining !== null && remaining <= 600_000;
  return <div className={`relative flex h-14 w-24 items-center justify-center font-mono ${urgent ? "text-he-yellow" : "text-he-text"}`}>
    <svg viewBox="0 0 96 56" aria-hidden="true" className="absolute inset-0 h-full w-full">
      <rect x="2" y="2" width="92" height="52" rx="24" fill="none" stroke="currentColor" strokeOpacity="0.2" />
      <rect x="2" y="2" width="92" height="52" rx="24" fill="none" stroke="currentColor" pathLength="100" strokeDasharray={`${ratio * 100} 100`} />
    </svg>
    <span role="timer" aria-live="off" aria-label={label}>{remaining === null ? "--:--" : formatTime(remaining)}</span>
    <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
  </div>;
}
