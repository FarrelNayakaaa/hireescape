import { z } from "zod";
export const defectTypes = ["swallowed_exception", "unhandled_null", "cache_no_fallback", "off_by_one", "shared_mutation", "missing_await", "unbounded_retry", "resource_leak"] as const;
export const SaboteurRequest = z.object({
  level: z.enum(["junior", "mid", "senior"]), defectType: z.enum(defectTypes),
  domainHint: z.string().max(60).nullable(), previousFailures: z.array(z.string()).max(10),
});
export const SaboteurOutput = z.object({
  title: z.string().max(90), brief: z.string().max(1200), starterCode: z.string(), referenceFix: z.string(),
  visibleTests: z.string(), hiddenTests: z.string(), defectLines: z.array(z.number().int().min(1)).length(2),
  rubricHints: z.array(z.string().max(200)).min(2).max(5),
});
export type SaboteurInput = z.infer<typeof SaboteurRequest>;
export type GeneratedOutput = z.infer<typeof SaboteurOutput>;
