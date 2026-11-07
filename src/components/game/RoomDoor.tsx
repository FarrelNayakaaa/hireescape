import { KeyRound, LockKeyhole, DoorOpen } from "lucide-react";
import type { Room } from "@/lib/contracts";

export type DoorState = "locked" | "active" | "escaped";
const accents = { 1: "border-he-blue text-he-blue", 2: "border-he-orange text-he-orange", 3: "border-he-green text-he-green" };

export function RoomDoor({ room, state, label, stateLabel }: { room: Room; state: DoorState; label: string; stateLabel: string }) {
  const Icon = { locked: LockKeyhole, active: DoorOpen, escaped: KeyRound }[state];
  return <div aria-current={state === "active" ? "step" : undefined} className="flex items-center gap-2">
    <div className={`flex h-[72px] w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-t-xl border-2 ${state === "locked" ? "border-he-border text-he-muted" : accents[room]} ${state === "escaped" ? "bg-he-surface-2" : "bg-he-surface"}`}>
      <span className="font-mono text-xs">{String(room).padStart(2, "0")}</span><Icon size={18} aria-hidden="true" />
    </div>
    <div><p className="text-sm font-semibold text-he-text">{label}</p><p className="text-xs text-he-muted">{stateLabel}</p></div>
  </div>;
}
