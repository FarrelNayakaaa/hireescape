// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSessionStore, getSession } from "@/features/session";
import { InquisitorPanel } from "../components/InquisitorPanel";
import { assessment, challenge, input } from "./fixtures";
import { mockQuestion } from "../lib/mockQuestion";
afterEach(cleanup);
it("exposes empty/thinking states then an optional recorded answer and cited-line control", () => {
  useSessionStore.setState({ sessions: {} }); const id = useSessionStore.getState().start(assessment, challenge); const onLine = vi.fn();
  const view = render(<InquisitorPanel session={getSession(id)!} thinking meta={null} onLine={onLine} />);
  expect(screen.getByText("The Inquisitor is watching your changes. Press Check ✦ anytime.")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Inquisitor is thinking");
  const output = mockQuestion(input);
  const question = useSessionStore.getState().record(id, { type: "inquisitor_question", room: 2, text: output.question, data: { mode: "nudge", intent: output.intent, ...output.groundedIn, defenceIndex: null } });
  view.rerender(<InquisitorPanel session={getSession(id)!} thinking={false} meta={{ role: "inquisitor", model: "mock", promptVersion: "test", latencyMs: 800, mock: true, attempts: 1 }} onLine={onLine} />);
  fireEvent.click(screen.getByRole("button", { name: `L${output.groundedIn.line}` })); expect(onLine).toHaveBeenCalledWith(output.groundedIn.line);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "I would compare the dependency behavior under failure." } });
  fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
  expect(getSession(id)?.events.at(-1)).toMatchObject({ type: "candidate_answer", data: { questionEventId: question.id } });
});
