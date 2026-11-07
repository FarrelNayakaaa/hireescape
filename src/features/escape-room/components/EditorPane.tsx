"use client";

import dynamic from "next/dynamic";
import { createContext, useContext } from "react";
import type { AssessmentConfig } from "@/lib/contracts";
import { useEditorRecorder, useSessionStore, type EditorRecorder } from "@/features/session";
import type { MarkedRange } from "../lib/triageCheck";
import { t } from "@/lib/i18n";
import { EditorErrorBoundary } from "./EditorErrorBoundary";

const EditorLocale = createContext<AssessmentConfig["locale"]>("en");
function EditorLoading() { return <p role="status" className="p-6 text-he-muted">{t(useContext(EditorLocale), "editorLoading")}</p>; }
const LocalEditor = dynamic(() => import("./MonacoEditor").then((module) => module.MonacoEditor), {
  ssr: false,
  loading: EditorLoading,
});
const LocalDiff = dynamic(() => import("./MonacoEditor").then((module) => module.MonacoDiff), { ssr: false });

export function EditorPane({ sessionId, readOnly = false, locale = "en", markedRange = null, revealRange = null, onMarkLine, showDiff = false, starterCode = "", onReady }: {
  sessionId: string; readOnly?: boolean; locale?: AssessmentConfig["locale"]; markedRange?: MarkedRange | null; revealRange?: MarkedRange | null;
  onMarkLine?: (line: number) => void; showDiff?: boolean; starterCode?: string; onReady?: (bridge: EditorRecorder | null) => void;
}) {
  const session = useSessionStore((state) => state.sessions[sessionId]);
  const recorder = useEditorRecorder(sessionId);
  if (!session) return <p className="p-6 text-he-muted">{t(locale, "editorEmpty")}</p>;
  return <section aria-label={t(locale, "editorLabel")} className="h-[65vh] min-h-96 min-w-0 bg-he-surface">
    <EditorLocale value={locale}><EditorErrorBoundary key={sessionId} locale={locale}>
      {showDiff ? <LocalDiff original={starterCode} modified={session.finalCode} locale={locale} /> : <LocalEditor code={session.finalCode}
        onMount={(instance, monaco) => { recorder.handleMount(instance, monaco); onReady?.(recorder); }} readOnly={readOnly} locale={locale}
        markedRange={markedRange} revealRange={revealRange} onMarkLine={onMarkLine} />}
    </EditorErrorBoundary></EditorLocale>
  </section>;
}
