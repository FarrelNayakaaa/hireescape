import type { NextConfig } from "next";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{
      source: "/:path*",
      headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(self), fullscreen=(self)" }],
    }];
  },
  turbopack: {
    rules: {
      // Resolve pnpm's symlink to the installed file before passing it to the dev loader worker.
      "*.css": { loaders: [require.resolve("@tailwindcss/turbopack")], as: "*.css" },
    },
  },
};

export default nextConfig;
