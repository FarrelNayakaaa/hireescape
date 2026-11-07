import { z } from "zod";
export const InquisitorRequest = z.object({
  assessmentId: z.string().min(1), mode: z.enum(["nudge", "defence"]), locale: z.enum(["en", "id"]),
  challenge: z.object({ brief: z.string(), defectType: z.string(), rubricHints: z.array(z.string()) }).strict(),
  starterCode: z.string(), currentCode: z.string(), recentQA: z.array(z.object({ q: z.string(), a: z.string().nullable() }).strict()).max(6),
  defenceIndex: z.number().int().min(0).max(2).nullable(),
}).strict();
export const InquisitorOutput = z.object({
  skip: z.boolean(), question: z.string(), groundedIn: z.object({ line: z.number().int(), quote: z.string() }),
  intent: z.enum(["probe_reasoning", "edge_case", "failure_mode", "observability", "tradeoff", "verification"]),
});
export const InquisitorResponse = z.object({ result: InquisitorOutput.nullable(), skippedReason: z.enum(["model_skip", "validation_failed"]).nullable() });
export type InquisitorInput = z.infer<typeof InquisitorRequest>;
export type QuestionOutput = z.infer<typeof InquisitorOutput>;
