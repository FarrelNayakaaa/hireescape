import type { AssessmentConfig } from "@/lib/contracts";
import { KeyCounter, RoomDoor, Timer, formatTime } from "@/components/game";
import { t } from "@/lib/i18n";
import type { FlowState } from "../lib/flow";

export function RoomHeader({ assessment, title, flow }: { assessment: AssessmentConfig; title: string; flow: FlowState }) {
  const locale = assessment.locale;
  return <header className="flex min-h-16 flex-wrap items-center gap-6 border-b border-he-border bg-he-surface px-6 py-3 text-he-text">
    <nav aria-label={t(locale, "roomProgress")}>
      <ol className="flex items-center gap-3">
        {([1, 2, 3] as const).map((room) => {
          const state = flow.completedRooms.includes(room) ? "escaped" : flow.room === room ? "active" : "locked";
          return <li key={room} className="flex items-center gap-3">
            {room > 1 && <span aria-hidden="true" className="w-6 border-t-2 border-dotted border-he-border" />}
            <RoomDoor room={room} state={state} label={t(locale, `room${room}Name`)} stateLabel={t(locale, state)} />
          </li>;
        })}
      </ol>
    </nav>
    <KeyCounter keys={flow.completedRooms.length} label={t(locale, "keys", { count: flow.completedRooms.length })} earnedLabel={t(locale, "earnedKey")} lockedLabel={t(locale, "lockedKey")} />
    <h1 className="min-w-0 flex-1 truncate text-sm font-semibold" title={title}>{title}</h1>
    <span className={`he-chip he-ai-mode ${assessment.aiAssistance ? "he-ai-mode--on" : ""}`}>{t(locale, assessment.aiAssistance ? "aiOn" : "aiOff")}</span>
    {flow.startedAtMs !== null ? <Timer endsAt={flow.startedAtMs + assessment.durationMin * 60_000} durationMs={assessment.durationMin * 60_000}
      label={t(locale, "timerLabel")} tenMinuteLabel={t(locale, "tenMinutes")} twoMinuteLabel={t(locale, "twoMinutes")} />
      : <span className="font-mono" aria-label={t(locale, "timerLabel")}>{formatTime(assessment.durationMin * 60_000)}</span>}
  </header>;
}
