# Cross-owner integration notes

## 2026-11-07 — Resolve committed Indonesian translation conflict

- File: `src/lib/i18n/id.ts` (Dev B).
- Context: the user requested pulling latest main and resolving conflicts before publishing the mascot feature branch.
- Upstream `origin/main` at `e939412` contains committed `Updated upstream` / `Stashed changes` conflict markers in this file, preventing the production build.
- Resolution on `feature/landing-mascot-welcome`: retain the complete strict Indonesian translation map and the newly added `backToHome` translation; remove only the conflict markers and duplicate partial-map declaration/comment.
- No contract fields, ownership configuration, or other Dev B implementation changed. The existing i18n test verifies complete key coverage against English.
- Ownership guard: this is the single cross-owner file flagged during this explicitly requested conflict-resolution task.
