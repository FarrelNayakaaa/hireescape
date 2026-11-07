"use client";

import { useEffect, useState } from "react";

export function useIdle(ms: number): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const activity = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), ms);
    };
    const events = ["keydown", "pointerdown", "pointermove", "input"] as const;
    activity();
    for (const event of events) window.addEventListener(event, activity, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const event of events) window.removeEventListener(event, activity);
    };
  }, [ms]);
  return idle;
}
