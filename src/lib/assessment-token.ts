import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { CodexError } from "@/lib/codex/client";

export interface TokenPayload {
  assessmentId: string;
  aiAssistance: boolean;
  exp: number;
}

const payloadSchema: z.ZodType<TokenPayload> = z.object({
  assessmentId: z.string().min(1), aiAssistance: z.boolean(), exp: z.number().finite(),
});
let warned = false;

function getSecret(): string {
  const secret = process.env.ASSESSMENT_SECRET;
  if (secret?.trim()) return secret;
  if (process.env.NODE_ENV === "production") throw new CodexError("config", "ASSESSMENT_SECRET is not set");
  if (!warned) {
    console.warn("[assessment-token] ASSESSMENT_SECRET is not set; using dev-only-secret outside production.");
    warned = true;
  }
  return "dev-only-secret";
}

export function signToken(payload: TokenPayload): string {
  const secret = getSecret();
  const body = Buffer.from(JSON.stringify(payloadSchema.parse(payload))).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  // Configuration failures must reach the route's error handler, not become invalid-token results.
  const secret = getSecret();
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, signature] = parts;
    if (!body || !signature || !/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]+$/.test(signature)) return null;
    const expected = createHmac("sha256", secret).update(body).digest("base64url");
    const actualBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);
    if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
    const decoded: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const parsed = payloadSchema.safeParse(decoded);
    return parsed.success && parsed.data.exp > Date.now() / 1000 ? parsed.data : null;
  } catch {
    return null;
  }
}

export function getVerifiedToken(request: Request): TokenPayload | null {
  const token = request.headers.get("x-assessment-token");
  return token ? verifyToken(token) : null;
}
