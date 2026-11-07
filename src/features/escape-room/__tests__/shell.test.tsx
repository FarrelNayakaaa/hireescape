// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getSession, useSessionStore } from "@/features/session";
import { useAssessmentBundle } from "@/features/assessment";
import { EscapeRoomShell } from "../components/EscapeRoomShell";
import { RunBar } from "../components/RunBar";
import { assessment, challenge } from "./integrationFixtures";

vi.mock("@/features/assessment", () => ({ useAssessmentBundle: vi.fn() }));
vi.mock("../components/EditorPane", () => ({ EditorPane: ({ sessionId, readOnly }: { sessionId: string; readOnly: boolean }) => {
  const session = useSessionStore((state) => state.sessions[sessionId]);
  return <textarea aria-label="Editor fixture" value={session.finalCode} readOnly={readOnly} onChange={(event) => useSessionStore.getState().applyCode(sessionId, event.target.value, "manual")} />;
} }));
const bundle = vi.mocked(useAssessmentBundle);
beforeEach(() => {
  localStorage.clear();
  useSessionStore.setState({ sessions: {} });
  bundle.mockReturnValue({ status: "ready", bundle: { assessment, challenge } });
});
afterEach(cleanup);

it("renders assessment loading and unknown-ID states", async () => {
  bundle.mockReturnValue({ status: "loading", bundle: null });
  const { rerender } = render(<EscapeRoomShell assessmentId={assessment.id} />);
  expect(screen.getByText("Opening your assessment…")).toBeInTheDocument();
  bundle.mockReturnValue({ status: "not_found", bundle: null });
  rerender(<EscapeRoomShell assessmentId={assessment.id} />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Assessment not found" })).toBeInTheDocument());
});

it("creates one session, records room transitions, and restores code, room and timer base", async () => {
  const view = render(<EscapeRoomShell assessmentId={assessment.id} />);
  await waitFor(() => expect(screen.getByRole("checkbox", { name: "I understand" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("checkbox", { name: "I understand" }));
  fireEvent.click(screen.getByRole("button", { name: "Start assessment" }));
  const session = Object.values(useSessionStore.getState().sessions)[0];
  expect(session.events.map((event) => event.type)).toEqual(["session_start", "rules_ack", "room_enter"]);
  fireEvent.click(screen.getByRole("button", { name: "Continue to Room 2" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Editor fixture" }), { target: { value: "candidate code" } });
  const saved = getSession(session.id)!;
  expect(saved.events.slice(-2).map((event) => event.type)).toEqual(["room_complete", "room_enter"]);
  expect(saved.events.at(-1)?.data?.room).toBe(2);
  view.unmount();
  render(<EscapeRoomShell assessmentId={assessment.id} />);
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Editor fixture" })).toHaveValue("candidate code"));
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(Object.values(useSessionStore.getState().sessions)).toHaveLength(1);
  expect(getSession(session.id)?.startedAt).toBe(session.startedAt);
});

it("restores the vault-open state and only enters Room 3 on request", async () => {
  const store = useSessionStore.getState();
  const id = store.start(assessment, challenge);
  store.record(id, { type: "rules_ack", room: 0, data: {} });
  store.record(id, { type: "room_enter", room: 1, data: { room: 1 } });
  store.record(id, { type: "room_complete", room: 1, data: { room: 1, durationSec: 2 } });
  store.record(id, { type: "room_enter", room: 2, data: { room: 2 } });
  store.record(id, { type: "room_complete", room: 2, data: { room: 2, durationSec: 5 } });
  render(<EscapeRoomShell assessmentId={assessment.id} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Enter Room 3" })).toBeEnabled());
  expect(screen.getByRole("textbox", { name: "Editor fixture" })).toHaveAttribute("readonly");
  fireEvent.click(screen.getByRole("button", { name: "Enter Room 3" }));
  expect(screen.getByText(/Defence questions will be available/)).toBeInTheDocument();
  expect(getSession(id)?.events.at(-1)).toMatchObject({ type: "room_enter", data: { room: 3 } });
});

it("restores recorded summaries and hides stored runtime details", async () => {
  const store = useSessionStore.getState();
  const id = store.start(assessment, challenge);
  store.record(id, { type: "rules_ack", room: 0, data: {} });
  store.record(id, { type: "test_run", room: 1, data: { visible: { passed: 2, total: 2 }, hidden: { passed: 0, total: 0, failedNames: [] }, timedOut: false, runtimeError: "SECRET detail", codeHash: "fixture" } });
  const { container } = render(<EscapeRoomShell assessmentId={assessment.id} />);
  await waitFor(() => expect(screen.getByRole("tab", { name: "Tests" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("tab", { name: "Tests" }));
  expect(screen.getByText("2/2 visible tests pass")).toBeInTheDocument();
  expect(container.innerHTML).not.toContain("SECRET detail");
});

it("disables Run and navigation during a run and explains the disabled Check button", () => {
  render(<RunBar room={2} running unlocked={false} hidden={null} recorded={null} onRun={vi.fn()} locale="en" />);
  expect(screen.getByRole("button", { name: /Run tests/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Enter Room 3" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Check ✦" })).toBeDisabled();
  expect(screen.getByText("Questions will be available in a later update.")).toBeInTheDocument();
});

it("does not restart an ended session after reload", async () => {
  const id = useSessionStore.getState().start(assessment, challenge);
  useSessionStore.getState().finish(id, "timeout", challenge.starterCode);
  render(<EscapeRoomShell assessmentId={assessment.id} />);
  await waitFor(() => expect(screen.getByRole("heading", { name: /Time’s up/ })).toBeInTheDocument());
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(Object.values(useSessionStore.getState().sessions)).toHaveLength(1);
});

it("waits for session hydration before showing Rules", async () => {
  const persistence = useSessionStore.persist;
  const original = persistence.getOptions().storage;
  let finish!: (value: { state: { sessions: Record<string, never> }; version: number }) => void;
  const data = new Promise<{ state: { sessions: Record<string, never> }; version: number }>((resolve) => { finish = resolve; });
  persistence.setOptions({ storage: { getItem: () => data, setItem: () => {}, removeItem: () => {} } });
  try {
    const pending = persistence.rehydrate();
    render(<EscapeRoomShell assessmentId={assessment.id} />);
    expect(screen.getByText("Opening your assessment…")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await act(async () => { finish({ state: { sessions: {} }, version: 0 }); await pending; });
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeInTheDocument());
  } finally { persistence.setOptions({ storage: original }); }
});

it("initializes a fresh browser through the public API without creating a session", async () => {
  localStorage.removeItem("he:sessions");
  await useSessionStore.persist.rehydrate();
  render(<EscapeRoomShell assessmentId={assessment.id} />);
  await waitFor(() => expect(screen.getByRole("checkbox")).toBeInTheDocument());
  expect(Object.keys(useSessionStore.getState().sessions)).toHaveLength(0);
  expect(JSON.parse(localStorage.getItem("he:sessions")!).state.sessions).toEqual({});
});
