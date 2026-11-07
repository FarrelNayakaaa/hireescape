"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { Bomb, Check, CircleAlert, Flashlight, ScanSearch, Sparkles } from "lucide-react";
import type { CodexRole } from "@/lib/contracts";
import { useUiMotion } from "./environment";
import { ReadableText } from "./ReadableText";

const agents = {
  saboteur: { name: "Saboteur", Icon: Bomb, accent: "room2" },
  inquisitor: { name: "Inquisitor", Icon: Flashlight, accent: "room1" },
  assistant: { name: "Assistant", Icon: Sparkles, accent: "agent" },
  analyst: { name: "Analyst", Icon: ScanSearch, accent: "room3" },
};

export function AgentAvatar({ agent, size = "md", state = "idle" }: {
  agent: CodexRole; size?: "sm" | "md" | "lg"; state?: "idle" | "thinking" | "done" | "error";
}) {
  const { name, Icon, accent } = agents[agent];
  const { decorative } = useUiMotion();
  const spinning = decorative && state === "thinking";
  return <span role="img" aria-label={`${name}: ${state}`} className={clsx("he-agent-avatar", `he-agent-avatar--${size}`, `he-agent-avatar--${state}`, `he-accent-${accent}`)}>
    <motion.span key={state} aria-hidden="true" className="he-agent-ring" data-motion={spinning ? "rotate" : "static"}
      animate={{ rotate: spinning ? 360 : 0, opacity: decorative && state === "done" ? [0.35, 1] : 1 }}
      transition={spinning ? { duration: 1.2, repeat: Infinity, ease: "linear" } : { duration: decorative ? 0.25 : 0 }} />
    <Icon className="he-agent-icon" aria-hidden="true" />
    {state === "done" && <Check className="he-agent-state-icon" size={14} aria-hidden="true" />}
    {state === "error" && <CircleAlert className="he-agent-state-icon" size={14} aria-hidden="true" />}
    {state === "thinking" && <span className="he-agent-state-text" aria-hidden="true"><ReadableText>{decorative ? "Thinking" : "…"}</ReadableText></span>}
  </span>;
}
