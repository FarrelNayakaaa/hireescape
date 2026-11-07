// postinstall: copy the MediaPipe WASM runtime into public/ so the app never loads it from a CDN.
// Safe to run when the package is missing (exits 0) so `pnpm install` never fails because of it.
import { cpSync, existsSync, mkdirSync } from "node:fs";
const src = "node_modules/@mediapipe/tasks-vision/wasm";
const dst = "public/mediapipe/wasm";
if (!existsSync(src)) { console.log("[mediapipe] package not installed yet, skipping"); process.exit(0); }
mkdirSync(dst, { recursive: true });
cpSync(src, dst, { recursive: true });
console.log("[mediapipe] copied wasm ->", dst);
