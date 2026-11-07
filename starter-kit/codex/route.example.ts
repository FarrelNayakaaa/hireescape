// starter-kit/codex/route.example.ts → pattern for src/app/api/<agent>/route.ts
// Shown for the Assistant because it has the most checks (token + toggle + room gating).
import { NextResponse } from "next/server";
import { AssistantRequest, AssistantOutput } from "@/features/assistant/schema";
import { callStructured, CodexError } from "@/lib/codex/client";
import { ASSISTANT_SYSTEM, ASSISTANT_VERSION, buildAssistantInput } from "@/lib/codex/prompts/assistant";
import { verifyToken } from "@/lib/assessment-token";
import fixture from "@/lib/codex/fixtures/assistant.json";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  // 1. Toggle enforcement on the server (not just a disabled button)
  const token = verifyToken(req.headers.get("x-assessment-token") ?? "");
  if (!token) return NextResponse.json({ error: { code: "bad_token", message: "Invalid or expired assessment" } }, { status: 403 });
  if (!token.aiAssistance) return NextResponse.json({ error: { code: "ai_disabled", message: "AI assistance is off for this assessment" } }, { status: 403 });

  // 2. Input validation (room gating lives in the schema: room must be 2)
  const parsed = AssistantRequest.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: { code: "bad_request", message: "Invalid input" } }, { status: 400 });
  const body = parsed.data;

  // 3. One Codex call with structured output
  try {
    const { data, meta } = await callStructured({
      role: "assistant",
      promptVersion: ASSISTANT_VERSION,
      system: ASSISTANT_SYSTEM(body.locale),
      input: buildAssistantInput(body),
      schema: AssistantOutput,
      schemaName: "assistant_reply",
      timeoutMs: 20_000,
      mockFixture: fixture,
    });
    // 4. Post-validation in code (never trust the model blindly)
    if (data.suggestion && !/module\.exports\s*=/.test(data.suggestion.code)) data.suggestion = null;
    return NextResponse.json({ ...data, meta });
  } catch (err) {
    const code = err instanceof CodexError ? err.code : "upstream";
    return NextResponse.json({ error: { code, message: "Assistant unavailable, try again" } }, { status: code === "timeout" ? 504 : 502 });
  }
}
