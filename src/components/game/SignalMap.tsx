"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { Dimension } from "@/lib/contracts";
const axes: { id: Dimension; x: number; y: number }[] = [{ id: "debugging", x: 120, y: 24 }, { id: "design", x: 216, y: 120 }, { id: "communication", x: 120, y: 216 }, { id: "ai_supervision", x: 24, y: 120 }];
export function SignalMap({ counts, labels, title, tooltip, notAssessed }: { counts: Record<Dimension, number | null>; labels: Record<Dimension, string>; title: string; tooltip: string; notAssessed: string }) {
  const reduced = useReducedMotion();
  return <details className="rounded-lg border border-he-border bg-he-surface p-4" open><summary className="cursor-pointer font-semibold" title={tooltip} aria-description={tooltip}>{title}</summary>
    <svg viewBox="0 0 240 240" aria-hidden="true" className="mx-auto h-52 w-52 text-he-blue">
      <path d="M120 24 216 120 120 216 24 120Z" fill="none" stroke="var(--he-border)" />
      {axes.map(({ id, x, y }) => <g key={id} opacity={counts[id] === null ? 0.35 : 1}><line x1="120" y1="120" x2={x} y2={y} stroke="var(--he-muted)" />
        {Array.from({ length: Math.min(8, counts[id] ?? 0) }, (_, index) => <motion.circle key={index} cx={120 + (x - 120) * (index + 1) / 9} cy={120 + (y - 120) * (index + 1) / 9} fill="currentColor" r="3" initial={reduced ? false : { opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }} />)}
      </g>)}
    </svg><dl className="grid grid-cols-2 gap-3 text-sm">{axes.map(({ id }) => <div key={id} className={counts[id] === null ? "text-he-muted" : "text-he-text"}><dt>{labels[id]}</dt><dd className="font-mono">{counts[id] ?? notAssessed}</dd></div>)}</dl>
  </details>;
}
