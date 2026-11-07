"use client";
import { useLayoutEffect, useRef } from "react";
import { DiffEditor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import type { editor } from "monaco-editor";
// Use the installed local package, sharing the shell's offline Monaco worker/theme.
loader.config({ monaco });
export function AssistantDiff({ original, modified }: { original: string; modified: string }) {
  const instance = useRef<editor.IStandaloneDiffEditor | null>(null);
  useLayoutEffect(() => () => {
    const models = instance.current?.getModel(); instance.current?.setModel(null);
    models?.original.dispose(); models?.modified.dispose(); instance.current = null;
  }, []);
  return <DiffEditor original={original} modified={modified} language="javascript" theme="hireescape-dark" height="55vh" keepCurrentOriginalModel keepCurrentModifiedModel
    onMount={(mounted) => { instance.current = mounted; }} options={{ readOnly: true, originalEditable: false, automaticLayout: true, minimap: { enabled: false } }} />;
}
