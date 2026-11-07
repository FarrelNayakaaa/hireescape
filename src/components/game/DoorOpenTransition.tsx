"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import type { Room } from "@/lib/contracts";
import { useUiMotion } from "@/components/ui/environment";
export function DoorOpenTransition({ onComplete, label, room = 1, keyEarned = true }: {
  onComplete(): void; label: string; room?: Room; keyEarned?: boolean;
}) {
  const { decorative } = useUiMotion();
  const [flight, setFlight] = useState({ x: 0, y: -160 });
  useEffect(() => {
    const target = document.querySelector(`[data-key-slot="${room}"]`)?.getBoundingClientRect();
    if (target) queueMicrotask(() => setFlight({ x: target.x + target.width / 2 - window.innerWidth / 2, y: target.y + target.height / 2 - window.innerHeight / 2 }));
    const timer = setTimeout(onComplete, decorative ? 500 : 150);
    return () => clearTimeout(timer);
  }, [onComplete, decorative, room]);
  return <div role="status" aria-label={label} data-reduced-motion={!decorative} className="he-door-transition">
    {decorative ? <>
      <motion.div aria-hidden="true" data-door-half="left" className="he-transition-half he-transition-half--left" initial={{ x: 0 }} animate={{ x: "-105%" }} transition={{ duration: 0.5, ease: "easeInOut" }} />
      <motion.div aria-hidden="true" data-door-half="right" className="he-transition-half he-transition-half--right" initial={{ x: 0 }} animate={{ x: "105%" }} transition={{ duration: 0.5, ease: "easeInOut" }} />
      {keyEarned && <motion.div aria-hidden="true" className="absolute left-1/2 top-1/2 text-he-yellow" initial={{ x: 0, y: 0, scale: 1 }} animate={{ ...flight, scale: 0.4 }} transition={{ duration: 0.5 }}><KeyRound size={40} /></motion.div>}
    </> : <motion.div aria-hidden="true" className="absolute inset-0 bg-he-bg" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.15 }} />}
    <span>{label}</span>
  </div>;
}
