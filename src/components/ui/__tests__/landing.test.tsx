// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Home from "@/app/page";
import { mockBrowser } from "./browser";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("the landing page exposes the correct CTA destinations and ordered content", () => {
  mockBrowser();
  render(<Home />);
  expect(screen.getByRole("link", { name: "I'm hiring" })).toHaveAttribute("href", "/manager/new");
  expect(screen.getByRole("link", { name: "Try the demo room" })).toHaveAttribute("href", "/manager");
  expect(screen.getByRole("heading", { level: 1, name: "HireEscape" })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 2 }).map((element) => element.textContent)).toEqual(["Three rooms", "Meet the agents", "Evidence, not verdicts"]);
  expect(screen.getByText("SAMPLE REPORT · FICTIONAL SESSION")).toBeInTheDocument();
  expect(screen.getByText("Built at Regional Codex Hackathon Indonesia")).toBeInTheDocument();
  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
});
