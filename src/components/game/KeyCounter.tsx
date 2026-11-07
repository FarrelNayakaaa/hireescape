import { KeyRound } from "lucide-react";

export function KeyCounter({ keys, label, earnedLabel, lockedLabel }: { keys: number; label: string; earnedLabel: string; lockedLabel: string }) {
  return <div className="flex items-center gap-2" role="group" aria-label={label}>
    {[0, 1, 2].map((index) => <KeyRound key={index} size={18} aria-label={index < keys ? earnedLabel : lockedLabel}
      className={index < keys ? ["text-he-blue", "text-he-orange", "text-he-green"][index] : "text-he-muted"} />)}
    <span className="sr-only">{label}</span>
  </div>;
}
