"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { useUiMotion } from "./environment";

export type MascotCharacter = "candidate" | "saboteur" | "inquisitor" | "assistant" | "analyst";
export type MascotState = "idle" | "thinking" | "done" | "error";
const rows: Record<MascotCharacter, number> = { candidate: 0, saboteur: 1, inquisitor: 2, assistant: 3, analyst: 4 };
const columns: Record<MascotState, number> = { idle: 0, thinking: 1, done: 2, error: 3 };

export function Mascot({ character = "candidate", state = "idle", className = "", label }: {
  character?: MascotCharacter; state?: MascotState; className?: string; label?: string;
}) {
  const { decorative } = useUiMotion();
  // Keys reward candidate progress; agent completion uses a neutral status check instead.
  const column = character !== "candidate" && state === "done" ? columns.idle : columns[state];
  const style: CSSProperties = { backgroundPosition: `${column * 100 / 3}% ${rows[character] * 25}%` };
  return <motion.span role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
    className={`he-mascot ${className}`} style={style} data-character={character} data-state={state}
    animate={decorative ? { y: state === "thinking" ? [0, -3, 0] : [0, -6, 0], rotate: state === "done" && character === "candidate" ? [0, -3, 3, 0] : 0 } : { y: 0, rotate: 0 }}
    transition={{ duration: state === "done" ? 1.6 : 3, repeat: decorative ? Infinity : 0, ease: "easeInOut" }} />;
}
