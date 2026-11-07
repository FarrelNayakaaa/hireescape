// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { LandingMascots } from "../LandingMascots";
import { mockBrowser } from "./browser";

beforeEach(() => {
  mockBrowser();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test("waits for both the page load and mascot asset before greeting", async () => {
  vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
  const { container } = render(<LandingMascots />);
  const layer = container.firstElementChild;
  const left = container.querySelector(".he-landing-mascot--left")!;
  const right = container.querySelector(".he-landing-mascot--right")!;
  const leftImage = left.querySelector("img")!;
  const rightImage = right.querySelector("img")!;
  expect(leftImage.getAttribute("src")).not.toBe(rightImage.getAttribute("src"));
  expect(left).toHaveAttribute("data-visible", "false");
  fireEvent.load(leftImage);
  expect(left).toHaveAttribute("data-visible", "false");
  fireEvent.load(window);
  await waitFor(() => expect(left).toHaveAttribute("data-visible", "true"));
  expect(right).toHaveAttribute("data-visible", "false");
  fireEvent.load(rightImage);
  await waitFor(() => expect(right).toHaveAttribute("data-visible", "true"));
  fireEvent.error(rightImage);
  expect(right).toHaveAttribute("data-visible", "false");
  expect(left).toHaveAttribute("data-visible", "true");
  expect(layer).toHaveAttribute("aria-hidden", "true");
});

test("also greets when mounted after the document has already loaded", async () => {
  vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
  const { container } = render(<LandingMascots />);
  const mascot = container.querySelector(".he-landing-mascot--left");
  expect(mascot).toHaveAttribute("data-visible", "false");
  fireEvent.load(container.querySelector("img")!);
  await waitFor(() => expect(mascot).toHaveAttribute("data-visible", "true"));
  fireEvent.error(container.querySelector("img")!);
  expect(mascot).toHaveAttribute("data-visible", "false");
});

test("unmount cancels a pending reveal frame", () => {
  vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 17));
  const { unmount } = render(<LandingMascots />);
  act(() => unmount());
  expect(cancelAnimationFrame).toHaveBeenCalledWith(17);
});
