import { NextResponse } from "next/server";
import { z } from "zod";
import { callStructured, CodexError } from "@/lib/codex/client";
import { toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const healthSchema = z.object({ ok: z.boolean() });

export async function GET(): Promise<NextResponse> {
  try {
    const options = {
      promptVersion: "health@1", system: "Reply with ok=true.", input: "ping",
      schema: healthSchema, schemaName: "health", timeoutMs: 10_000, retries: 0, mockFixture: { ok: true },
    };
    const [strong, fast] = await Promise.all([
      callStructured({ ...options, role: "analyst" }),
      callStructured({ ...options, role: "inquisitor" }),
    ]);
    if (!strong.data.ok || !fast.data.ok) throw new CodexError("parse", "Health check did not confirm readiness.");
    return NextResponse.json({ ok: true, strong: strong.meta, fast: fast.meta });
  } catch (error) {
    const body: { error: { code: string; message: string } } = await toErrorResponse(error).json();
    return NextResponse.json({ ok: false, error: body.error }, { status: 503 });
  }
}
