// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useMonacoDiff } from "../useMonacoDiff";
const mocks = vi.hoisted(() => ({ order: [] as string[], createModel: vi.fn(), createDiffEditor: vi.fn() }));
vi.mock("monaco-editor/editor/editor.api", () => ({ editor: mocks }));
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.order.length = 0; });
it("cancels diff work before disposing models even when immediately closed", () => {
  mocks.createModel.mockImplementation((code: string) => ({ dispose: () => mocks.order.push(code) }));
  mocks.createDiffEditor.mockReturnValue({ setModel: vi.fn(), dispose: () => mocks.order.push("editor") });
  function Diff() { return <div ref={useMonacoDiff("original", "modified", "Review")} />; }
  const view = render(<Diff />); view.unmount();
  expect(mocks.order).toEqual(["editor", "original", "modified"]);
  expect(mocks.createDiffEditor).toHaveBeenCalledWith(expect.any(HTMLDivElement), expect.objectContaining({ readOnly: true, originalEditable: false }));
});
