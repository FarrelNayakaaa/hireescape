// @vitest-environment jsdom
import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Monaco } from "@monaco-editor/react";
import type { AssessmentConfig, Room } from "@/lib/contracts";
import { getSession, useEditorRecorder, useSessionStore } from "@/features/session";
import { postAgent } from "@/lib/api-client";
import { useAssistant } from "../hooks/useAssistant";
import { AssistantPanel } from "../components/AssistantPanel";
import fixture from "@/lib/codex/fixtures/assistant.json";
import { assessment, challenge } from "./fixtures";
import { fakeEditor } from "./editorFixture";
vi.mock("@/lib/api-client", () => ({ postAgent: vi.fn() }));
vi.mock("../components/ReviewModal", () => ({ ReviewModal: ({ onClose }: { onClose(): void }) => <div role="dialog"><button onClick={onClose}>Close review</button></div> }));
const post = vi.mocked(postAgent); const onTyping = vi.fn();
const meta = { role: "assistant" as const, model: "mock", promptVersion: "test", mock: true, latencyMs: 100, attempts: 1 };
beforeEach(() => { useSessionStore.setState({ sessions: {} }); localStorage.clear(); post.mockReset().mockResolvedValue({ ...fixture.demoFix, meta }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup(room: Room = 2, config: AssessmentConfig = assessment) {
  const id = useSessionStore.getState().start(config, challenge); useSessionStore.getState().record(id, { type: "room_enter", room, data: { room } });
  const fake = fakeEditor(challenge.starterCode);
  function App() {
    const session = useSessionStore((state) => state.sessions[id]); const recorder = useEditorRecorder(id);
    const handleMount = recorder.handleMount;
    useEffect(() => { handleMount(fake.instance, {} as Monaco); }, [handleMount]);
    const assistant = useAssistant({ assessment: config, challenge, session, room, getRecorder: () => recorder });
    return <AssistantPanel session={session} assessment={config} room={room} assistant={assistant} onTyping={onTyping} />;
  }
  render(<App />); return { id, fake, session: () => getSession(id)! };
}
async function askFix() {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "fix it" } }); fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
  await screen.findByRole("button", { name: "Apply suggestion" });
}
it.each([{ room: 1 as const, on: true, reason: "Unlocks in Room 2 — triage is yours" }, { room: 3 as const, on: true, reason: "The defence is in your own words" }, { room: 2 as const, on: false, reason: "Off for this assessment" }])("locks room $room / AI $on without input or network", ({ room, on, reason }) => {
  setup(room, { ...assessment, aiAssistance: on }); expect(screen.getByText(reason)).toBeInTheDocument(); expect(screen.queryByRole("textbox")).not.toBeInTheDocument(); expect(post).not.toHaveBeenCalled();
});
it.each([false, true])("applies through the real recorder and records reviewedFirst=%s with provenance", async (reviewed) => {
  const { fake, session } = setup(); await askFix();
  if (reviewed) { fireEvent.click(screen.getByRole("button", { name: "Review diff" })); expect(screen.getByRole("dialog")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Close review" })); }
  fireEvent.click(screen.getByRole("button", { name: "Apply suggestion" }));
  expect(fake.instance.getValue()).toBe(fixture.demoFix.suggestion.code); expect(session().finalCode).toBe(fixture.demoFix.suggestion.code);
  expect(session().lineOrigins).toContain("ai"); expect(session().events.at(-1)).toMatchObject({ type: "ai_apply", data: { suggestionId: "s1", reviewedFirst: reviewed } });
  const lines = session().finalCode.split("\n"); const index = session().lineOrigins.indexOf("ai"); lines[index] += " // independently reviewed";
  await act(async () => { fake.change(lines.join("\n")); await Promise.resolve(); });
  expect(session().lineOrigins[index]).toBe("ai_edited");
  const suggestion = session().suggestions[0]; expect(session().events.find((event) => event.id === suggestion.responseEventId)).toMatchObject({ type: "assistant_response", data: { suggestionId: suggestion.id } });
  const request = post.mock.calls[0][1]; for (const key of ["hiddenTests", "referenceFix", "integrity"]) expect(request).not.toHaveProperty(key);
});
it("matches pasted saved suggestions as AI without requiring the Apply button", async () => {
  const { fake, session } = setup(); await askFix();
  await act(async () => { fake.paste(fixture.demoFix.suggestion.code); await Promise.resolve(); });
  expect(session().lineOrigins).toContain("ai"); expect(session().events.at(-1)).toMatchObject({ type: "paste", data: { matchesSuggestionId: "s1" } });
});
it("keeps Shift+Enter for newlines, shows the counter, and retries an inline failure", async () => {
  setup(); post.mockRejectedValueOnce(new Error("offline"));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "fix it" } });
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: true }); expect(post).not.toHaveBeenCalled();
  expect(screen.getByText("6/2000")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Assistant unavailable — try again");
  fireEvent.click(screen.getByRole("button", { name: "Retry" })); await screen.findByRole("button", { name: "Apply suggestion" }); expect(post).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(screen.getByRole("textbox")).toBeEnabled());
  expect(screen.queryByRole("button", { name: /copy/i })).not.toBeInTheDocument();
});
it("uses Indonesian controls and error recovery for an Indonesian assessment", async () => {
  setup(2, { ...assessment, locale: "id" }); post.mockRejectedValueOnce(new Error("offline"));
  fireEvent.change(screen.getByRole("textbox", { name: "Tanya Assistant" }), { target: { value: "perbaiki" } });
  fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Assistant tidak tersedia — coba lagi");
  fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
  await screen.findByRole("button", { name: "Terapkan saran" }); expect(screen.getByRole("button", { name: "Tinjau perbedaan" })).toBeEnabled();
  expect(post.mock.calls[0][1]).toMatchObject({ locale: "id" });
});
