"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { importSessions, useSessionStore } from "@/features/session";

const subscribe = (notify: () => void) => {
  const persistence = useSessionStore.persist;
  if (!persistence) return () => {};
  const start = persistence.onHydrate(notify);
  const finish = persistence.onFinishHydration(notify);
  return () => { start(); finish(); };
};

export function useSessionHydration() {
  const hydrated = useSyncExternalStore(subscribe, () => useSessionStore.persist?.hasHydrated() ?? false, () => false);
  const [error, setError] = useState(false);
  const retry = useCallback(async () => {
    setError(false);
    try {
      if (!useSessionStore.persist) throw new Error("Session storage is unavailable");
      // The session store validates a persisted object even on an empty browser.
      // Initialize its canonical empty shape through the public API; preserve any
      // existing value (including unreadable evidence) for recovery rather than replacing it.
      if (localStorage.getItem("he:sessions") === null) importSessions([]);
      await useSessionStore.persist.rehydrate();
      if (!useSessionStore.persist.hasHydrated()) throw new Error("Session recovery failed");
    } catch {
      console.error("Session recovery failed");
      setError(true);
    }
  }, []);
  useEffect(() => {
    if (!useSessionStore.persist?.hasHydrated()) void Promise.resolve().then(retry);
  }, [retry]);
  return { hydrated, error, retry };
}
