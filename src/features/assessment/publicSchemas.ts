import { z } from "zod";
import type { AssessmentConfig, Challenge } from "@/lib/contracts";

export const levelSchema = z.enum(["junior", "mid", "senior"]);
export const defectSchema = z.enum(["swallowed_exception", "unhandled_null", "cache_no_fallback", "off_by_one", "shared_mutation", "missing_await", "unbounded_retry", "resource_leak"]);
export const proctoringSchema = z.object({ mode: z.enum(["off", "browser", "camera_mic"]), required: z.boolean(), captureSnapshots: z.boolean() });
export const assessmentSchema: z.ZodType<AssessmentConfig> = z.object({
  id: z.string().min(1), challengeId: z.string().min(1),
  candidateAlias: z.string().min(1).refine((value) => value.includes("(fictional)"), "Use a fictional candidate alias."),
  level: levelSchema, aiAssistance: z.boolean(), durationMin: z.number().min(10).max(120),
  proctoring: proctoringSchema, locale: z.enum(["en", "id"]), createdAt: z.iso.datetime(), token: z.string().min(1),
});
export const challengeSchema: z.ZodType<Challenge> = z.object({
  id: z.string().min(1), title: z.string(), level: levelSchema, defectType: defectSchema,
  language: z.literal("javascript"), brief: z.string(), starterCode: z.string(), visibleTests: z.string(), hiddenTests: z.string(),
  defectLines: z.tuple([z.number().int().positive(), z.number().int().positive()]), rubricHints: z.array(z.string()), source: z.enum(["generated", "seeded"]),
  validation: z.object({ brokenFailsHidden: z.boolean(), fixPassesHidden: z.boolean(), attempts: z.number().int().nonnegative(), validatedAt: z.iso.datetime() }),
});
export const assessmentDataSchema = z.object({ assessments: z.record(z.string(), assessmentSchema), challenges: z.record(z.string(), challengeSchema) });
