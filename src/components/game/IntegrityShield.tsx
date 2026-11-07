import { Shield, ShieldOff } from "lucide-react";
export function IntegrityShield({ state, label }: { state: "off" | "browser" | "active" | "paused"; label: string }) {
  const Icon = state === "off" || state === "paused" ? ShieldOff : Shield;
  return <span className="inline-flex items-center gap-2 text-xs text-he-muted" role="status"><Icon size={18} aria-hidden="true" />{label}</span>;
}
