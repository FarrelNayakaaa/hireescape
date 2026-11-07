// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { listenBrowserSignals } from "../media/browserSignals";
it("emits derived visibility/focus/fullscreen samples and removes every listener", () => {
 const sample = vi.fn(); const stop = listenBrowserSignals(sample, () => 123);
 Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange"));
 window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("fullscreenchange"));
 expect(sample).toHaveBeenCalledWith({ kind: "visibility", t: 123, hidden: true }); expect(sample).toHaveBeenCalledWith({ kind: "focus", t: 123, focused: false }); expect(sample).toHaveBeenCalledWith({ kind: "fullscreen", t: 123, active: false });
 const count = sample.mock.calls.length; stop(); window.dispatchEvent(new Event("blur")); document.dispatchEvent(new Event("visibilitychange")); expect(sample).toHaveBeenCalledTimes(count);
});
