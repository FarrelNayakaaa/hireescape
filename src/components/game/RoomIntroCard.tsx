"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Room } from "@/lib/contracts";
import { AccentCard, Button, NumberBadge } from "@/components/ui";

export function RoomIntroCard({ room, title, goal, skipLabel, continueLabel, onDismiss }: {
  room: Room; title: string; goal: string; skipLabel: string; continueLabel: string; onDismiss(): void;
}) {
  const dismissed = useRef(false);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    onDismissRef.current();
  }, []);
  useEffect(() => {
    const timer = setTimeout(dismiss, 1500);
    const onKey = () => dismiss();
    window.addEventListener("keydown", onKey, { once: true });
    return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, [dismiss]);
  return <section aria-label={title}><AccentCard accent={`room${room}`} className="space-y-3 text-he-text">
    <NumberBadge n={room} accent={`room${room}`} />
    <h2 className="text-2xl font-bold">{title}</h2><p className="text-he-muted">{goal}</p>
    <p className="text-xs text-he-muted">{skipLabel}</p>
    <Button variant="secondary" onClick={dismiss}>{continueLabel}</Button>
  </AccentCard></section>;
}
