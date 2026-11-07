import type { AssessmentConfig, Room, SessionEvent } from "@/lib/contracts";

export type Phase = "loading" | "not_found" | "security_check" | "rules" | "room1" | "room2" | "room3" | "escaped" | "timeout" | "blocked";
export type FlowState = {
  phase: Phase;
  room: Room | 0;
  completedRooms: Room[];
  startedAtMs: number | null;
};

export function deriveFlow(events: SessionEvent[] | null, assessment: AssessmentConfig | null | undefined,
  options: { startedAt?: string; consentDeclined?: boolean } = {}): FlowState {
  const flow: FlowState = { phase: "rules", room: 0, completedRooms: [], startedAtMs: null };
  if (assessment === undefined) return { ...flow, phase: "loading" };
  if (assessment === null) return { ...flow, phase: "not_found" };
  if (assessment.proctoring.required && options.consentDeclined) return { ...flow, phase: "blocked" };
  // B8 owns Security Check. Until then, an unstarted assessment opens at Rules.
  let started = false;
  for (const event of events ?? []) {
    if (event.type === "session_start") {
      started = true;
      const startedAt = options.startedAt ? Date.parse(options.startedAt) : NaN;
      flow.startedAtMs = Number.isFinite(startedAt) ? startedAt : null;
    }
    if (event.type === "rules_ack" && started && flow.room === 0) {
      flow.phase = "room1";
      flow.room = 1;
    }
    if (event.type === "room_complete" && event.data?.room === flow.room && flow.room !== 0) {
      const room = flow.room;
      if (!flow.completedRooms.includes(room)) flow.completedRooms.push(room);
      if (room < 3) {
        flow.room = (room + 1) as Room;
        flow.phase = flow.room === 2 ? "room2" : "room3";
      }
    }
    if (event.type === "session_end") {
      if (event.data?.reason === "escaped") flow.phase = "escaped";
      if (event.data?.reason === "timeout") flow.phase = "timeout";
      if (event.data?.reason === "abandoned") flow.phase = "blocked";
      break;
    }
  }
  return flow;
}

export type PanelTab = "brief" | "tests" | "inquisitor" | "assistant";
export type RoomUiState = { activeTab: PanelTab; dismissedIntros: Room[] };
export type RoomUiAction = { type: "select_tab"; tab: PanelTab } | { type: "dismiss_intro"; room: Room };
export const initialRoomUiState: RoomUiState = { activeTab: "brief", dismissedIntros: [] };

export function roomUiReducer(state: RoomUiState, action: RoomUiAction): RoomUiState {
  if (action.type === "select_tab") return { ...state, activeTab: action.tab };
  return state.dismissedIntros.includes(action.room) ? state : { ...state, dismissedIntros: [...state.dismissedIntros, action.room] };
}
