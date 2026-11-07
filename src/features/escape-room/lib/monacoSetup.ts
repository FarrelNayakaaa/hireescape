"use client";

import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/languages/definitions/javascript/register";

let configured = false;

export function configureMonaco(): void {
  if (configured) return;
  const environment = globalThis as typeof globalThis & { MonacoEnvironment?: monaco.Environment };
  environment.MonacoEnvironment = {
    getWorker() {
      // Turbopack treats new URL(worker-file) as a raw asset. Preserve the package's
      // module graph through the allowlisted local route instead of a CDN.
      return new Worker(new URL("/play/editor-assets/editor/editor.worker.js", window.location.origin), { type: "module" });
    },
  };
  loader.config({ monaco });
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => styles.getPropertyValue(`--he-${name}`).trim();
  monaco.editor.defineTheme("hireescape-dark", {
    base: "vs-dark", inherit: true,
    rules: [
      { token: "comment", foreground: token("muted").replace("#", "") },
      { token: "string", foreground: token("green").replace("#", "") },
      { token: "keyword", foreground: token("blue").replace("#", "") },
      { token: "number", foreground: token("yellow").replace("#", "") },
    ],
    colors: {
      "editor.background": token("surface"), "editor.lineHighlightBackground": token("surface-2"),
      "editor.selectionBackground": `${token("purple")}33`, "editorCursor.foreground": token("orange"),
      "editor.foreground": token("text"),
    },
  });
  configured = true;
}
