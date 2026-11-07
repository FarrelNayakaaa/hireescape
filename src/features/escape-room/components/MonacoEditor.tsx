"use client";

import { useCallback, useEffect, useRef } from "react";
import Editor, { DiffEditor, type OnMount } from "@monaco-editor/react";
import type { editor, IDisposable } from "monaco-editor";
import type { MarkedRange } from "../lib/triageCheck";
import type { AssessmentConfig } from "@/lib/contracts";
import { t } from "@/lib/i18n";
import { configureMonaco } from "../lib/monacoSetup";

// This module is dynamically imported with ssr:false, before Editor starts its loader.
if (typeof window !== "undefined") configureMonaco();

export function MonacoEditor({ code, onMount, readOnly, locale, markedRange, revealRange, onMarkLine }: { code: string; onMount: OnMount; readOnly: boolean; locale: AssessmentConfig["locale"];
  markedRange: MarkedRange | null; revealRange: MarkedRange | null; onMarkLine?: (line: number) => void;
}) {
  const decorations = useRef<editor.IEditorDecorationsCollection | null>(null);
  const listeners = useRef<IDisposable[]>([]);
  const marker = useRef(onMarkLine);
  useEffect(() => { marker.current = onMarkLine; }, [onMarkLine]);
  const update = useCallback(() => { decorations.current?.set([markedRange, revealRange].filter((range): range is MarkedRange => Boolean(range)).map((range) => ({
    range: { startLineNumber: range[0], startColumn: 1, endLineNumber: range[1], endColumn: 1 }, options: { isWholeLine: true, className: "he-triage-mark", glyphMarginClassName: "he-triage-glyph" },
  }))); }, [markedRange, revealRange]);
  useEffect(update, [update]);
  useEffect(() => () => { for (const listener of listeners.current) listener.dispose(); }, []);
  return <><style jsx global>{`.he-triage-mark{background:color-mix(in srgb,var(--he-blue) 20%,transparent)}.he-triage-glyph{background:var(--he-blue);border-radius:50%;transform:scale(.45)}`}</style><Editor language="javascript" theme="hireescape-dark" value={code} height="100%"
    onMount={(instance, monaco) => {
      onMount(instance, monaco); decorations.current = instance.createDecorationsCollection(); update();
      listeners.current = [instance.onMouseDown((event) => { if (event.target.position && [monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN, monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS].includes(event.target.type)) marker.current?.(event.target.position.lineNumber); }),
        instance.onKeyDown((event) => { if (marker.current && event.keyCode === monaco.KeyCode.KeyM && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); event.stopPropagation(); marker.current(instance.getPosition()?.lineNumber ?? 1); } })];
    }}
    loading={<p role="status" className="p-6 text-he-muted">{t(locale, "editorLoading")}</p>}
    options={{ minimap: { enabled: false }, fontFamily: "var(--font-mono), monospace", fontSize: 14, automaticLayout: true,
      glyphMargin: Boolean(onMarkLine), readOnly, ariaLabel: t(locale, "editorLabel"), scrollBeyondLastLine: false }} /></>;
}

export function MonacoDiff({ original, modified, locale }: { original: string; modified: string; locale: AssessmentConfig["locale"] }) {
  return <DiffEditor original={original} modified={modified} language="javascript" theme="hireescape-dark" height="100%"
    options={{ readOnly: true, originalEditable: false, minimap: { enabled: false }, fontSize: 14, automaticLayout: true, ariaLabel: t(locale, "viewDiff") }} />;
}
