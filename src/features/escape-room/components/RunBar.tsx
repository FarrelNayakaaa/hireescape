"use client";

import { useId } from "react";
import type { AssessmentConfig, EventDataMap, Room, RunResult } from "@/lib/contracts";
import { HiddenTestLocks } from "@/components/game";
import { Button } from "@/components/ui";
import { t } from "@/lib/i18n";
import { RoomNavigation } from "./RoomNavigation";

export function RunBar({ room, running, unlocked, hidden, recorded, onRun, onContinue, locale }: {
  room: Room; running: boolean; unlocked: boolean; hidden: RunResult | null; recorded: EventDataMap["test_run"] | null;
  onRun(): void; onContinue?: () => void; locale: AssessmentConfig["locale"];
}) {
  const reasonId = useId();
  return <footer className="flex min-h-14 flex-wrap items-center justify-between gap-4 border-t border-he-border bg-he-surface p-4">
    <div className="flex flex-wrap items-start gap-4">
      <div><Button onClick={onRun} disabled={running || unlocked || room === 3} loading={running} kbd="⌘↵"
        aria-describedby={running || unlocked || room === 3 ? `${reasonId}-run` : undefined}>{t(locale, "runTests")}</Button>
        {(running || unlocked || room === 3) && <p id={`${reasonId}-run`} className="mt-2 text-xs text-he-muted">{t(locale, running ? "running" : "codeSealed")}</p>}</div>
      <div><Button variant="secondary" disabled aria-describedby={`${reasonId}-check`}>{t(locale, "check")}</Button>
        <p id={`${reasonId}-check`} className="mt-2 text-xs text-he-muted">{t(locale, "checkDeferred")}</p></div>
      <HiddenTestLocks results={hidden} recordedCounts={recorded && room === 2 ? recorded.hidden : undefined}
        summary={t(locale, "testCounts", { passed: hidden?.passed ?? recorded?.hidden.passed ?? 0, total: hidden?.total ?? recorded?.hidden.total ?? 0, suite: t(locale, "hiddenSuite") })}
        emptyLabel={t(locale, "hiddenPending")} openLabel={t(locale, "vaultOpen")}
        statusLabels={{ pass: t(locale, "pass"), fail: t(locale, "fail"), error: t(locale, "error") }} />
    </div>
    <RoomNavigation room={room} unlocked={room === 1 || unlocked} onContinue={running ? undefined : onContinue} locale={locale} />
  </footer>;
}
