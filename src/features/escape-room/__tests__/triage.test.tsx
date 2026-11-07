// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { triageCheck } from "../lib/triageCheck";
import { triageHints } from "../lib/triageHints";
import { TriageForm } from "../components/TriageForm";
import { DefencePanel } from "../components/DefencePanel";
afterEach(cleanup);
it("checks tolerance, valid line ranges, and eight-line maximum", () => {
  for (const line of [8, 10, 12]) expect(triageCheck([line, line], [10, 10]).correct).toBe(true);
  for (const line of [7, 13]) expect(triageCheck([line, line], [10, 10]).correct).toBe(false);
  expect(triageCheck([1, 8], [10, 10])).toEqual({ valid: true, correct: true });
  for (const range of [[1, 9], [0, 1], [9, 1], [1.5, 2]] as [number, number][]) expect(triageCheck(range, [10, 10]).valid).toBe(false);
  expect(triageCheck(null, [10, 10]).valid).toBe(false);
  expect(Object.keys(triageHints)).toHaveLength(8);
  expect(Object.values(triageHints).every((hint) => !/\d/.test(hint))).toBe(true);
});
it("requires a range and a causal hypothesis", () => {
  const submit = vi.fn();
  render(<TriageForm marked={[1, 1]} attempts={1} defectType="cache_no_fallback" onSubmit={submit} disabled={false} locale="en" />);
  expect(screen.getByRole("button", { name: "Submit triage" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "External failures need a fallback" } });
  fireEvent.click(screen.getByRole("button"));
  expect(submit).toHaveBeenCalledWith("External failures need a fallback");
  expect(screen.getByText(triageHints.cache_no_fallback)).toBeInTheDocument();
});
it("blocks short defence answers and accepts a long answer without a hard maximum", () => {
  const answer = vi.fn();
  render(<DefencePanel questions={[{ eventId: "e1", question: "What happens under load?" }]} answers={{}} onAnswer={answer} locale="en" />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "short" } });
  expect(screen.getByRole("button")).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "a".repeat(801) } });
  fireEvent.click(screen.getByRole("button"));
  expect(answer).toHaveBeenCalledWith("e1", "a".repeat(801));
});
