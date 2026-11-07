// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { RunResult } from "@/lib/contracts";
import { HiddenTestLocks, KeyCounter, RoomDoor, RoomIntroCard, Timer, formatTime } from "../index";

afterEach(() => { cleanup(); vi.useRealTimers(); });
const labels = { label: "Time remaining", tenMinuteLabel: "10 minutes remaining", twoMinuteLabel: "2 minutes remaining" };

it("formats timer values without negative time", () => {
  expect(formatTime(2_700_000)).toBe("45:00");
  expect(formatTime(61_000)).toBe("01:01");
  expect(formatTime(1)).toBe("00:01");
  expect(formatTime(-1)).toBe("00:00");
});

it("changes timer colour at ten minutes and announces only threshold crossings", () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const { container, unmount } = render(<Timer endsAt={601_000} durationMs={2_700_000} {...labels} />);
  expect(screen.getByRole("timer")).toHaveTextContent("10:01");
  expect(container.firstChild).toHaveClass("text-he-text");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  act(() => vi.advanceTimersByTime(1000));
  expect(container.firstChild).toHaveClass("text-he-yellow");
  expect(screen.getByRole("status")).toHaveTextContent("10 minutes remaining");
  act(() => vi.advanceTimersByTime(480_000));
  expect(screen.getByRole("timer")).toHaveTextContent("02:00");
  expect(screen.getByRole("status")).toHaveTextContent("2 minutes remaining");
  expect(screen.getByRole("timer")).toHaveAttribute("aria-live", "off");
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole("status")).toHaveTextContent("2 minutes remaining");
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("renders hidden counts and statuses without leaking failure or runtime messages", () => {
  const results: RunResult = { runId: "fixture", target: "hidden", passed: 1, total: 2, failed: 1, timedOut: false, durationMs: 1,
    results: [{ name: "happy", status: "pass", durationMs: 0 }, { name: "fallback", status: "fail", durationMs: 0, message: "SECRET assertion" }] };
  const props = { summary: "1/2 hidden tests pass", emptyLabel: "Not run", openLabel: "Vault open", statusLabels: { pass: "pass", fail: "fail", error: "error" } };
  const { container, rerender } = render(<HiddenTestLocks results={results} {...props} />);
  expect(screen.getByText(/1\/2 hidden tests pass/)).toBeInTheDocument();
  expect(screen.getByLabelText("fallback — fail")).toBeInTheDocument();
  expect(container.innerHTML).not.toContain("SECRET");
  expect(screen.queryByText("Vault open")).not.toBeInTheDocument();
  rerender(<HiddenTestLocks results={{ ...results, total: 0, passed: 0, results: [] }} {...props} />);
  expect(screen.queryByText("Vault open")).not.toBeInTheDocument();
  rerender(<HiddenTestLocks results={{ ...results, total: 1, passed: 1, failed: 0, results: [results.results[0]] }} {...props} />);
  expect(screen.getByText("Vault open")).toBeInTheDocument();
  rerender(<HiddenTestLocks results={null} {...props} />);
  expect(screen.getByText("Not run")).toBeInTheDocument();
});

it("communicates door and key states with text and accessible labels", () => {
  render(<><RoomDoor room={1} state="active" label="Triage" stateLabel="Active" />
    <KeyCounter keys={1} label="Keys earned: 1/3" earnedLabel="Key earned" lockedLabel="Key not yet earned" /></>);
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(screen.getByText("Triage")).toBeInTheDocument();
  expect(screen.getByLabelText("Key earned")).toBeInTheDocument();
  expect(screen.getAllByLabelText("Key not yet earned")).toHaveLength(2);
});

it("dismisses the room intro after 1.5 seconds and cleans up", () => {
  vi.useFakeTimers();
  const dismiss = vi.fn();
  const { unmount } = render(<RoomIntroCard room={1} title="Triage" goal="Find where it breaks." skipLabel="Any key" continueLabel="Continue" onDismiss={dismiss} />);
  act(() => vi.advanceTimersByTime(1500));
  expect(dismiss).toHaveBeenCalledOnce();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("lets any key skip the room intro", () => {
  vi.useFakeTimers();
  const dismiss = vi.fn();
  render(<RoomIntroCard room={1} title="Triage" goal="Find where it breaks." skipLabel="Any key" continueLabel="Continue" onDismiss={dismiss} />);
  fireEvent.keyDown(window, { key: "Enter" });
  act(() => vi.advanceTimersByTime(1500));
  expect(dismiss).toHaveBeenCalledOnce();
});
