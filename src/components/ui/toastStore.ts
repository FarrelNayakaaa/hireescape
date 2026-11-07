"use client";

import { create } from "zustand";

export interface ToastInput {
  tone?: "info" | "success" | "warning" | "error"; title: string; description?: string; durationMs?: number;
}
export interface ToastEntry extends ToastInput { id: number; expiresAt: number }
let nextId = 0;

export const useToastStore = create<{
  entries: ToastEntry[]; push: (toast: ToastInput) => void; dismiss: (id: number) => void;
}>((set) => ({
  entries: [],
  push: (toast) => set((state) => ({ entries: [...state.entries, { ...toast, id: ++nextId, expiresAt: Date.now() + (toast.durationMs ?? 5000) }].slice(-2) })),
  dismiss: (id) => set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),
}));
