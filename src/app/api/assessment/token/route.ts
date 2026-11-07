import { NextResponse } from "next/server";
import { z } from "zod";
import { signToken } from "@/lib/assessment-token";
import { jsonError, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  assessmentId: z.string().trim().min(1),
  aiAssistance: z.boolean(),
  durationMin: z.number().min(10).max(120),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "bad_request", "Invalid JSON request.");
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "bad_request", "Invalid assessment token request.");
  try {
    const { assessmentId, aiAssistance, durationMin } = parsed.data;
    return NextResponse.json({ token: signToken({
      assessmentId, aiAssistance, exp: Math.floor(Date.now() / 1000) + (durationMin + 30) * 60,
    }) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
