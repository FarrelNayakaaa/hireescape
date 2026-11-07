import { expect, it } from "vitest";
import { applyWithProvenance, diffLineOps, provenanceMetrics } from "../lib/provenance";
import { hashCode } from "../lib/hash";

it("preserves starter lines and tracks AI, manual edits of AI, and external paste", () => {
  const original = "one\ntwo\nthree";
  const aiCode = "one\nAI two\nAI three";
  const origins = applyWithProvenance(original, ["starter", "starter", "starter"], aiCode, "ai");
  expect(origins).toEqual(["starter", "ai", "ai"]);
  const edited = applyWithProvenance(aiCode, origins, "one\nverified two\nAI three", "manual");
  expect(edited).toEqual(["starter", "ai_edited", "ai"]);
  expect(applyWithProvenance("one\nverified two\nAI three", edited, "one\nverified again\nAI three", "manual"))
    .toEqual(["starter", "ai_edited", "ai"]);
  expect(applyWithProvenance(original, [], "one\npasted\nthree", "paste")).toEqual(["starter", "paste", "starter"]);
  expect(applyWithProvenance(original, [], "one\nmanual\nthree", "manual")).toEqual(["starter", "manual", "starter"]);
});

it("reports deterministic operations for insertions, replacements, and deletions", () => {
  expect(diffLineOps(["a", "b"], ["a", "c"])).toEqual([
    { type: "equal", oldIndex: 0, newIndex: 0 }, { type: "remove", oldIndex: 1 }, { type: "add", newIndex: 1 },
  ]);
  expect(diffLineOps([], ["x"])).toEqual([{ type: "add", newIndex: 0 }]);
  expect(diffLineOps(["x"], [])).toEqual([{ type: "remove", oldIndex: 0 }]);
});

it("counts the reference metric example", () => {
  expect(provenanceMetrics(["starter", "manual", "ai", "ai_edited"])).toEqual({
    changedLines: 3, manual: 1, ai: 1, aiEdited: 1, paste: 0, aiLineShare: 0.33, aiEditedShare: 0.33,
  });
  expect(provenanceMetrics(["starter"])).toMatchObject({ changedLines: 0, aiLineShare: null, aiEditedShare: null });
});

it("computes standard FNV-1a hashes", () => {
  expect(hashCode("")).toBe("811c9dc5");
  expect(hashCode("hello")).toBe("4f9f2cab");
  expect(hashCode("hello")).not.toBe(hashCode("Hello"));
});
