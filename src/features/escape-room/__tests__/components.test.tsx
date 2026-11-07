// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { AssessmentConfig, RunResult } from "@/lib/contracts";
import { AssessmentState } from "../components/AssessmentState";
import { RulesScreen } from "../components/RulesScreen";
import { RoomHeader } from "../components/RoomHeader";
import { RoomNavigation } from "../components/RoomNavigation";
import { RightPanel } from "../components/RightPanel";
import { EditorPane } from "../components/EditorPane";
import { deriveFlow } from "../lib/flow";

afterEach(cleanup);
const assessment: AssessmentConfig = {
  id: "fictional-assessment", challengeId: "fixture", candidateAlias: "Candidate A (fictional)", level: "mid", aiAssistance: true,
  durationMin: 45, proctoring: { mode: "off", required: false, captureSnapshots: false }, locale: "en", token: "fixture", createdAt: "2026-11-07T02:30:00.000Z",
};

it.each([true, false])("shows the correct AI rules and requires acknowledgement (AI %s)", (aiAssistance) => {
  const start = vi.fn();
  render(<RulesScreen assessment={{ ...assessment, aiAssistance }} title="INC-FIXTURE" onStart={start} />);
  expect(screen.getByText(aiAssistance ? /You may use the built-in assistant/ : /Please work without AI tools/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start assessment" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "I understand" }));
  fireEvent.click(screen.getByRole("button", { name: "Start assessment" }));
  expect(start).toHaveBeenCalledOnce();
});

it("keeps Start disabled when assessment integration has not supplied an action", () => {
  render(<RulesScreen assessment={assessment} title="INC-FIXTURE" />);
  fireEvent.click(screen.getByRole("checkbox", { name: "I understand" }));
  expect(screen.getByRole("button", { name: "Start assessment" })).toBeDisabled();
  expect(screen.getByText(/contact the person/)).toBeInTheDocument();
});

it.each([[1, true, "Unlocks in Room 2 — triage is yours"], [2, false, "Off for this assessment"], [3, true, "The defence is in your own words"]] as const)("shows the assistant lock reason in room %s", (room, aiAssistance, reason) => {
  render(<RightPanel room={room} aiAssistance={aiAssistance} title="INC-FIXTURE" brief="Fictional incident" />);
  fireEvent.click(screen.getByRole("tab", { name: "Assistant" }));
  expect(screen.getByRole("tabpanel")).toHaveTextContent(reason);
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

it("supports keyboard tab navigation and placeholder panels", () => {
  render(<RightPanel room={2} aiAssistance title="INC-FIXTURE" brief="Fictional incident" />);
  const brief = screen.getByRole("tab", { name: "Brief" });
  fireEvent.keyDown(brief, { key: "End" });
  expect(screen.getByRole("tab", { name: "Assistant" })).toHaveFocus();
  expect(screen.getByRole("tabpanel")).toHaveTextContent(/Coming up/);
  fireEvent.keyDown(screen.getByRole("tab", { name: "Assistant" }), { key: "Home" });
  expect(brief).toHaveFocus();
  expect(screen.getByRole("tabpanel")).toHaveTextContent("Fictional incident");
});

it("renders hidden results without revealing messages", () => {
  const result: RunResult = { runId: "fixture", target: "hidden", total: 1, passed: 0, failed: 1, timedOut: false, durationMs: 1,
    runtimeError: "SECRET runtime", results: [{ name: "fallback", status: "fail", message: "SECRET assertion", durationMs: 0 }] };
  const { container } = render(<RightPanel room={2} aiAssistance title="INC-FIXTURE" brief="" hidden={result} />);
  fireEvent.click(screen.getByRole("tab", { name: "Tests" }));
  expect(container.innerHTML).not.toContain("SECRET");
  expect(screen.getByRole("tabpanel")).toHaveTextContent("0/1 hidden tests pass");
});

it("does not enable navigation without both an unlock and an integration callback", () => {
  const next = vi.fn();
  const { rerender } = render(<RoomNavigation room={2} unlocked={false} onContinue={next} />);
  expect(screen.getByRole("button")).toBeDisabled();
  expect(screen.getByText(/Complete this room/)).toBeInTheDocument();
  rerender(<RoomNavigation room={2} unlocked />);
  expect(screen.getByRole("button")).toBeDisabled();
  expect(screen.getByText(/not available yet/)).toBeInTheDocument();
  rerender(<RoomNavigation room={2} unlocked onContinue={next} />);
  fireEvent.click(screen.getByRole("button"));
  expect(next).toHaveBeenCalledOnce();
});

it("shows event-derived door states and an unstarted timer without starting a session", () => {
  render(<RoomHeader assessment={assessment} title="INC-FIXTURE" flow={deriveFlow(null, assessment)} />);
  expect(screen.getAllByText("Locked")).toHaveLength(3);
  expect(screen.getByText("45:00")).toBeInTheDocument();
  expect(screen.getByText("AI Assistance: ON")).toBeInTheDocument();
});

it("renders loading, error/retry, and not-found states", () => {
  const retry = vi.fn();
  const { rerender } = render(<AssessmentState state="loading" />);
  expect(screen.getByRole("status")).toHaveTextContent(/Opening/);
  rerender(<AssessmentState state="error" onRetry={retry} />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
  rerender(<AssessmentState state="not_found" />);
  expect(screen.getByRole("heading", { name: "Assessment not found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to manager" })).toHaveAttribute("href", "/manager");
  expect(screen.queryByRole("button", { name: "Start assessment" })).not.toBeInTheDocument();
});

it("shows an empty editor state without creating a session", () => {
  render(<EditorPane sessionId="not-a-real-session" />);
  expect(screen.getByText("No session code is available yet.")).toBeInTheDocument();
});

it("restores recorded hidden counts without claiming the tests have never run", () => {
  render(<RightPanel room={2} aiAssistance title="INC-FIXTURE" brief="" recorded={{
    visible: { passed: 2, total: 2 }, hidden: { passed: 3, total: 6, failedNames: ["fallback"] },
    timedOut: false, runtimeError: null, codeHash: "fixture",
  }} />);
  fireEvent.click(screen.getByRole("tab", { name: "Tests" }));
  expect(screen.getByRole("tabpanel")).toHaveTextContent("3/6 hidden tests pass");
  expect(screen.queryByText("Hidden tests have not run yet.")).not.toBeInTheDocument();
});
