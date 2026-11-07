import { NextResponse } from "next/server";
import { InquisitorRequest } from "@/features/inquisitor";
import { askInquisitor } from "../../../features/inquisitor/server/askInquisitor";
import { getVerifiedToken } from "@/lib/assessment-token";
import { jsonError, toErrorResponse } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const token = getVerifiedToken(request);
    if (!token) return jsonError(403, "bad_token", "Invalid or expired assessment");
    const input = InquisitorRequest.safeParse(await request.json().catch(() => null));
    if (!input.success) return jsonError(400, "bad_request", "Invalid input");
    if (token.assessmentId !== input.data.assessmentId) return jsonError(403, "bad_token", "Assessment does not match token");
    return NextResponse.json(await askInquisitor(input.data));
  } catch (error) { return toErrorResponse(error); }
}
