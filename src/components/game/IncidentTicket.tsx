import { AccentCard } from "@/components/ui";

export function IncidentTicket({ brief, title, label, emptyLabel }: { brief: string; title: string; label: string; emptyLabel: string }) {
  return <section aria-label={label}><AccentCard accent="room2" className="space-y-4">
    <p className="font-mono text-xs uppercase tracking-widest text-he-orange">{label}</p>
    <h2 className="text-xl font-bold text-he-text">{title}</h2>
    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-he-muted">{brief || emptyLabel}</p>
  </AccentCard></section>;
}
