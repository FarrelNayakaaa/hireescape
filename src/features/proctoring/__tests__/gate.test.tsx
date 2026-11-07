// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProctoringGate } from "../components/ProctoringGate";
import { useIntegrityStore } from "../store";
import type { AssessmentConfig } from "@/lib/contracts";
const assessment: AssessmentConfig = { id: "fictional-proctoring", challengeId: "seed", candidateAlias: "Candidate A (fictional)", level: "mid", aiAssistance: false, durationMin: 45, proctoring: { mode: "camera_mic", required: false, captureSnapshots: false }, locale: "en", token: "test", createdAt: new Date(0).toISOString() };
const gum = vi.fn();
beforeEach(() => { localStorage.clear(); useIntegrityStore.setState({ records: {}, preparations: {}, pending: {} }); gum.mockReset(); Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: gum } }); Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: vi.fn().mockRejectedValue(new Error("refused")) }); });
afterEach(cleanup);
it.each(["off", "browser"] as const)("mode %s never requests camera/microphone", async (mode) => {
 render(<ProctoringGate assessment={{ ...assessment, proctoring: { ...assessment.proctoring, mode } }} session={null}><p>Rules ready</p></ProctoringGate>);
 if (mode === "browser") { fireEvent.click(screen.getByRole("button", { name: "Enter the vault" })); await screen.findByText("Rules ready"); }
 expect(gum).not.toHaveBeenCalled();
});
it("consent precedes any permission request and optional refusal continues in browser mode", async () => {
 render(<ProctoringGate assessment={assessment} session={null}><p>Rules ready</p></ProctoringGate>);
 expect(screen.getByText(/No video or audio is recorded or uploaded/)).toBeInTheDocument(); expect(gum).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button", { name: "I don't agree" })); fireEvent.click(screen.getByRole("button", { name: "Enter the vault" }));
 await screen.findByText("Rules ready"); expect(useIntegrityStore.getState().preparations[assessment.id]).toMatchObject({ mode: "browser", consent: "declined" }); expect(gum).not.toHaveBeenCalled();
});
it("required refusal shows the accommodation path without creating a session or requesting media", () => {
 render(<ProctoringGate assessment={{ ...assessment, proctoring: { ...assessment.proctoring, required: true } }} session={null}><p>Rules ready</p></ProctoringGate>);
 fireEvent.click(screen.getByRole("button", { name: "I don't agree" })); expect(screen.getByRole("heading")).toHaveTextContent("Contact the hiring team for an alternative arrangement"); expect(screen.queryByText("Rules ready")).not.toBeInTheDocument(); expect(gum).not.toHaveBeenCalled();
});
it("permission denial is a calm browser fallback for optional assessments", async () => {
 gum.mockRejectedValue(new Error("denied")); render(<ProctoringGate assessment={assessment} session={null}><p>Rules ready</p></ProctoringGate>);
 fireEvent.click(screen.getByRole("button", { name: "I agree" })); await screen.findByText(/Camera or microphone unavailable/); expect(gum).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole("button", { name: "Enter the vault" })); await waitFor(() => expect(useIntegrityStore.getState().preparations[assessment.id]?.mode).toBe("browser"));
});
