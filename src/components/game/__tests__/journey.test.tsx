// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RoomHall, type JourneyCopy } from "../RoomHall";
import { KeyReward } from "../KeyReward";
import { mockBrowser } from "@/components/ui/__tests__/browser";

const english: JourneyCopy = {
  eyebrow: "Journey", title: "Choose a door", description: "Finish the rooms in order.",
  enter: "Enter", locked: "Locked", complete: "Complete · key earned", keyEarned: "Key earned",
  rewardDescription: "Your work is saved.", collect: "Collect key", keys: "keys collected", entering: "Entering",
  names: ["Triage", "The Bug", "The Defence"], goals: ["Investigate", "Fix", "Explain"],
};
const indonesian: JourneyCopy = { ...english, enter: "Masuk", complete: "Selesai · kunci didapat" };

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("only opens the current door, with keyboard-accessible native buttons and reduced-motion timing", () => {
  mockBrowser(1280, true);
  vi.useFakeTimers();
  const enter = vi.fn();
  render(<RoomHall availableRoom={1} completedRooms={[]} copy={english} onEnter={enter} />);
  expect(screen.getByRole("button", { name: "Enter The Bug" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Enter The Defence" }));
  expect(enter).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Enter Triage" }));
  expect(enter).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(150));
  expect(enter).toHaveBeenCalledExactlyOnceWith(1);
});

it("explains earned and locked doors and focuses the hall heading", () => {
  render(<RoomHall availableRoom={2} completedRooms={[1]} copy={indonesian} onEnter={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Masuk Triage" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Masuk The Bug" })).toBeEnabled();
  expect(screen.getByText("Selesai · kunci didapat")).toBeInTheDocument();
  expect(screen.getByRole("heading")).toHaveFocus();
});

it("requires an explicit key collection without mutating completion state", () => {
  const collect = vi.fn();
  render(<KeyReward room={2} copy={english} onCollect={collect} />);
  expect(screen.getByLabelText("2/3 keys collected")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: english.collect }));
  expect(collect).toHaveBeenCalledOnce();
});
