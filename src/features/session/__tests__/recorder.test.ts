// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Monaco } from "@monaco-editor/react";
import type { editor, IRange } from "monaco-editor";
import { useEditorRecorder } from "../hooks/useEditorRecorder";
import { useSessionStore } from "../store";
import { assessment, challenge } from "./fixtures";

function fakeEditor(initial: string) {
  let code = initial;
  let pasted = "";
  const content = new Set<() => void>();
  const paste = new Set<(event: { range: IRange }) => void>();
  const range = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 };
  const instance = {
    getValue: () => code,
    getModel: () => ({ getValueInRange: () => pasted, getFullModelRange: () => range }),
    onDidChangeModelContent: (listener: () => void) => { content.add(listener); return { dispose: () => content.delete(listener) }; },
    onDidPaste: (listener: (event: { range: IRange }) => void) => { paste.add(listener); return { dispose: () => paste.delete(listener) }; },
    pushUndoStop: vi.fn(),
    executeEdits: (source: string, edits: { text: string }[]) => {
      expect(source).toBe("ai_apply");
      code = edits[0].text;
      for (const listener of content) listener();
      return true;
    },
  };
  return {
    instance: instance as unknown as editor.IStandaloneCodeEditor,
    change(newCode: string) { code = newCode; for (const listener of content) listener(); },
    paste(newCode: string, text: string, beforeChange = false) {
      pasted = text;
      code = newCode;
      if (beforeChange) for (const listener of paste) listener({ range });
      for (const listener of content) listener();
      if (!beforeChange) for (const listener of paste) listener({ range });
    },
    listeners: () => content.size + paste.size,
  };
}

beforeEach(() => {
  localStorage.clear();
  useSessionStore.setState({ sessions: {} });
  // Let queueMicrotask run normally while controlling the debounce clock.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

function setup() {
  const id = useSessionStore.getState().start(assessment, challenge);
  useSessionStore.getState().record(id, { type: "room_enter", room: 2, data: { room: 2 } });
  const fake = fakeEditor(challenge.starterCode);
  const hook = renderHook(() => useEditorRecorder(id));
  act(() => hook.result.current.handleMount(fake.instance, {} as Monaco));
  const session = () => useSessionStore.getState().sessions[id];
  return { id, fake, hook, session };
}

it("updates live code on every change and coalesces typing into one edit snapshot", async () => {
  const { fake, hook, session } = setup();
  await act(async () => { fake.change("first\nmanual\nthird"); await Promise.resolve(); });
  expect(session().finalCode).toBe("first\nmanual\nthird");
  expect(session().events.filter((event) => event.type === "edit")).toHaveLength(0);
  act(() => vi.advanceTimersByTime(1000));
  await act(async () => { fake.change("first\nmanual again\nthird"); await Promise.resolve(); });
  act(() => vi.advanceTimersByTime(1500));
  const edits = session().events.filter((event) => event.type === "edit");
  expect(edits).toHaveLength(1);
  expect(edits[0]).toMatchObject({ room: 2, data: { linesChanged: 2, source: "manual" } });
  expect(session().snapshots.at(-1)?.code).toBe(session().finalCode);
  hook.unmount();
  expect(fake.listeners()).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});

it.each([false, true])("classifies suggestion paste as AI (paste before change: %s)", async (beforeChange) => {
  const { id, fake, session } = setup();
  useSessionStore.getState().addSuggestion(id, { code: "AI suggestion", summary: "suggestion", promptEventId: "e1", responseEventId: "e2" });
  await act(async () => { fake.paste("AI suggestion", "AI suggestion", beforeChange); await Promise.resolve(); });
  expect(session().lineOrigins).toEqual(["ai"]);
  expect(session().events.at(-1)).toMatchObject({ type: "paste", data: { chars: 13, lines: 1, matchesSuggestionId: "s1" } });
  act(() => vi.advanceTimersByTime(1500));
  expect(session().events.at(-1)).toMatchObject({ type: "edit", data: { source: "ai" } });
});

it("classifies external paste neutrally and records its payload immediately", async () => {
  const { fake, session } = setup();
  await act(async () => { fake.paste("external\ntext", "external\ntext"); await Promise.resolve(); });
  expect(session().lineOrigins).toEqual(["paste", "paste"]);
  expect(session().events.at(-1)).toMatchObject({ type: "paste", data: { chars: 13, lines: 2, matchesSuggestionId: null } });
  expect(session().events.some((event) => event.type === "edit")).toBe(false);
});

it("applies AI through executeEdits, then tracks manual edits as ai_edited", async () => {
  const { fake, hook, session } = setup();
  act(() => hook.result.current.applyExternalEdit("ai", "AI file"));
  expect(session().lineOrigins).toEqual(["ai"]);
  expect(hook.result.current.getEditor()).toBe(fake.instance);
  await act(async () => { fake.change("verified file"); await Promise.resolve(); });
  expect(session().lineOrigins).toEqual(["ai_edited"]);
  hook.unmount();
  expect(session().events.at(-1)?.type).toBe("edit");
  expect(fake.listeners()).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});

it("flushes pending changes at unmount and ignores a late flush after finish", async () => {
  const { id, fake, hook, session } = setup();
  act(() => fake.change("last typed code"));
  hook.unmount();
  expect(session().finalCode).toBe("last typed code");
  expect(session().events.at(-1)?.type).toBe("edit");
  const remount = renderHook(() => useEditorRecorder(id));
  act(() => remount.result.current.handleMount(fake.instance, {} as Monaco));
  await act(async () => { fake.change("final code"); await Promise.resolve(); });
  useSessionStore.getState().finish(id, "timeout", "final code");
  expect(() => remount.unmount()).not.toThrow();
  expect(session().events.at(-1)?.type).toBe("session_end");
});
