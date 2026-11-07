#!/usr/bin/env node
// Verifies that every file you changed is a file your role owns (see ARCHITECTURE.md §4.2 and scripts/ownership.json).
// Usage:  node scripts/check-ownership.mjs <A|B> [--base <ref>] [--root <dir>]
// Exit code 0 = clean, 1 = violations (do not merge), 2 = usage/git error.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const args = process.argv.slice(2);
const dev = (args[0] || "").toUpperCase();
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const root = opt("--root") || process.cwd();
const cfg = JSON.parse(readFileSync(join(root, "scripts/ownership.json"), "utf8"));
if (!cfg.devs[dev]) { console.error("usage: node scripts/check-ownership.mjs <A|B> [--base origin/main]"); process.exit(2); }

const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const tryGit = (...a) => { try { return git(...a).trim(); } catch { return null; } };

// glob -> RegExp:  **  any depth,  *  within one path segment
const toRe = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*") + "$");
const matches = (file, globs = []) => globs.some((g) => toRe(g).test(file));

// base commit: merge-base with the base branch (falls back to main, then to HEAD itself)
const baseRef = opt("--base") || cfg.baseBranch;
const base = tryGit("merge-base", baseRef, "HEAD") || tryGit("merge-base", "main", "HEAD") || tryGit("rev-parse", "HEAD");
if (!base) { console.error("could not resolve a base commit (is this a git repo with commits?)"); process.exit(2); }

const changed = new Map(); // file -> status
for (const line of git("diff", "--name-status", "--no-renames", base).split("\n").filter(Boolean)) {
  const [st, ...rest] = line.split("\t"); changed.set(rest.join("\t"), st[0]);
}
for (const f of git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean)) changed.set(f, "A");

const mine = cfg.devs[dev];
const otherOwner = (file) => Object.entries(cfg.devs).find(([k, d]) => k !== dev && matches(file, d.allow) && !matches(file, d.deny))?.[0];
const deletions = (file) => {
  const out = tryGit("diff", "--numstat", base, "--", file);
  // numstat columns: <added>\t<deleted>\t<path>  (binary files show "-")
  if (!out) return 0; const n = parseInt(out.split("\t")[1], 10); return Number.isNaN(n) ? 0 : n;
};

const violations = [];
let ok = 0, shared = 0, appended = 0;
for (const [file, st] of [...changed].sort()) {
  if (matches(file, cfg.readOnly)) { violations.push([file, "read-only reference (starter-kit). Port into src/, never edit in place."]); continue; }
  if (matches(file, cfg.shared)) { shared++; continue; }
  if (matches(file, mine.deny)) { violations.push([file, `owned by ${otherOwner(file) ? "Dev " + otherOwner(file) : "the other developer"}`]); continue; }
  if (matches(file, mine.allow)) { ok++; continue; }
  if (matches(file, mine.appendOnly)) {
    if (st === "D" || deletions(file) > 0) violations.push([file, "append-only for your role: you may add lines but not edit or delete existing ones"]); else appended++;
    continue;
  }
  const o = otherOwner(file);
  violations.push([file, o ? `owned by Dev ${o}` : "not owned by anyone in scripts/ownership.json (ask Dev A to add it)"]);
}

console.log(`${cfg.devs[dev].name} — ${changed.size} changed file(s) vs ${baseRef}`);
console.log(`  own: ${ok}   shared docs: ${shared}   append-only: ${appended}`);
if (violations.length) {
  console.log(`\n✗ ${violations.length} file(s) outside your ownership:`);
  for (const [f, why] of violations) console.log(`  ✗ ${f}  — ${why}`);
  console.log("\nRevert those files (git checkout -- <file>, or delete if new) and add a request to docs/CONTRACT_REQUESTS.md instead.");
  process.exit(1);
}
console.log("✓ ownership clean");
