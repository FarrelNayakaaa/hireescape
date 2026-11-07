"use client";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Room } from "@/lib/contracts";
export function DoorOpenTransition({ onComplete, label, room = 1, keyEarned = true }: { onComplete(): void; label: string; room?: Room; keyEarned?: boolean }) {
  const reduced = useReducedMotion(); const [flight, setFlight] = useState({ x: 0, y: -160 });
  useEffect(() => {
    const target = document.querySelector(`[data-key-slot="${room}"]`)?.getBoundingClientRect();
    if (target) queueMicrotask(() => setFlight({ x: target.x + target.width / 2 - window.innerWidth / 2, y: target.y + target.height / 2 - window.innerHeight / 2 }));
    const timer = setTimeout(onComplete, reduced ? 150 : 500); return () => clearTimeout(timer);
  }, [onComplete, reduced, room]);
  return <motion.div role="status" aria-label={label} data-reduced-motion={Boolean(reduced)} initial={{ opacity: 1 }} animate={reduced ? { opacity: 0 } : { opacity: [1, 1, 0] }} transition={{ duration: reduced ? 0.15 : 0.5 }} className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden text-he-text">
    {reduced ? <div className="absolute inset-0 bg-he-bg" /> : <>
      <motion.div data-door-half="left" className="absolute inset-y-0 left-0 w-1/2 origin-left border-r border-he-blue bg-he-bg" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 0.5 }} />
      <motion.div data-door-half="right" className="absolute inset-y-0 right-0 w-1/2 origin-right border-l border-he-blue bg-he-bg" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 0.5 }} />
      {keyEarned && <motion.div aria-hidden="true" initial={{ x: 0, y: 0, scale: 1 }} animate={{ ...flight, scale: 0.4 }} transition={{ duration: 0.5 }} className="absolute left-1/2 top-1/2 text-he-blue"><KeyRound size={40} /></motion.div>}
    </>}
    <span className="sr-only">{label}</span>
  </motion.div>;
}
