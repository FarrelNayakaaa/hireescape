"use client";

import { useId } from "react";
import type { AssessmentConfig, Room } from "@/lib/contracts";
import { t } from "@/lib/i18n";

export function RoomNavigation({ room, unlocked, onContinue, locale = "en" }: {
  room: Room; unlocked: boolean; onContinue?: () => void; locale?: AssessmentConfig["locale"];
}) {
  const reasonId = useId();
  const enabled = room < 3 && unlocked && Boolean(onContinue);
  const label = { 1: "continueRoom2", 2: "enterRoom3", 3: "nextRoom" } as const;
  return <nav aria-label={t(locale, "roomProgress")} className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-he-border bg-he-surface p-4">
    <p className="text-xs text-he-muted">{t(locale, "noGoingBack")}</p>
    <div className="space-y-2">
      <button type="button" onClick={onContinue} disabled={!enabled} aria-describedby={!enabled ? reasonId : undefined}
        className="min-h-10 rounded-lg border border-he-border px-5 text-sm text-he-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-he-blue disabled:cursor-not-allowed disabled:opacity-60">{t(locale, label[room])}</button>
      {!enabled && <p id={reasonId} className="text-xs text-he-muted">{t(locale, unlocked ? "navigationDeferred" : "completeRoomFirst")}</p>}
    </div>
  </nav>;
}
