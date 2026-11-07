// starter-kit/codex/health.example.ts → src/app/api/health/codex/route.ts
// Run before the demo: proves key + model work. Shown in the manager page footer as a green dot.
import { NextResponse } from "next/server";
import { z } from "zod";
import { callStructured } from "@/lib/codex/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { meta } = await callStructured({
      role: "inquisitor", promptVersion: "health@1",
      system: "Reply with ok=true.", input: "ping",
      schema: z.object({ ok: z.boolean() }), schemaName: "health",
      timeoutMs: 10_000, mockFixture: { ok: true },
    });
    return NextResponse.json({ ok: true, meta });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 503 });
  }
}
