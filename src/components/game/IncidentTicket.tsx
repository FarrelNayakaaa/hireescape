export function IncidentTicket({ brief, title, label, emptyLabel }: { brief: string; title: string; label: string; emptyLabel: string }) {
  return <section className="space-y-4 rounded-xl border border-t-4 border-he-border border-t-he-orange bg-he-surface p-6" aria-label={label}>
    <p className="font-mono text-xs uppercase tracking-widest text-he-orange">{label}</p>
    <h2 className="text-xl font-bold text-he-text">{title}</h2>
    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-he-muted">{brief || emptyLabel}</p>
  </section>;
}
