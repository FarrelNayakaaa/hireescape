import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CodexError } from "@/lib/codex/client";

export function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof CodexError) {
    const errors = {
      timeout: { status: 504, message: "The model request timed out." },
      upstream: { status: 502, message: "The model service is unavailable." },
      parse: { status: 502, message: "The model response could not be validated." },
      config: { status: 500, message: "The service is not configured." },
    };
    const { status, message } = errors[error.code];
    return jsonError(status, error.code, message);
  }
  if (error instanceof ZodError) return jsonError(400, "bad_request", "Invalid request.");
  return jsonError(500, "internal", "Internal server error.");
}
