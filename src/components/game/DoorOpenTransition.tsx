"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useUiMotion } from "@/components/ui/environment";
export function DoorOpenTransition({ onComplete, label }: { onComplete(): void; label: string }) {
  const { decorative } = useUiMotion();
  useEffect(() => { const timer = setTimeout(onComplete, decorative ? 650 : 150); return () => clearTimeout(timer); }, [onComplete, decorative]);
  return <div role="status" className="he-door-transition">
    <motion.div aria-hidden="true" className="he-transition-half he-transition-half--left" initial={{ x: 0 }} animate={{ x: decorative ? "-105%" : 0, opacity: decorative ? 1 : 0 }} transition={{ duration: decorative ? 0.65 : 0.15, ease: "easeInOut" }} />
    <motion.div aria-hidden="true" className="he-transition-half he-transition-half--right" initial={{ x: 0 }} animate={{ x: decorative ? "105%" : 0, opacity: decorative ? 1 : 0 }} transition={{ duration: decorative ? 0.65 : 0.15, ease: "easeInOut" }} />
    <span>{label}</span>
  </div>;
}
