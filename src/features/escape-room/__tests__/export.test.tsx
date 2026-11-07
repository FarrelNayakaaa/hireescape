// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSessionStore } from "@/features/session";
import { SessionExport } from "../components/SessionExport";
import { assessment, challenge } from "./integrationFixtures";
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });
it("hides debug export normally and downloads only the selected session when enabled", async () => {
  useSessionStore.setState({ sessions: {} }); const id = useSessionStore.getState().start(assessment, challenge);
  const first = render(<SessionExport sessionId={id} locale="en" />); expect(screen.queryByRole("button")).not.toBeInTheDocument(); first.unmount();
  window.history.replaceState({}, "", "/?debug=1");
  const objectURL = vi.fn().mockReturnValue("blob:test"); Object.defineProperty(URL, "createObjectURL", { value: objectURL, configurable: true }); Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<SessionExport sessionId={id} locale="id" />); fireEvent.click(await screen.findByRole("button", { name: "Unduh JSON sesi" }));
  expect(objectURL).toHaveBeenCalledOnce(); expect(click).toHaveBeenCalledOnce();
});
