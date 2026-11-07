import { clsx } from "clsx";
import { Check, Code2, CornerDownLeft, FileClock, LoaderCircle, LockKeyhole, Sparkles, TriangleAlert } from "lucide-react";
import { Fragment, type ButtonHTMLAttributes, type ElementType, type ReactNode } from "react";
import { buttonStyles } from "./buttonStyles";
import type { Accent, ButtonSize, ButtonVariant } from "./types";

export function Button({ variant = "primary", size = "md", kbd, loading = false, disabled, type = "button", className, children, ...props }: {
  variant?: ButtonVariant; size?: ButtonSize; kbd?: string; loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type={type} className={buttonStyles(variant, size, className)} disabled={disabled || loading} aria-busy={loading || props["aria-busy"]}>
    {loading && <><LoaderCircle size={16} aria-hidden="true" /><span className="sr-only">Loading: </span></>}
    <span>{children}</span>
    {kbd && <kbd className="he-kbd" aria-label={`Keyboard shortcut: ${kbd}`}>
      {Array.from(kbd).map((character, index) => <Fragment key={index}>{character === "↵" ? <><CornerDownLeft size={13} aria-hidden="true" /><span className="sr-only">↵</span></> : character}</Fragment>)}
    </kbd>}
  </button>;
}

export function AccentCard({ accent = "neutral", as: Tag = "div", padded = true, className, children }: {
  accent?: Accent; as?: ElementType; padded?: boolean; className?: string; children: ReactNode;
}) {
  return <Tag className={clsx("he-card", `he-accent-${accent}`, padded && "he-card--padded", className)}>
    <span className={clsx("he-card-bar", `he-accent-${accent}`)} aria-hidden="true" />
    {children}
  </Tag>;
}

export function PillTitle({ as: Tag = "h1", className, children }: { as?: "h1" | "h2"; className?: string; children: ReactNode }) {
  return <Tag tabIndex={-1} className={clsx("he-pill-title", className)}>{children}</Tag>;
}

export function NumberBadge({ n, accent = "neutral" }: { n: number; accent?: Accent }) {
  return <span className={clsx("he-number-badge", `he-accent-${accent}`)}>{String(n).padStart(2, "0")}</span>;
}

export function GridBackdrop({ className }: { className?: string }) {
  return <div className={clsx("he-grid-backdrop", className)} aria-hidden="true" />;
}

export function AiModeBadge({ on }: { on: boolean }) {
  const Icon = on ? Sparkles : LockKeyhole;
  return <span className={clsx("he-chip", "he-ai-mode", on && "he-ai-mode--on")}>
    <Icon size={14} aria-hidden="true" />AI Assistance: {on ? "ON" : "OFF"}
  </span>;
}

export function BasisLabel({ basis }: { basis: "executed" | "ai_predicted" }) {
  const predicted = basis === "ai_predicted";
  const Icon = predicted ? TriangleAlert : Check;
  return <span className={clsx("he-chip", predicted ? "he-basis-predicted" : "he-basis-executed")}>
    <Icon size={14} aria-hidden="true" />{predicted ? "AI-predicted, not executed" : "Executed"}
  </span>;
}

export function EvidenceChip({ kind, label, onClick }: { kind: "code_line" | "event"; label: string; onClick?: () => void }) {
  const Icon = kind === "code_line" ? Code2 : FileClock;
  const content = <><Icon size={13} aria-hidden="true" />{label}</>;
  return onClick
    ? <button type="button" className="he-chip he-evidence-chip" onClick={onClick}>{content}</button>
    : <span className="he-chip he-evidence-chip">{content}</span>;
}
