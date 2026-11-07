import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { DefectType, Level } from "@/lib/contracts";
import { runSuite } from "@/features/runner/harness";
import { getSeededChallenge, listSeededChallenges } from "@challenges";
import * as publicAPI from "@challenges";
import { getSeededSecret } from "@challenges/secrets";

// Ported from the read-only starter validator; coordinates are inclusive starter-file lines.
function changedStarterLines(a: string, b: string): [number, number] {
  const A = a.split("\n"), B = b.split("\n");
  let s = 0; while (s < A.length && s < B.length && A[s] === B[s]) s++;
  let e = 0; while (e < A.length - s && e < B.length - s && A[A.length - 1 - e] === B[B.length - 1 - e]) e++;
  return [s + 1, A.length - e];
}

const challenges = listSeededChallenges();

describe("seeded challenge validation with the real runner harness", () => {
  test.each(challenges)("$id passes V1-V5", async (challenge) => {
    const secret = getSeededSecret(challenge.id);
    expect(secret).not.toBeNull();
    if (!secret) throw new Error(`Missing secret for ${challenge.id}`);

    const visibleStarter = await runSuite({ code: challenge.starterCode, testsSource: challenge.visibleTests, target: "visible" });
    const hiddenStarter = await runSuite({ code: challenge.starterCode, testsSource: challenge.hiddenTests, target: "hidden" });
    const hiddenFix = await runSuite({ code: secret.referenceFix, testsSource: challenge.hiddenTests, target: "hidden" });
    const visibleFix = await runSuite({ code: secret.referenceFix, testsSource: challenge.visibleTests, target: "visible" });

    expect(visibleStarter.total, "V1: visible starter tests exist").toBeGreaterThan(0);
    expect(visibleStarter.failed, "V1: visible tests pass on starter").toBe(0);
    expect(hiddenStarter.failed, "V2: hidden tests expose the starter defect").toBeGreaterThanOrEqual(1);
    expect(hiddenStarter.runtimeError, "V2: failures are not a module/test load error").toBeUndefined();
    expect(hiddenFix.total, "V3: hidden fix tests exist").toBeGreaterThan(0);
    expect(hiddenFix.failed, "V3: hidden tests pass on the fix").toBe(0);
    expect(visibleFix.failed, "V4: visible tests still pass on the fix").toBe(0);
    const [start, end] = changedStarterLines(challenge.starterCode, secret.referenceFix);
    expect(challenge.defectLines[0], "V5: defect starts before the changed range ends").toBeLessThanOrEqual(end);
    expect(challenge.defectLines[1], "V5: defect ends after the changed range starts").toBeGreaterThanOrEqual(start);
    expect(end - start + 1).toBeLessThanOrEqual(20);

    for (const result of [visibleStarter, hiddenStarter, hiddenFix, visibleFix]) {
      expect(result.runtimeError).toBeUndefined();
      expect(result.timedOut).toBe(false);
    }
    expect(challenge.id).toMatch(/^seed-/);
    expect(challenge.source).toBe("seeded");
    expect(challenge.language).toBe("javascript");
    expect(challenge.starterCode).not.toBe(secret.referenceFix);
    expect(challenge.validation).toEqual({ brokenFailsHidden: true, fixPassesHidden: true, attempts: 0, validatedAt: "2026-11-07T00:00:00.000Z" });
    // The default reporter hides passing console logs; keep the required eight validation rows visible.
    process.stdout.write(`PASS ${challenge.id} V1-V5; hidden starter ${hiddenStarter.passed}/${hiddenStarter.total}, fix ${hiddenFix.passed}/${hiddenFix.total}\n`);
  });

  test("catalogue IDs are unique and sorted by level then ID", () => {
    expect(challenges).toHaveLength(8);
    expect(Object.keys(publicAPI).sort()).toEqual(["getSeededChallenge", "listSeededChallenges"]);
    expect(new Set(challenges.map((challenge) => challenge.id)).size).toBe(8);
    const levels: Record<Level, number> = { junior: 0, mid: 1, senior: 2 };
    expect(challenges.map((challenge) => challenge.id)).toEqual([...challenges]
      .sort((a, b) => levels[a.level] - levels[b.level] || a.id.localeCompare(b.id)).map((challenge) => challenge.id));
    const list = listSeededChallenges();
    list.pop();
    expect(listSeededChallenges()).toHaveLength(8);
  });

  test("the public catalogue contains neither reference-fix fields nor any fix text", () => {
    const serialized = JSON.stringify(listSeededChallenges());
    expect(serialized).not.toContain("referenceFix");
    for (const challenge of challenges) {
      const secret = getSeededSecret(challenge.id);
      if (!secret) throw new Error(`Missing secret for ${challenge.id}`);
      expect(serialized).not.toContain(JSON.stringify(secret.referenceFix).slice(1, -1));
    }
    expect(getSeededSecret("unknown-challenge")).toBeNull();
  });

  test("the public import graph never reaches secret modules", () => {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const visited = new Set<string>();
    const visit = (file: string) => {
      if (visited.has(file)) return;
      visited.add(file);
      expect(file).not.toMatch(/(?:\.secret|[/\\]secrets)\.ts$/);
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("referenceFix");
      for (const match of source.matchAll(/^(?:import|export)\s+(?:[^;\n]*?\s+from\s+)?["'](\.[^"']+)["']/gm)) {
        visit(resolve(dirname(file), `${match[1]}.ts`));
      }
    };
    visit(resolve(root, "index.ts"));
    expect(visited.size).toBe(9);
  });

  test("selection defaults to the demo and honors defect/level fallbacks", () => {
    expect(getSeededChallenge().id).toBe("seed-cache-no-fallback-mid");
    expect(getSeededChallenge("missing_await").defectType).toBe("missing_await");
    expect(getSeededChallenge("off_by_one", "junior").level).toBe("junior");
    expect(getSeededChallenge("missing_await", "junior").defectType).toBe("missing_await");
    expect(getSeededChallenge("unknown" as DefectType).id).toBe("seed-cache-no-fallback-mid");
    expect(getSeededChallenge(undefined, "junior").level).toBe("junior");
    expect(getSeededChallenge(undefined, "senior").id).toBe("seed-cache-no-fallback-mid");
  });
});
