import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "challenges/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
  },
  resolve: {
    alias: [
      { find: /^server-only$/, replacement: resolvePath("./test/stubs/server-only.ts") },
      { find: /^@challenges$/, replacement: resolvePath("./challenges/index.ts") },
      { find: /^@challenges\//, replacement: resolvePath("./challenges/") },
      { find: /^@\//, replacement: resolvePath("./src/") },
    ],
  },
});
