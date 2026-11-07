import { afterEach, expect, it, vi } from "vitest";
import { callStructured } from "@/lib/codex/client";
import { askAssistant } from "../server/askAssistant";
import { input } from "./fixtures";
vi.mock("@/lib/codex/client", () => ({ callStructured: vi.fn() }));
afterEach(() => vi.clearAllMocks());
it("calls the shared wrapper with one retry and drops an invalid suggestion", async () => {
  vi.mocked(callStructured).mockResolvedValue({ data: { message: "Explanation", suggestion: { summary: "bad", code: "return service;" } }, meta: { role: "assistant", model: "mock", promptVersion: "assistant@1", mock: true, latencyMs: 1, attempts: 1 } });
  expect((await askAssistant(input)).suggestion).toBeNull();
  expect(callStructured).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 20_000, retries: 1, role: "assistant" }));
});
