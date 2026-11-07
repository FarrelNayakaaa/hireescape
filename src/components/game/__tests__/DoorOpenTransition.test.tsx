// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DoorOpenTransition } from "../DoorOpenTransition";
vi.mock("framer-motion", async (original) => ({ ...await original<typeof import("framer-motion")>(), useReducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it.each([false, true])("uses door halves at 500ms or a 150ms reduced-motion fade (%s)", (reduced) => {
  vi.useFakeTimers(); vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced })));
  const done = vi.fn(); const { container } = render(<DoorOpenTransition onComplete={done} room={2} label="Opening" />);
  expect(screen.getByRole("status")).toHaveAttribute("data-reduced-motion", String(reduced));
  expect(container.querySelectorAll("[data-door-half]")).toHaveLength(reduced ? 0 : 2);
  act(() => vi.advanceTimersByTime(reduced ? 149 : 499)); expect(done).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1)); expect(done).toHaveBeenCalledOnce();
});
