import type { Session } from "@/lib/contracts";
export function remainingMs(startedAt: string, durationMin: number, now: number): number {
  return Math.max(0, Date.parse(startedAt) + durationMin * 60_000 - now);
}
export function pendingWarnings(session: Session, remaining: number): number[] {
  if (remaining <= 0 || session.endedAt) return [];
  return [10, 2].filter((minutes) => remaining <= minutes * 60_000 && !session.events.some((event) => event.type === "timer_warning" && event.data?.minutesLeft === minutes));
}
