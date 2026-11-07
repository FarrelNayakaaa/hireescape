"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Circle, TriangleAlert } from "lucide-react";
import { useUiMotion } from "./environment";

const statuses = {
  pending: { label: "Pending", Icon: Circle }, active: { label: "In progress", Icon: ArrowRight },
  done: { label: "Done", Icon: Check }, error: { label: "Error", Icon: TriangleAlert },
};

export function StepList({ steps }: { steps: { id: string; label: string; status: "pending" | "active" | "done" | "error"; detail?: string }[] }) {
  const { duration } = useUiMotion();
  return <ol className="he-step-list" aria-label="Progress">
    {steps.map((step) => {
      const { label, Icon } = statuses[step.status];
      return <li key={step.id} className={`he-step he-step--${step.status}`} aria-current={step.status === "active" ? "step" : undefined}>
        <motion.span key={step.status} className="he-step-icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration }}><Icon size={18} aria-hidden="true" /></motion.span>
        <div><span className="he-step-label">{step.label}</span><span className="he-step-status he-small">{label}</span>
          {step.detail && <p className="he-small he-muted">{step.detail}</p>}
        </div>
      </li>;
    })}
  </ol>;
}
