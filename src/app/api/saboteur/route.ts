import { NextResponse } from "next/server";
import { jsonError, toErrorResponse } from "@/lib/http";
import { SaboteurRequest } from "@/features/saboteur";
import { generateChallenge } from "../../../features/saboteur/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "bad_request", "Invalid request."); }
  try { return NextResponse.json(await generateChallenge(SaboteurRequest.parse(body))); }
  catch (error) { return toErrorResponse(error); }
}
