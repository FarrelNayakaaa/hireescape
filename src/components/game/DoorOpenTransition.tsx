"use client";
import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
export function DoorOpenTransition({ onComplete, label }: { onComplete(): void; label: string }) {
  const reduced = useReducedMotion();
  useEffect(() => { const timer = setTimeout(onComplete, reduced ? 150 : 500); return () => clearTimeout(timer); }, [onComplete, reduced]);
  return <motion.div role="status" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: reduced ? 0.15 : 0.5 }} className="fixed inset-0 z-50 flex items-center justify-center bg-he-bg text-he-text">{label}</motion.div>;
}
