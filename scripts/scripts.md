# scripts/ (owner: Dev A)

| File | Purpose |
|---|---|
| `ownership.json` | Machine-readable version of the ownership matrix in `ARCHITECTURE.md §4.2`. |
| `check-ownership.mjs` | `pnpm check:owner A` / `pnpm check:owner B` — fails if you changed a file you do not own. **Run before every merge.** |
| `copy-mediapipe.mjs` | `postinstall`: copies the MediaPipe WASM into `public/mediapipe/wasm` (no CDN at runtime). |
| `list-models.mjs` | `pnpm list-models` — prints the model ids your API key can use (Codex-family first). |

If `check:owner` complains about a file that *should* be yours, tell Dev A to fix `ownership.json` (a one-line change) — do not bypass the check.
