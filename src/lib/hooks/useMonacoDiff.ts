"use client";
import { useLayoutEffect, useRef } from "react";
import * as monaco from "monaco-editor/editor/editor.api";

/** Own the editor and models in one synchronous lifecycle, including rapid close. */
export function useMonacoDiff(original: string, modified: string, label: string) {
  const container = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!container.current) return;
    const before = monaco.editor.createModel(original, "javascript");
    const after = monaco.editor.createModel(modified, "javascript");
    const instance = monaco.editor.createDiffEditor(container.current, {
      theme: "hireescape-dark", readOnly: true, originalEditable: false,
      automaticLayout: true, minimap: { enabled: false }, fontSize: 14, ariaLabel: label,
    });
    instance.setModel({ original: before, modified: after });
    return () => {
      // Cancels pending diff work before either worker-mirrored model disappears.
      instance.dispose();
      before.dispose();
      after.dispose();
    };
  }, [original, modified, label]);
  return container;
}
