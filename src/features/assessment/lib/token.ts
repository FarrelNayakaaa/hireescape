import { z } from "zod";
import { ApiError } from "@/lib/api-client";

const tokenSchema = z.object({ token: z.string().min(1) });
const errorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

export async function requestAssessmentToken(input: { assessmentId: string; aiAssistance: boolean; durationMin: number }): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/assessment/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  } catch { throw new ApiError(0, "network_error", "Could not reach the assessment server. Please try again."); }
  let body: unknown;
  try { body = await response.json(); } catch { throw new ApiError(response.status, "invalid_response", "The assessment server returned an unreadable response. Please retry."); }
  if (!response.ok) {
    const error = errorSchema.safeParse(body);
    throw new ApiError(response.status, error.success ? error.data.error.code : "http_error", error.success ? error.data.error.message : "The token could not be created. Please retry.");
  }
  const parsed = tokenSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(response.status, "invalid_response", "The assessment server returned no token. Please retry.");
  return parsed.data.token;
}
