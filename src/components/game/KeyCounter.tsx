"use client";

import { KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useUiMotion } from "@/components/ui/environment";

export function KeyCounter({ keys, label, earnedLabel, lockedLabel }: { keys: number; label: string; earnedLabel: string; lockedLabel: string }) {
  const { decorative } = useUiMotion();
  return <div className="flex items-center gap-2" role="group" aria-label={label}>
    {[0, 1, 2].map((index) => <motion.span key={`${index}-${index < keys}`} className="inline-flex" initial={decorative && index < keys ? { scale: 0.5, rotate: -35 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 12 }}><KeyRound size={18} data-key-slot={index + 1} aria-label={index < keys ? earnedLabel : lockedLabel}
      className={index < keys ? ["text-he-blue", "text-he-orange", "text-he-green"][index] : "text-he-muted"} /></motion.span>)}
    <span className="sr-only">{label}</span>
  </div>;
}
