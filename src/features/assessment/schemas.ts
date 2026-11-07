import { z } from "zod";
import type { ChallengeSecret } from "@/lib/contracts";
export { levelSchema, defectSchema, proctoringSchema, assessmentSchema, challengeSchema, assessmentDataSchema } from "./publicSchemas";
export const secretSchema: z.ZodType<ChallengeSecret> = z.object({ challengeId: z.string().min(1), referenceFix: z.string().min(1) });
export const secretDataSchema = z.object({ secrets: z.record(z.string(), secretSchema) });
