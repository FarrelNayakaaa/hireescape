"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { exportSessions } from "@/features/session";
import { t } from "@/lib/i18n";
import type { AssessmentConfig } from "@/lib/contracts";
export function SessionExport({ sessionId, locale }: { sessionId: string; locale: AssessmentConfig["locale"] }) {
  const [enabled, setEnabled] = useState(false), [error, setError] = useState(false);
  useEffect(() => { const ready = process.env.NEXT_PUBLIC_DEMO_MODE === "1" || new URLSearchParams(window.location.search).get("debug") === "1"; queueMicrotask(() => setEnabled(ready)); }, []);
  if (!enabled) return null;
  return <div className="my-4"><Button variant="secondary" onClick={() => {
    try {
      const session = exportSessions().find((item) => item.id === sessionId); if (!session) throw new Error("Session unavailable");
      const url = URL.createObjectURL(new Blob([JSON.stringify(session, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `hireescape-session-${session.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); setError(false);
    } catch { setError(true); }
  }}>{t(locale, "downloadSession")}</Button>{error && <p role="alert">{t(locale, "exportError")}</p>}</div>;
}
