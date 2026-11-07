// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SignalMap } from "../SignalMap";
afterEach(cleanup);
it("shows only counts and an unassessed AI axis, without numeric judgements", () => {
  const { container } = render(<SignalMap counts={{ debugging: 12, design: 2, communication: 3, ai_supervision: null }} labels={{ debugging: "Debugging", design: "Design", communication: "Communication", ai_supervision: "AI supervision" }} title="Signals captured" tooltip="Signals are evidence collected for a human reviewer, not a score." notAssessed="Not assessed" />);
  expect(screen.getByText("12")).toBeInTheDocument(); expect(screen.getByText("Not assessed")).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/score|%|rank|points/i);
  expect(screen.getByText("Signals captured")).toHaveAttribute("title", "Signals are evidence collected for a human reviewer, not a score.");
});
