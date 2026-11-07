// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useDebouncedCallback, useIdle, useNow } from "../index";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1000); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("coalesces calls, uses the newest callback, and clears its timer on unmount", () => {
  const first = vi.fn();
  const latest = vi.fn();
  const { result, rerender, unmount } = renderHook(({ fn }) => useDebouncedCallback(fn, 1500), { initialProps: { fn: first } });
  act(() => { result.current("one"); vi.advanceTimersByTime(1000); result.current("two"); });
  expect(first).not.toHaveBeenCalled();
  rerender({ fn: latest });
  act(() => vi.advanceTimersByTime(1500));
  expect(latest).toHaveBeenCalledExactlyOnceWith("two");
  act(() => result.current("cancelled"));
  unmount();
  act(() => vi.advanceTimersByTime(2000));
  expect(latest).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it.each(["keydown", "pointerdown", "pointermove", "input"])("resets idle on %s activity", (event) => {
  const { result, unmount } = renderHook(() => useIdle(5000));
  expect(result.current).toBe(false);
  act(() => vi.advanceTimersByTime(5000));
  expect(result.current).toBe(true);
  act(() => window.dispatchEvent(new Event(event)));
  expect(result.current).toBe(false);
  act(() => vi.advanceTimersByTime(4999));
  expect(result.current).toBe(false);
  act(() => vi.advanceTimersByTime(1));
  expect(result.current).toBe(true);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("ticks useNow at the requested interval and cleans up", () => {
  const { result, unmount } = renderHook(() => useNow(1000));
  expect(result.current).toBe(1000);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe(2000);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
