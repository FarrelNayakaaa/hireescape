"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { useId } from "react";
import { useUiMotion } from "./environment";

export function NeonArcs({ position, className }: {
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left"; className?: string;
}) {
  const id = useId().replaceAll(":", "");
  const { decorative } = useUiMotion();
  const colors = ["orange", "blue", "green", "blue", "orange"];
  return <motion.div aria-hidden="true" className={clsx("he-neon-arcs", `he-neon-arcs--${position}`, className)}
    data-motion={decorative ? "breathe" : "static"}
    animate={{ opacity: decorative ? [0.35, 0.65, 0.35] : 0.45 }}
    transition={decorative ? { duration: 6, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}>
    <svg viewBox="0 0 400 400" className="he-arcs-smooth" fill="none" focusable="false">
      <defs><filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" /></filter></defs>
      {[true, false].map((glow) => <g key={String(glow)} filter={glow ? `url(#${id}-glow)` : undefined}>
        {colors.map((color, index) => {
          const radius = 160 + index * 38;
          return <path key={index} d={`M ${400 - radius} 0 A ${radius} ${radius} 0 0 0 400 ${radius}`} stroke={`var(--he-${color})`} strokeWidth="1.5" />;
        })}
      </g>)}
    </svg>
    <svg viewBox="0 0 400 400" className="he-arcs-stepped" fill="none" focusable="false">
      {colors.map((color, index) => {
        const inset = 80 + index * 38;
        return <path key={index} d={`M ${inset} 0 V ${400 - inset - 80} H ${inset + 40} V ${400 - inset - 40} H ${inset + 80} V ${400 - inset} H 400`} stroke={`var(--he-${color})`} strokeWidth="2" />;
      })}
    </svg>
  </motion.div>;
}
