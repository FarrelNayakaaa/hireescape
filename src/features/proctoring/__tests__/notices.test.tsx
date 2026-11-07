// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { IntegrityNotice } from "../components/IntegrityNotice";
import type { IntegritySignal } from "@/lib/contracts";
const push = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui", () => ({ useToast: () => ({ push }) }));
afterEach(() => { cleanup(); push.mockReset(); });
it("notices a face signal once and never notices voice activity", () => {
 const voice: IntegritySignal = { id: "i1", type: "voice_activity", start: 0, end: 4000, durationMs: 4000 };
 const face: IntegritySignal = { id: "i2", type: "face_absent", start: 1000, end: 6000, durationMs: 5000 };
 const view = render(<IntegrityNotice signals={[]} locale="en" />); view.rerender(<IntegrityNotice signals={[voice]} locale="en" />); expect(push).not.toHaveBeenCalled(); view.rerender(<IntegrityNotice signals={[voice, face]} locale="en" />); view.rerender(<IntegrityNotice signals={[voice, { ...face, end: 7000 }]} locale="en" />); expect(push).toHaveBeenCalledTimes(1);
});
