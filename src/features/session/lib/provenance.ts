import type { Origin } from "@/lib/contracts";

export type LineOp =
  | { type: "equal"; oldIndex: number; newIndex: number }
  | { type: "remove"; oldIndex: number }
  | { type: "add"; newIndex: number };

// provenance.js — line-level origin tracking for the AI-share metric.
// Pure + dependency-free (LCS line diff; files are < 300 lines so O(n*m) is fine).
// Origins: "starter" | "manual" | "ai" | "ai_edited" | "paste"

function lcsTable(a: string[], b: string[]) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  return dp;
}

/** Returns ops: {type:"equal"|"remove"|"add", oldIndex?, newIndex?} in order. */
export function diffLineOps(oldLines: string[], newLines: string[]): LineOp[] {
  const dp = lcsTable(oldLines, newLines);
  const ops: LineOp[] = [];
  let i = 0, j = 0;
  while (i < oldLines.length && j < newLines.length) {
    if (oldLines[i] === newLines[j]) { ops.push({ type: "equal", oldIndex: i++, newIndex: j++ }); }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ type: "remove", oldIndex: i++ });
    else ops.push({ type: "add", newIndex: j++ });
  }
  while (i < oldLines.length) ops.push({ type: "remove", oldIndex: i++ });
  while (j < newLines.length) ops.push({ type: "add", newIndex: j++ });
  return ops;
}

/**
 * Compute new line origins after a change.
 * source: "manual" | "ai" | "paste"  (who produced this change)
 * A manual edit of a line whose origin was ai/ai_edited becomes "ai_edited".
 */
export function applyWithProvenance(oldCode: string, oldOrigins: Origin[], newCode: string, source: "manual" | "ai" | "paste"): Origin[] {
  const oldLines = oldCode.split("\n"), newLines = newCode.split("\n");
  const ops = diffLineOps(oldLines, newLines);
  const origins = new Array<Origin>(newLines.length);
  let pendingRemoved: Origin[] = []; // origins of lines removed just before an add-run (= a modification)
  for (const op of ops) {
    if (op.type === "equal") { origins[op.newIndex] = oldOrigins[op.oldIndex] ?? "starter"; pendingRemoved = []; }
    else if (op.type === "remove") pendingRemoved.push(oldOrigins[op.oldIndex] ?? "starter");
    else {
      const replaced = pendingRemoved.shift();
      const wasAi = replaced === "ai" || replaced === "ai_edited";
      origins[op.newIndex] = source === "manual" && wasAi ? "ai_edited" : source;
    }
  }
  return origins;
}

/** Metrics over lines that differ from the starter file (origin !== "starter"). */
export function provenanceMetrics(origins: Origin[]) {
  const changed = origins.filter((o) => o !== "starter");
  const count = (k: Origin) => changed.filter((o) => o === k).length;
  const total = changed.length;
  return {
    changedLines: total,
    manual: count("manual"), ai: count("ai"), aiEdited: count("ai_edited"), paste: count("paste"),
    aiLineShare: total ? +(count("ai") / total).toFixed(2) : null,          // AI lines accepted untouched
    aiEditedShare: total ? +(count("ai_edited") / total).toFixed(2) : null, // AI lines the candidate changed
  };
}
