"use client";
import { useEffect, useReducer } from "react";
import { initialRoomUiState, roomUiReducer, type RoomUiState } from "../lib/flow";
export function readRoomPreferences(sessionId: string): RoomUiState {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`he:room-ui:${sessionId}`) ?? "null");
    if (!value || typeof value !== "object") return initialRoomUiState;
    const ui = value as Record<string, unknown>;
    return { activeTab: ["brief", "tests", "inquisitor", "assistant"].includes(String(ui.activeTab)) ? ui.activeTab as RoomUiState["activeTab"] : "brief",
      dismissedIntros: Array.isArray(ui.dismissedIntros) ? ui.dismissedIntros.filter((room): room is 1 | 2 | 3 => room === 1 || room === 2 || room === 3) : [] };
  } catch { return initialRoomUiState; }
}
export function useRoomPreferences(sessionId: string) {
  const [ui, dispatch] = useReducer(roomUiReducer, sessionId, readRoomPreferences);
  useEffect(() => { try { localStorage.setItem(`he:room-ui:${sessionId}`, JSON.stringify(ui)); } catch { /* UI preferences never block the recorded session. */ } }, [sessionId, ui]);
  return [ui, dispatch] as const;
}
