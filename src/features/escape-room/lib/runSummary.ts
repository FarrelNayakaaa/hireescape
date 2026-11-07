import { z } from "zod";
import type { EventDataMap, Room, Session } from "@/lib/contracts";

const count = z.number().int().nonnegative();
const summarySchema: z.ZodType<EventDataMap["test_run"]> = z.object({
  visible: z.object({ passed: count, total: count }),
  hidden: z.object({ passed: count, total: count, failedNames: z.array(z.string()) }),
  timedOut: z.boolean(), runtimeError: z.string().nullable(), codeHash: z.string(),
});

export function lastRunSummary(session: Session): EventDataMap["test_run"] | null {
  for (const event of [...session.events].reverse()) {
    if (event.type !== "test_run") continue;
    const parsed = summarySchema.safeParse(event.data);
    if (parsed.success) return parsed.data;
  }
  return null;
}

export function codeHash(code: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < code.length; index++) hash = Math.imul(hash ^ code.charCodeAt(index), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function roomDurationSec(session: Session, room: Room, now: number): number {
  const enteredAt = [...session.events].reverse().find((event) => event.type === "room_enter" && event.data?.room === room)?.t ?? 0;
  return Math.max(0, (now - Date.parse(session.startedAt) - enteredAt) / 1000);
}
