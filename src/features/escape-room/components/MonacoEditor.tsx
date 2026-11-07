"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type { AssessmentConfig } from "@/lib/contracts";
import { t } from "@/lib/i18n";
import { configureMonaco } from "../lib/monacoSetup";

// This module is dynamically imported with ssr:false, before Editor starts its loader.
if (typeof window !== "undefined") configureMonaco();

export function MonacoEditor({ code, onMount, readOnly, locale }: { code: string; onMount: OnMount; readOnly: boolean; locale: AssessmentConfig["locale"] }) {
  return <Editor language="javascript" theme="hireescape-dark" value={code} onMount={onMount} height="100%"
    loading={<p role="status" className="p-6 text-he-muted">{t(locale, "editorLoading")}</p>}
    options={{ minimap: { enabled: false }, fontFamily: "var(--font-mono), monospace", fontSize: 14, automaticLayout: true,
      readOnly, ariaLabel: t(locale, "editorLabel"), scrollBeyondLastLine: false }} />;
}
