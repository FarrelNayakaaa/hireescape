// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { readRoomPreferences, useRoomPreferences } from "../hooks/useRoomPreferences";
afterEach(() => { cleanup(); localStorage.clear(); });
it("restores the selected tab and dismissed intros independently per session", () => {
  const first = renderHook(() => useRoomPreferences("fictional"));
  act(() => first.result.current[1]({ type: "select_tab", tab: "assistant" }));
  act(() => first.result.current[1]({ type: "dismiss_intro", room: 2 }));
  first.unmount();
  const restored = renderHook(() => useRoomPreferences("fictional"));
  expect(restored.result.current[0]).toEqual({ activeTab: "assistant", dismissedIntros: [2] });
  expect(readRoomPreferences("other")).toEqual({ activeTab: "brief", dismissedIntros: [] });
});
it("tolerates malformed or future UI preferences without losing the session", () => {
  localStorage.setItem("he:room-ui:fictional", "invalid JSON");
  expect(readRoomPreferences("fictional").activeTab).toBe("brief");
  localStorage.setItem("he:room-ui:fictional", JSON.stringify({ activeTab: "unknown", dismissedIntros: [0, 1, 5] }));
  expect(readRoomPreferences("fictional")).toEqual({ activeTab: "brief", dismissedIntros: [1] });
});
