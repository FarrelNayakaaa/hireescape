import { expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { foldSignals, summarizeIntegrity, REVIEW_THRESHOLDS } from "../lib/integrity";
import type { IntegritySample } from "../lib/samples";
it.each([{ kind: "face", faces: 0, confidence: .9, type: "face_absent", seconds: 5 }, { kind: "face", faces: 2, confidence: .9, type: "multiple_faces", seconds: 3 }, { kind: "voice", active: true, type: "voice_activity", seconds: 4 }])("folds $type only at the exact sustained boundary", (fixture) => {
  const samples = Array.from({ length: fixture.seconds + 1 }, (_, i) => ({ ...fixture, t: i * 1000 })) as IntegritySample[];
  expect(foldSignals(samples.slice(0, -1), { endT: fixture.seconds * 1000 })).toEqual([]);
  expect(foldSignals(samples, { endT: fixture.seconds * 1000 })[0]).toMatchObject({ type: fixture.type, durationMs: fixture.seconds * 1000 });
});
it("ignores brief focus losses, closes open intervals at endT, and never joins sample gaps", () => {
  expect(foldSignals([{ kind: "focus", t: 0, focused: false }, { kind: "focus", t: 1999, focused: true }], { endT: 5000 })).toEqual([]);
  expect(foldSignals([{ kind: "visibility", t: 10, hidden: true }], { endT: 7010 })[0]).toMatchObject({ type: "tab_hidden", start: 10, end: 7010, durationMs: 7000 });
  expect(foldSignals([{ kind: "face", t: 0, faces: 0, confidence: .9 }, { kind: "face", t: 6000, faces: 0, confidence: .9 }], { endT: 6000 })).toEqual([]);
  expect(foldSignals(Array.from({ length: 8 }, (_, i) => ({ kind: "face" as const, t: i * 1000, faces: 0, confidence: .9 })), { endT: 8000, faceSignalsEnabled: false })).toEqual([]);
});
it("applies deterministic review thresholds strictly above each boundary and always includes caveats", () => {
  for (const [type, ms] of Object.entries(REVIEW_THRESHOLDS)) {
    const signals = foldSignals([{ kind: "visibility", t: 0, hidden: true }], { endT: ms });
    const signal = { ...signals[0], id: "i1", type: type as "tab_hidden", start: 0, end: ms, durationMs: ms };
    expect(summarizeIntegrity([signal]).reviewSuggested).toBe(false);
    expect(summarizeIntegrity([{ ...signal, end: ms + 1, durationMs: ms + 1 }]).reviewSuggested).toBe(true);
  }
  expect(summarizeIntegrity([], { aiAssistance: true }).caveats).toHaveLength(3);
});
it("matches the verified read-only reference for mixed samples and summaries", async () => {
  const reference: { foldSignals: typeof foldSignals; summarizeIntegrity: typeof summarizeIntegrity } = await import(pathToFileURL(`${process.cwd()}/starter-kit/proctoring/integrity.js`).href);
  const samples: IntegritySample[] = [{ kind: "visibility", t: 0, hidden: true }, { kind: "visibility", t: 70_000, hidden: false }, ...Array.from({ length: 11 }, (_, i) => ({ kind: "face" as const, t: i * 1000, faces: 0, confidence: .9 }))];
  const folded = foldSignals(samples, { endT: 80_000 }); expect(folded).toEqual(reference.foldSignals(samples, { endT: 80_000 }));
  expect(summarizeIntegrity(folded)).toEqual(reference.summarizeIntegrity(folded));
});
