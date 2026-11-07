"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<Args extends unknown[]>(fn: (...args: Args) => void, ms: number) {
  const latest = useRef(fn);
  const pending = useRef<Args | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { latest.current = fn; }, [fn]);
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);
  const flush = useCallback(() => {
    const args = pending.current;
    cancel();
    if (args) latest.current(...args);
  }, [cancel]);
  useEffect(() => cancel, [cancel, ms]);
  return useCallback((...args: Args) => {
    cancel();
    pending.current = args;
    timer.current = setTimeout(flush, ms);
  }, [cancel, flush, ms]);
}
