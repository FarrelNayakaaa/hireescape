// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AccentCard, AgentAvatar, AgentChip, AiModeBadge, BasisLabel, Button, EvidenceChip, GridBackdrop, NeonArcs, NumberBadge, PillTitle, StepList } from "../index";
import { ReportMotionContext, setTheme } from "../environment";
import { mockBrowser } from "./browser";

beforeEach(() => { mockBrowser(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test.each(["primary", "secondary", "ghost", "danger"] as const)("renders a %s button with native attributes", (variant) => {
  render(<Button variant={variant} name="action" size="sm">Continue</Button>);
  const button = screen.getByRole("button", { name: "Continue" });
  expect(button).toHaveClass(`he-button--${variant}`, "he-button--sm");
  expect(button).toHaveAttribute("type", "button");
  expect(button).toHaveAttribute("name", "action");
});

test("loading disables the button, announces busy state, and keeps its keyboard hint", () => {
  render(<Button loading kbd="⌘↵">Create</Button>);
  expect(screen.getByRole("button")).toBeDisabled();
  expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  expect(screen.getByLabelText("Keyboard shortcut: ⌘↵")).toHaveTextContent("⌘↵");
});

test("disabled buttons do not call handlers; enabled native buttons do", () => {
  const click = vi.fn();
  const { rerender } = render(<Button disabled onClick={click}>Save</Button>);
  fireEvent.click(screen.getByRole("button"));
  expect(click).not.toHaveBeenCalled();
  rerender(<Button onClick={click}>Save</Button>);
  fireEvent.click(screen.getByRole("button"));
  expect(click).toHaveBeenCalledOnce();
});

test("cards keep the accent top bar, optional padding, and polymorphic element", () => {
  const { container } = render(<AccentCard accent="room1" as="article" padded={false}>Card</AccentCard>);
  const article = container.querySelector("article");
  expect(article).toHaveClass("he-accent-room1");
  expect(article).not.toHaveClass("he-card--padded");
  expect(article?.querySelector(".he-card-bar")).toHaveClass("he-accent-room1");
});

test("number badges pad one-based numbers and pill titles retain the heading level", () => {
  render(<><NumberBadge n={1} accent="room2" /><PillTitle as="h2">Evidence</PillTitle></>);
  expect(screen.getByText("01")).toHaveClass("he-accent-room2");
  expect(screen.getByRole("heading", { level: 2, name: "Evidence" })).toHaveClass("he-pill-title");
});

test("step states have text labels, details, and a current step", () => {
  render(<StepList steps={[
    { id: "a", label: "One", status: "pending" }, { id: "b", label: "Two", status: "active", detail: "Checking" },
    { id: "c", label: "Three", status: "done" }, { id: "d", label: "Four", status: "error" },
  ]} />);
  for (const text of ["Pending", "In progress", "Done", "Error", "Checking"]) expect(screen.getByText(text)).toBeInTheDocument();
  expect(screen.getByText("Two").closest("li")).toHaveAttribute("aria-current", "step");
});

test("basis and AI labels do not rely on color", () => {
  render(<><BasisLabel basis="ai_predicted" /><BasisLabel basis="executed" /><AiModeBadge on /><AiModeBadge on={false} /></>);
  for (const text of ["AI-predicted, not executed", "Executed", "AI Assistance: ON", "AI Assistance: OFF"]) expect(screen.getByText(text)).toBeInTheDocument();
});

test("evidence chips are interactive only when given a handler", () => {
  const click = vi.fn();
  render(<><EvidenceChip kind="event" label="e19" onClick={click} /><EvidenceChip kind="code_line" label="L24" /></>);
  fireEvent.click(screen.getByRole("button", { name: "e19" }));
  expect(click).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "L24" })).not.toBeInTheDocument();
  expect(screen.getByText("L24")).toBeInTheDocument();
});

test.each(["saboteur", "inquisitor", "assistant", "analyst"] as const)("renders %s avatar states with an accessible name", (agent) => {
  const { rerender } = render(<AgentAvatar agent={agent} state="idle" size="lg" />);
  for (const state of ["idle", "thinking", "done", "error"] as const) {
    rerender(<AgentAvatar agent={agent} state={state} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(new RegExp(`${agent}: ${state}`, "i"));
  }
});

test("agent chips display telemetry without inventing a live state", () => {
  const { rerender } = render(<AgentChip agent="analyst" status="Done" latencyMs={2100} />);
  expect(screen.getByText("2.1s")).toBeInTheDocument();
  expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  rerender(<AgentChip agent="analyst" mock />);
  expect(screen.getByText("MOCK")).toBeInTheDocument();
  rerender(<AgentChip agent="analyst" mock={false} />);
  expect(screen.getByText("LIVE")).toBeInTheDocument();
});

test("decoration is hidden from accessibility and each glow filter has a unique ID", () => {
  const { container } = render(<><GridBackdrop /><NeonArcs position="top-right" /><NeonArcs position="bottom-left" /></>);
  const ids = [...container.querySelectorAll("filter")].map((filter) => filter.id);
  expect(new Set(ids).size).toBe(2);
  for (const decoration of container.querySelectorAll(".he-grid-backdrop, .he-neon-arcs")) expect(decoration).toHaveAttribute("aria-hidden", "true");
});

test("live OS preference changes stop loops, and Retro suppresses them too", () => {
  const browser = mockBrowser();
  const { container } = render(<><AgentAvatar agent="assistant" state="thinking" /><NeonArcs position="top-right" /></>);
  act(() => setTheme("default"));
  expect(container.querySelector(".he-agent-ring")).toHaveAttribute("data-motion", "rotate");
  act(() => browser.reduceMotion(true));
  expect(container.querySelector(".he-agent-ring")).toHaveAttribute("data-motion", "static");
  expect(container.querySelector(".he-neon-arcs")).toHaveAttribute("data-motion", "static");
  act(() => browser.reduceMotion(false));
  expect(container.querySelector(".he-agent-ring")).toHaveAttribute("data-motion", "rotate");
  act(() => setTheme("retro"));
  expect(container.querySelector(".he-agent-ring")).toHaveAttribute("data-motion", "static");
  act(() => setTheme("default"));
});

test("report context prevents decorative loops regardless of the OS preference", () => {
  mockBrowser();
  const { container } = render(<ReportMotionContext value><AgentAvatar agent="analyst" state="thinking" /><NeonArcs position="top-right" /></ReportMotionContext>);
  expect(container.querySelector(".he-agent-ring")).toHaveAttribute("data-motion", "static");
  expect(container.querySelector(".he-neon-arcs")).toHaveAttribute("data-motion", "static");
});
