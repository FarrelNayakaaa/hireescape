// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { IntegrityReport } from "../components/IntegrityReport";
import { foldSignals, summarizeIntegrity } from "../lib/integrity";
afterEach(cleanup);
it("renders neutral intervals, thresholds and caveats without verdicts", () => {
 const signals = foldSignals([{ kind: "visibility", t: 0, hidden: true }], { endT: 77_000 });
 const { container } = render(<IntegrityReport sessionId="fictional" record={{ sessionId: "fictional", mode: "browser", consent: "not_required", calibration: { faceOk: null, noiseFloor: null, fullscreen: false }, signals, summary: summarizeIntegrity(signals) }} />);
 expect(screen.getByText("Review suggested")).toBeInTheDocument(); expect(screen.getByText("tab hidden 77 s (threshold 60 s)")).toBeInTheDocument(); expect(screen.getByText("Signals are observations, not proof of misconduct.")).toBeInTheDocument(); expect(container.className).not.toContain("red"); expect(container.textContent).not.toMatch(/cheating|suspicious|reject/i);
});
