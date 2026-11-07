import type { Challenge, Dimension, Session } from "@/lib/contracts";
import { diffLineOps } from "@/features/session";
export type SignalCounts = Record<Dimension, number | null>;
export function capturedSignals(session: Session, challenge: Pick<Challenge, "starterCode" | "defectLines">): SignalCounts {
  const counts: SignalCounts = { debugging: 0, design: 0, communication: 0, ai_supervision: session.aiAssistance ? 0 : null };
  const snapshots = new Map(session.snapshots.map((snapshot) => [snapshot.eventId, snapshot.code]));
  let previousCode = challenge.starterCode, applied = false;
  const increment = (axis: Dimension, amount = 1) => { if (counts[axis] !== null) counts[axis] += amount; };
  for (const event of session.events) {
    const code = snapshots.get(event.id);
    if (event.type === "triage_mark" || event.type === "test_run" || (event.type === "room_complete" && event.data?.room === 2)) increment("debugging");
    if ((event.type === "triage_mark" && (event.text?.trim().length ?? 0) >= 15) || event.type === "candidate_answer") increment("communication");
    if (event.type === "candidate_answer" && event.room === 3) increment("design");
    if (event.type === "edit" && code !== undefined) {
      const before = previousCode.split("\n"), after = code.split("\n");
      const handlingChange = diffLineOps(before, after).some((op) => {
        if (op.type === "equal") return false;
        const index = op.type === "add" ? op.newIndex : op.oldIndex;
        const line = (op.type === "add" ? after : before)[index];
        return (index + 1 < challenge.defectLines[0] || index + 1 > challenge.defectLines[1]) && /\b(try|catch|throw|finally)\b|logger\.(warn|error)/.test(line);
      });
      if (handlingChange) increment("design");
    }
    if (event.type === "assistant_prompt" || event.type === "ai_diff_view" || (event.type === "test_run" && applied)) increment("ai_supervision");
    if (event.type === "ai_apply") applied = true;
    if (code !== undefined) previousCode = code;
  }
  increment("ai_supervision", session.lineOrigins.filter((origin) => origin === "ai_edited").length);
  return counts;
}
