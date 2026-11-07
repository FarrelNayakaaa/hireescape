import { NextResponse } from "next/server";
import { AssistantRequest } from "@/features/assistant";
import { askAssistant } from "../../../features/assistant/server/askAssistant";
import { getVerifiedToken } from "@/lib/assessment-token";
import { jsonError, toErrorResponse } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const token = getVerifiedToken(request);
    if (!token) return jsonError(403, "bad_token", "Invalid or expired assessment");
    if (!token.aiAssistance) return jsonError(403, "ai_disabled", "AI assistance is off for this assessment");
    const body: unknown = await request.json().catch(() => null);
    if (typeof body === "object" && body !== null && "assessmentId" in body && body.assessmentId !== token.assessmentId) return jsonError(403, "bad_token", "Assessment does not match token");
    const parsed = AssistantRequest.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request", "Invalid input");
    return NextResponse.json(await askAssistant(parsed.data));
  } catch (error) { return toErrorResponse(error); }
}
