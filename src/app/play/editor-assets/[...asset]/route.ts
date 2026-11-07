import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

export const runtime = "nodejs";
// Keep this a filesystem path: Turbopack rewrites require.resolve to a module id.
const workerRoot = resolve(process.cwd(), "node_modules/monaco-editor/esm/vs");

export async function GET(request: Request, { params }: { params: Promise<{ asset: string[] }> }) {
  void request;
  const { asset } = await params;
  if (!asset.length || asset.some((part) => !/^[\w.-]+$/.test(part) || part === "." || part === "..") || !asset.at(-1)?.endsWith(".js")) {
    return new Response(null, { status: 404 });
  }
  const path = resolve(workerRoot, ...asset);
  if (!path.startsWith(`${workerRoot}${sep}`)) return new Response(null, { status: 404 });
  try {
    const source = await readFile(path, "utf8");
    return new Response(source, { headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600",
    } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return new Response(null, { status: 404 });
    console.error("Local editor worker asset unavailable");
    return new Response(null, { status: 500 });
  }
}
