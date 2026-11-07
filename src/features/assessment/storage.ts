import type { StateStorage } from "zustand/middleware";

let persistenceWarning: string | null = null;
export function getPersistenceWarning(): string | null { return persistenceWarning; }
export const warnStorage = () => { persistenceWarning = "Browser storage is unavailable or unreadable. Keep this tab open and export a backup."; };
export const storage: StateStorage = {
  getItem(name) {
    if (typeof window === "undefined") return null;
    try {
      const value = localStorage.getItem(name);
      if (value !== null) JSON.parse(value);
      return value;
    } catch { warnStorage(); return null; }
  },
  setItem(name, value) {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(name, value); } catch { warnStorage(); }
  },
  removeItem(name) {
    if (typeof window === "undefined") return;
    try { localStorage.removeItem(name); } catch { warnStorage(); }
  },
};
