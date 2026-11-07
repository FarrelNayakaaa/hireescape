"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor, IDisposable } from "monaco-editor";
import { useDebouncedCallback } from "@/lib/hooks";
import { diffLineOps } from "../lib/provenance";
import { useSessionStore } from "../store";

type Source = "manual" | "ai" | "paste";
type Change = { code: string; source: Source; paste: string | null };
export type EditorRecorder = {
  handleMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco): void;
  applyExternalEdit(source: "ai", code: string): void;
  getEditor(): editor.IStandaloneCodeEditor | null;
};

export function useEditorRecorder(sessionId: string): EditorRecorder {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const listeners = useRef<IDisposable[]>([]);
  const sourceRef = useRef<Source>("manual");
  const changes = useRef<Change[]>([]);
  const nextPaste = useRef<string | null>(null);
  const burst = useRef<{ previous: string; counts: Record<Source, number> } | null>(null);

  const flushBurst = useCallback(() => {
    const current = burst.current;
    burst.current = null;
    const store = useSessionStore.getState();
    const session = store.sessions[sessionId];
    if (!current || !session || session.endedAt) return;
    const linesChanged = diffLineOps(current.previous.split("\n"), session.finalCode.split("\n")).filter((op) => op.type !== "equal").length;
    if (!linesChanged) return;
    const source = (["manual", "ai", "paste"] as const).reduce((best, key) => current.counts[key] > current.counts[best] ? key : best, "manual");
    store.record(sessionId, { type: "edit", room: session.events.at(-1)?.room ?? 0, data: { linesChanged, source } });
  }, [sessionId]);
  const scheduleBurst = useDebouncedCallback(flushBurst, 1500);

  const drainChanges = useCallback(() => {
    for (const change of changes.current.splice(0)) {
      const store = useSessionStore.getState();
      const session = store.sessions[sessionId];
      if (!session || session.endedAt) continue;
      const match = change.paste ? session.suggestions.find((suggestion) => suggestion.code.includes(change.paste!)) : undefined;
      const source: Source = change.paste !== null ? (match ? "ai" : "paste") : change.source;
      const linesChanged = diffLineOps(session.finalCode.split("\n"), change.code.split("\n")).filter((op) => op.type !== "equal").length;
      burst.current ??= { previous: session.finalCode, counts: { manual: 0, ai: 0, paste: 0 } };
      burst.current.counts[source] += linesChanged;
      store.applyCode(sessionId, change.code, source);
      if (change.paste !== null) store.record(sessionId, { type: "paste", room: session.events.at(-1)?.room ?? 0,
        data: { chars: change.paste.length, lines: change.paste.split("\n").length, matchesSuggestionId: match?.id ?? null },
      });
      scheduleBurst();
    }
  }, [scheduleBurst, sessionId]);

  const dispose = useCallback(() => {
    drainChanges();
    flushBurst();
    for (const listener of listeners.current.splice(0)) listener.dispose();
    editorRef.current = null;
    nextPaste.current = null;
  }, [drainChanges, flushBurst]);
  useEffect(() => dispose, [dispose]);

  const handleMount = useCallback((instance: editor.IStandaloneCodeEditor) => {
    dispose();
    editorRef.current = instance;
    listeners.current = [
      instance.onDidChangeModelContent(() => {
        changes.current.push({ code: instance.getValue(), source: sourceRef.current, paste: nextPaste.current });
        nextPaste.current = null;
        // Monaco emits onDidPaste after the content change. Wait for both synchronous events
        // before assigning provenance, rather than misclassifying paste as manual typing.
        queueMicrotask(drainChanges);
      }),
      instance.onDidPaste((event) => {
        const text = instance.getModel()?.getValueInRange(event.range) ?? "";
        const change = changes.current.at(-1);
        if (change) change.paste = text;
        else nextPaste.current = text;
      }),
    ];
  }, [dispose, drainChanges]);

  const applyExternalEdit = useCallback((source: "ai", code: string) => {
    const instance = editorRef.current;
    const model = instance?.getModel();
    if (!instance || !model) throw new Error("Editor is not mounted");
    drainChanges();
    sourceRef.current = source;
    try {
      instance.pushUndoStop();
      instance.executeEdits("ai_apply", [{ range: model.getFullModelRange(), text: code, forceMoveMarkers: true }]);
      instance.pushUndoStop();
    } finally {
      sourceRef.current = "manual";
      drainChanges();
    }
  }, [drainChanges]);
  const getEditor = useCallback(() => editorRef.current, []);
  return { handleMount, applyExternalEdit, getEditor };
}
