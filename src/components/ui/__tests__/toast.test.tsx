// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ToastViewport, useToast } from "../Toast";
import { useToastStore } from "../toastStore";
import { mockBrowser } from "./browser";

beforeEach(() => {
  mockBrowser(1280, true);
  vi.useFakeTimers();
  useToastStore.setState({ entries: [] });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

test("keeps the newest two toasts and announces them politely", () => {
  render(<ToastViewport />);
  act(() => { for (const title of ["First", "Second", "Third"]) useToastStore.getState().push({ title, tone: "success" }); });
  expect(screen.queryByText("First")).not.toBeInTheDocument();
  expect(screen.getByText("Second")).toBeInTheDocument();
  expect(screen.getByText("Third")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Notifications" })).toHaveAttribute("aria-live", "polite");
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
});

test("supports the default duration, custom expiry, and manual dismissal", () => {
  render(<ToastViewport />);
  act(() => {
    useToastStore.getState().push({ title: "Default" });
    useToastStore.getState().push({ title: "Short", durationMs: 1000 });
  });
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByText("Short")).not.toBeInTheDocument();
  expect(screen.getByText("Default")).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(3999));
  expect(screen.getByText("Default")).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByText("Default")).not.toBeInTheDocument();
  act(() => useToastStore.getState().push({ title: "Dismiss me" }));
  fireEvent.click(screen.getByRole("button", { name: "Dismiss Dismiss me" }));
  expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
});

test("the public hook pushes notifications and unmounting clears expiry timers", () => {
  function Trigger() {
    const { push } = useToast();
    return <button onClick={() => push({ title: "From hook", description: "Details" })}>Notify</button>;
  }
  const { unmount } = render(<><Trigger /><ToastViewport /></>);
  fireEvent.click(screen.getByRole("button", { name: "Notify" }));
  expect(screen.getByText("Details")).toBeInTheDocument();
  const clear = vi.spyOn(globalThis, "clearTimeout");
  unmount();
  expect(clear).toHaveBeenCalled();
  vi.restoreAllMocks();
});
