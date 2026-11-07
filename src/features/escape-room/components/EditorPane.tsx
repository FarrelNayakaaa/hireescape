"use client";

import dynamic from "next/dynamic";
import type { AssessmentConfig } from "@/lib/contracts";
import { useEditorRecorder, useSessionStore } from "@/features/session";
import { t } from "@/lib/i18n";
import { EditorErrorBoundary } from "./EditorErrorBoundary";

const LocalEditor = dynamic(() => import("./MonacoEditor").then((module) => module.MonacoEditor), {
  ssr: false,
  loading: () => <p role="status" className="p-6 text-he-muted">{t("en", "editorLoading")}</p>,
});

export function EditorPane({ sessionId, readOnly = false, locale = "en" }: { sessionId: string; readOnly?: boolean; locale?: AssessmentConfig["locale"] }) {
  const session = useSessionStore((state) => state.sessions[sessionId]);
  const recorder = useEditorRecorder(sessionId);
  if (!session) return <p className="p-6 text-he-muted">{t(locale, "editorEmpty")}</p>;
  return <section aria-label={t(locale, "editorLabel")} className="h-[65vh] min-h-96 min-w-0 bg-he-surface">
    <EditorErrorBoundary key={sessionId} locale={locale}>
      <LocalEditor code={session.finalCode} onMount={recorder.handleMount} readOnly={readOnly} locale={locale} />
    </EditorErrorBoundary>
  </section>;
}
