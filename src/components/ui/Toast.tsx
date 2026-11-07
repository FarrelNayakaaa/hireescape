"use client";

import { motion } from "framer-motion";
import { Check, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";
import { useUiMotion } from "./environment";
import { ReadableText } from "./ReadableText";
import { useToastStore, type ToastEntry, type ToastInput } from "./toastStore";

export function useToast(): { push: (toast: ToastInput) => void } {
  return { push: useToastStore((state) => state.push) };
}

const tones = { info: { Icon: Info, label: "Info" }, success: { Icon: Check, label: "Success" }, warning: { Icon: TriangleAlert, label: "Warning" }, error: { Icon: CircleAlert, label: "Error" } };

function ToastItem({ toast }: { toast: ToastEntry }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const { duration } = useUiMotion();
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), Math.max(0, toast.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [toast.id, toast.expiresAt, dismiss]);
  const tone = toast.tone ?? "info";
  const { Icon, label } = tones[tone];
  return <motion.li className={`he-toast he-toast--${tone}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration }} aria-atomic="true">
    <Icon size={20} aria-hidden="true" />
    <div><span className="he-small he-muted">{label}</span><p className="he-toast-title"><ReadableText>{toast.title}</ReadableText></p>
      {toast.description && <p className="he-small he-muted"><ReadableText>{toast.description}</ReadableText></p>}
    </div>
    <button type="button" className="he-icon-button" aria-label={`Dismiss ${toast.title}`} onClick={() => dismiss(toast.id)}><X size={17} aria-hidden="true" /></button>
  </motion.li>;
}

export function ToastViewport() {
  const entries = useToastStore((state) => state.entries);
  return <section className="he-toast-viewport" aria-label="Notifications" aria-live="polite" aria-relevant="additions text">
    <ol>{entries.map((toast) => <ToastItem key={toast.id} toast={toast} />)}</ol>
  </section>;
}
