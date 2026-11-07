import type { SessionEvent, Snapshot } from "@/lib/contracts";

export function compactSnapshots(snapshots: Snapshot[], events: SessionEvent[]): Snapshot[] {
  const editIds = new Set(events.filter((event) => event.type === "edit").map((event) => event.id));
  let retained = snapshots;
  while (retained.length > 400) {
    let editIndex = 0;
    const reduced = retained.filter((snapshot) => !editIds.has(snapshot.eventId) || editIndex++ % 2 === 1);
    if (reduced.length === retained.length) break;
    retained = reduced;
  }
  // Non-edit evidence takes priority if it alone exceeds the nominal cap.
  return retained;
}
