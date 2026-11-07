// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DoorOpenTransition } from "../DoorOpenTransition";
import { mockBrowser } from "@/components/ui/__tests__/browser";
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it.each([false, true])("uses door halves at 500ms or a 150ms reduced-motion fade (%s)", (reduced) => {
  mockBrowser(1280, reduced); vi.useFakeTimers();
  const done = vi.fn(); const { container } = render(<DoorOpenTransition onComplete={done} room={2} label="Opening" />);
  expect(screen.getByRole("status")).toHaveAttribute("data-reduced-motion", String(reduced));
  expect(container.querySelectorAll("[data-door-half]")).toHaveLength(reduced ? 0 : 2);
  act(() => vi.advanceTimersByTime(reduced ? 149 : 499)); expect(done).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1)); expect(done).toHaveBeenCalledOnce();
});
