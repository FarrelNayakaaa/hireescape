"use client";

import { useId } from "react";
import type { AssessmentConfig, Room } from "@/lib/contracts";
import { Button } from "@/components/ui";
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
      <Button variant="secondary" onClick={onContinue} disabled={!enabled} aria-describedby={!enabled ? reasonId : undefined}>{t(locale, label[room])}</Button>
      {!enabled && <p id={reasonId} className="text-xs text-he-muted">{t(locale, unlocked ? "navigationDeferred" : "completeRoomFirst")}</p>}
    </div>
  </nav>;
}
