// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { RunResult } from "@/lib/contracts";
import { TestResultsPanel } from "../components/TestResultsPanel";

afterEach(cleanup);
const result: RunResult = {
  runId: "run_testtest", target: "hidden", total: 2, passed: 1, failed: 1, timedOut: false, durationMs: 1,
  results: [{ name: "happy path", status: "pass", durationMs: 0 }, { name: "fallback", status: "fail", message: "SECRET assertion payload", durationMs: 0 }],
};

it("renders hidden names and counts without assertion messages or runtime details", () => {
  const { container } = render(<TestResultsPanel visible={null} hidden={{ ...result, runtimeError: "SECRET runtime payload" }} running={false} />);
  expect(screen.getByText("✗ 1/2 hidden tests pass")).toBeInTheDocument();
  expect(screen.getByText(/fallback — fail/)).toBeInTheDocument();
  expect(container.textContent).not.toContain("SECRET");
  expect(container.innerHTML).not.toContain("SECRET");
});

it("renders visible failure details", () => {
  render(<TestResultsPanel visible={{ ...result, target: "visible" }} hidden={null} running={false} />);
  expect(screen.getByText("SECRET assertion payload")).toBeInTheDocument();
});

it("shows timeout and runtime banners", () => {
  render(<TestResultsPanel visible={{ ...result, target: "visible", timedOut: true, runtimeError: "Your code failed to load: syntax error" }} hidden={null} running={false} />);
  expect(screen.getByText(/Tests timed out/)).toBeInTheDocument();
  expect(screen.getByText(/Your code failed to load/)).toBeInTheDocument();
});

it("shows idle and running states", () => {
  const { rerender } = render(<TestResultsPanel visible={null} hidden={null} running={false} />);
  expect(screen.getByText("Run the tests to see results")).toBeInTheDocument();
  rerender(<TestResultsPanel visible={null} hidden={null} running />);
  expect(screen.getByRole("status")).toHaveTextContent("Running…");
});
