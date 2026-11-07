// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ config: vi.fn(), defineTheme: vi.fn() }));
vi.mock("@monaco-editor/react", () => ({ loader: { config: mocks.config } }));
vi.mock("monaco-editor/editor/editor.api", () => ({ editor: { defineTheme: mocks.defineTheme } }));
vi.mock("monaco-editor/languages/definitions/javascript/register", () => ({}));
vi.mock("monaco-editor/editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode", () => ({}));
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); vi.clearAllMocks(); });

it("configures local Monaco once, with a bundled worker and theme tokens", async () => {
  const tokens = { surface: "#11111A", "surface-2": "#181826", purple: "#8B5CF6", orange: "#F26B3A", muted: "#A3A3B8", green: "#5ED88F", blue: "#4FB8F2", yellow: "#F5B941", text: "#F5F5F7" };
  for (const [name, value] of Object.entries(tokens)) document.documentElement.style.setProperty(`--he-${name}`, value);
  const WorkerMock = vi.fn(function Worker(url: URL, options: WorkerOptions) { void url; void options; });
  vi.stubGlobal("Worker", WorkerMock);
  const { configureMonaco } = await import("../lib/monacoSetup");
  configureMonaco();
  configureMonaco();
  expect(mocks.config).toHaveBeenCalledOnce();
  expect(mocks.config.mock.calls[0][0]).toHaveProperty("monaco.editor.defineTheme");
  expect(mocks.config.mock.calls[0][0]).not.toHaveProperty("paths");
  expect(mocks.defineTheme).toHaveBeenCalledWith("hireescape-dark", expect.objectContaining({
    base: "vs-dark", colors: expect.objectContaining({ "editor.background": tokens.surface, "editor.selectionBackground": "#8B5CF633" }),
  }));
  const environment = (globalThis as typeof globalThis & { MonacoEnvironment: { getWorker(): Worker } }).MonacoEnvironment;
  environment.getWorker();
  expect(WorkerMock).toHaveBeenCalledWith(expect.any(URL), { type: "module" });
  expect(WorkerMock.mock.calls[0]?.[0].toString()).toContain("editor.worker.js");
});
