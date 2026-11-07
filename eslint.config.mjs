import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Every override receives the full policy so overlapping groups retain all restrictions.
function importPolicy({ allowOpenAI = false, blockFeatures = false, blockSecrets = false } = {}) {
  const patterns = [{
    regex: "^@/features/(?!(?:runner/harness|session/lib/provenance)$)[^/]+/(?!index$)",
    caseSensitive: true,
    message: "Import features through their public root or index; only harness and provenance are exceptions.",
  }];
  if (!allowOpenAI) {
    patterns.push({
      regex: "^openai(?:/|$)", caseSensitive: true,
      message: "Use the shared OpenAI client under src/lib/codex.",
    });
  }
  if (blockFeatures) {
    patterns.push({
      regex: "^@/features(?:/|$)", caseSensitive: true,
      message: "Shared libraries and UI/game components must not depend on features.",
    });
  }
  if (blockSecrets) {
    patterns.push({
      regex: "^@challenges/secrets(?:/|$)", caseSensitive: true,
      message: "Candidate-side code must never import challenge secrets.",
    });
  }
  return ["error", { patterns }];
}

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts",
    "starter-kit/**", "public/mediapipe/wasm/**",
  ]),
  { rules: { "no-restricted-imports": importPolicy() } },
  {
    files: ["src/lib/codex/**", "scripts/list-models.mjs"],
    rules: { "no-restricted-imports": importPolicy({ allowOpenAI: true }) },
  },
  {
    files: ["src/lib/**", "src/components/ui/**"],
    ignores: ["src/lib/codex/**"],
    rules: { "no-restricted-imports": importPolicy({ blockFeatures: true }) },
  },
  {
    files: [
      "src/features/{escape-room,runner,session,inquisitor,assistant,proctoring}/**",
      "src/app/play/**",
    ],
    rules: { "no-restricted-imports": importPolicy({ blockSecrets: true }) },
  },
  {
    files: ["src/components/game/**"],
    rules: { "no-restricted-imports": importPolicy({ blockFeatures: true, blockSecrets: true }) },
  },
]);
