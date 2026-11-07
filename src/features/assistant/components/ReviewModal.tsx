"use client";
import dynamic from "next/dynamic";
import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui";
const LocalDiff = dynamic(() => import("./AssistantDiff").then((module) => module.AssistantDiff), { ssr: false, loading: () => <p role="status">Loading diff…</p> });
export function ReviewModal({ original, modified, onClose }: { original: string; modified: string; onClose(): void }) {
  const dialog = useRef<HTMLDialogElement | null>(null); const title = useId();
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} aria-labelledby={title} onCancel={onClose} onClose={onClose} className="w-[min(95vw,1200px)] rounded-xl border border-he-border bg-he-surface p-6 text-he-text backdrop:bg-black/70">
    <div className="mb-4 flex items-center justify-between gap-4"><h2 id={title}>Review suggestion diff</h2><Button variant="secondary" onClick={onClose}>Close review</Button></div>
    <LocalDiff original={original} modified={modified} />
  </dialog>;
}
