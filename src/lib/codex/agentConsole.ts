"use client";

import { create } from "zustand";
import type { AgentMeta } from "@/lib/contracts";

interface AgentConsoleState {
  entries: AgentMeta[];
  push: (meta: AgentMeta) => void;
  clear: () => void;
}

export const useAgentConsole = create<AgentConsoleState>((set) => ({
  entries: [],
  push: (meta) => set((state) => ({ entries: [meta, ...state.entries].slice(0, 50) })),
  clear: () => set({ entries: [] }),
}));
