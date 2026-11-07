// Run after pnpm build. Manager assets may contain fixes; candidate entry chunks must not.
import { readFileSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const context = {};
runInNewContext(readFileSync(".next/server/app/play/[assessmentId]/page_client-reference-manifest.js", "utf8"), context);
const manifest = context.__RSC_MANIFEST["/play/[assessmentId]/page"];
const build = JSON.parse(readFileSync(".next/server/app/play/[assessmentId]/page/build-manifest.json", "utf8"));
const entries = new Set([
  ...Object.values(manifest.clientModules).flatMap((entry) => entry.chunks).map((path) => path.replace(/^\/_next\//, "")),
  ...build.rootMainFiles,
]);
const chunks = [...entries].map((path) => ({ path, source: readFileSync(`.next/${path}`, "utf8") }));
const failures = chunks.filter(({ source }) => source.includes("he:secrets"));
let checked = 0;
for (const file of readdirSync("challenges/seeded").filter((file) => file.endsWith(".secret.ts"))) {
  const compiled = ts.transpileModule(readFileSync(`challenges/seeded/${file}`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  const { secret } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
  const starterModule = ts.transpileModule(readFileSync(`challenges/seeded/${file.replace(".secret.ts", ".ts")}`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  const { challenge } = await import(`data:text/javascript;base64,${Buffer.from(starterModule).toString("base64")}`);
  const lines = secret.referenceFix.split("\n");
  const needles = lines.slice(0, -2).map((_, index) => lines.slice(index, index + 3).join("\n")).filter((text) => text.trim() && !challenge.starterCode.includes(text));
  if (!needles.length) throw new Error(`No fix-specific signature in ${file}`);
  for (const chunk of chunks) {
    if (needles.some((needle) => [needle, JSON.stringify(needle).slice(1, -1)].some((value) => chunk.source.includes(value)))) failures.push(chunk);
  }
  checked++;
}
if (failures.length) {
  console.error("Candidate bundle includes manager-only material:", [...new Set(failures.map(({ path }) => path))]);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${entries.size} candidate entry chunks exclude he:secrets and fix-specific signatures from ${checked} seeded fixes.`);
}
