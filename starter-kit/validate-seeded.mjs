// Validates every seeded challenge with the same harness the browser uses.
// Rules (mirror the Saboteur validation pipeline):
//  V1 visible tests pass on starter     V2 hidden tests: >=1 fail on starter (and not a load error)
//  V3 hidden tests all pass on fix      V4 visible tests all pass on fix
//  V5 defectLines overlap the starter→fix diff
import { runSuite } from "./harness.js";
import { readdirSync } from "node:fs";

function changedStarterLines(a, b) {
  const A = a.split("\n"), B = b.split("\n");
  let s = 0; while (s < A.length && s < B.length && A[s] === B[s]) s++;
  let e = 0; while (e < A.length - s && e < B.length - s && A[A.length - 1 - e] === B[B.length - 1 - e]) e++;
  return [s + 1, A.length - e]; // 1-based inclusive range in starter
}

let failures = 0;
for (const f of readdirSync(new URL("./seeded/", import.meta.url)).filter((x) => x.endsWith(".js"))) {
  const { challenge: c, secret } = await import(`./seeded/${f}`);
  const vS = await runSuite({ code: c.starterCode, testsSource: c.visibleTests, target: "visible" });
  const hS = await runSuite({ code: c.starterCode, testsSource: c.hiddenTests });
  const hF = await runSuite({ code: secret.referenceFix, testsSource: c.hiddenTests });
  const vF = await runSuite({ code: secret.referenceFix, testsSource: c.visibleTests, target: "visible" });
  const [ds, de] = changedStarterLines(c.starterCode, secret.referenceFix);
  const checks = {
    V1_visible_pass_on_starter: vS.total > 0 && vS.failed === 0,
    V2_hidden_fail_on_starter: hS.failed >= 1 && !hS.runtimeError,
    V3_hidden_pass_on_fix: hF.total > 0 && hF.failed === 0,
    V4_visible_pass_on_fix: vF.failed === 0,
    V5_defect_lines_overlap_diff: c.defectLines[0] <= de && c.defectLines[1] >= ds,
  };
  const ok = Object.values(checks).every(Boolean);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.id}  hidden on starter: ${hS.passed}/${hS.total} pass, on fix: ${hF.passed}/${hF.total}  diff lines ${ds}-${de}`);
  for (const [k, v] of Object.entries(checks)) if (!v) console.log(`   ✗ ${k}`);
  if (!ok) console.log(JSON.stringify({ hS, hF, vS, vF }, null, 1).slice(0, 2000));
}
process.exit(failures ? 1 : 0);
