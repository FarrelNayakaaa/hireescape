import type { editor, IRange } from "monaco-editor";
export function fakeEditor(initial: string) {
  let code = initial; let pasted = ""; const content = new Set<() => void>(); const paste = new Set<(event: { range: IRange }) => void>();
  const range = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 };
  const instance = { getValue: () => code, getModel: () => ({ getValueInRange: () => pasted, getFullModelRange: () => range }),
    onDidChangeModelContent: (listener: () => void) => { content.add(listener); return { dispose: () => content.delete(listener) }; },
    onDidPaste: (listener: (event: { range: IRange }) => void) => { paste.add(listener); return { dispose: () => paste.delete(listener) }; },
    pushUndoStop: () => {}, executeEdits: (_source: string, edits: { text: string }[]) => { code = edits[0].text; for (const listener of content) listener(); return true; },
  };
  return { instance: instance as unknown as editor.IStandaloneCodeEditor, change(value: string) { code = value; for (const listener of content) listener(); },
    paste(value: string) { pasted = value; code = value; for (const listener of content) listener(); for (const listener of paste) listener({ range }); } };
}
