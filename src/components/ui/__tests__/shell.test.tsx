// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { PlatformShell } from "../PlatformShell";
import { ToastViewport } from "../Toast";
import { useToastStore } from "../toastStore";
import { mockBrowser } from "./browser";

vi.mock("next/navigation", () => ({ usePathname: () => "/play/test" }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); useToastStore.setState({ entries: [] }); });

test("gates initial admission, preserves mounted work/timers, and restores accessible focus", async () => {
  const browser = mockBrowser(767);
  localStorage.setItem("he-theme", "invalid-choice");
  const user = userEvent.setup();
  const mount = vi.fn();
  const unmount = vi.fn();
  function SessionFixture({ showWork = true }: { showWork?: boolean }) {
    const [work, setWork] = useState("");
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
      mount();
      const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
      return () => { clearInterval(interval); unmount(); };
    }, []);
    return <main><h1>Assessment</h1>{showWork && <label>Work<input value={work} onChange={(event) => setWork(event.target.value)} /></label>}<button>Review</button><output data-testid="elapsed">{seconds}</output></main>;
  }
  const tree = (showWork = true) => <PlatformShell><SessionFixture showWork={showWork} /><ToastViewport /></PlatformShell>;
  const view = render(tree());
  const heading = screen.getByRole("heading", { name: "A larger screen is required." });
  expect(heading).toHaveFocus();
  expect(mount).not.toHaveBeenCalled();
  expect(screen.queryByRole("link", { name: "Skip to content" })).not.toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Default" })).toBeChecked();

  await user.click(screen.getByRole("radio", { name: "Retro" }));
  expect(document.documentElement).toHaveAttribute("data-theme", "retro");
  expect(localStorage.getItem("he-theme")).toBe("retro");
  const deniedStorage = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage denied"); });
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByRole("radio", { name: "Default" })).toBeChecked();
  expect(document.documentElement).toHaveAttribute("data-theme", "default");
  deniedStorage.mockRestore();

  vi.useFakeTimers();
  act(() => browser.resize(768));
  expect(screen.queryByText("A larger screen is required.")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Assessment" })).toHaveFocus();
  expect(mount).toHaveBeenCalledOnce();
  const work = screen.getByLabelText("Work");
  fireEvent.change(work, { target: { value: "unsaved fix" } });
  screen.getByRole("button", { name: "Review" }).focus();
  act(() => useToastStore.getState().push({ title: "Saved draft", durationMs: 20_000 }));
  act(() => browser.resize(767));
  expect(screen.getByRole("heading", { name: "A larger screen is required." })).toHaveFocus();
  expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
  expect(work.closest("[data-he-application]")).toHaveAttribute("inert");
  expect(work).not.toBeVisible();
  act(() => vi.advanceTimersByTime(3000));
  act(() => browser.resize(769));
  expect(screen.getByRole("button", { name: "Review" })).toHaveFocus();
  expect(work).toHaveValue("unsaved fix");
  expect(screen.getByTestId("elapsed")).toHaveTextContent("3");
  expect(unmount).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("radio", { name: "Retro" }));
  expect(work).toHaveValue("unsaved fix");
  expect(mount).toHaveBeenCalledOnce();
  work.focus();
  act(() => browser.resize(767));
  view.rerender(tree(false));
  act(() => browser.resize(768));
  expect(screen.getByRole("heading", { name: "Assessment" })).toHaveFocus();
  expect(mount).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("link", { name: "Skip to content" }));
  expect(screen.getByRole("main")).toHaveFocus();
  view.unmount();
  expect(unmount).toHaveBeenCalledOnce();
});
