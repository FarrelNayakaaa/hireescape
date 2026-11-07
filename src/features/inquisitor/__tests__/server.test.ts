import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { callStructured } from "@/lib/codex/client";
import { askInquisitor } from "../server/askInquisitor";
import { mockQuestion } from "../lib/mockQuestion";
import { input } from "./fixtures";
vi.mock("@/lib/codex/client", () => ({ callStructured: vi.fn() }));
const call = vi.mocked(callStructured);
const meta = { role: "inquisitor" as const, model: "test", promptVersion: "inquisitor@1", latencyMs: 1, attempts: 1, mock: true };
beforeEach(() => { call.mockReset(); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());
it("retries invalid output once, validates the replacement, and disables inner retries", async () => {
  call.mockResolvedValueOnce({ data: { ...mockQuestion(input), question: "You should wrap the call?" }, meta }).mockResolvedValueOnce({ data: mockQuestion(input), meta });
  expect((await askInquisitor(input)).result).not.toBeNull();
  expect(call).toHaveBeenCalledTimes(2);
  expect(call.mock.calls[0][0]).toMatchObject({ timeoutMs: 12_000, retries: 0 });
});
it("nudge skips immediately but defence retries skip then exhausts safely", async () => {
  call.mockResolvedValue({ data: { ...mockQuestion(input), skip: true }, meta });
  expect((await askInquisitor(input)).skippedReason).toBe("model_skip");
  expect(call).toHaveBeenCalledTimes(1);
  call.mockClear();
  expect((await askInquisitor({ ...input, mode: "defence", defenceIndex: 0 })).skippedReason).toBe("validation_failed");
  expect(call).toHaveBeenCalledTimes(2);
});
it("retries upstream errors then returns a nonblocking skip", async () => {
  call.mockRejectedValue(new Error("upstream"));
  expect(await askInquisitor(input)).toMatchObject({ result: null, skippedReason: "validation_failed", meta: { attempts: 2 } });
});
