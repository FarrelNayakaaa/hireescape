import { z } from "zod";
const counts = z.object({ passed: z.number().int().nonnegative(), total: z.number().int().nonnegative() }).strict();
export const AssistantRequest = z.object({
  assessmentId: z.string().min(1), room: z.literal(2), locale: z.enum(["en", "id"]), brief: z.string(), currentCode: z.string(), visibleTests: z.string(),
  lastRun: z.object({ visible: counts, hidden: counts.extend({ failedNames: z.array(z.string()) }) }).strict().nullable(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }).strict()).max(8), prompt: z.string().min(1).max(2000),
}).strict();
export const AssistantOutput = z.object({ message: z.string(), suggestion: z.object({ summary: z.string().max(160), code: z.string() }).nullable() });
export type AssistantInput = z.infer<typeof AssistantRequest>;
export type AssistantReply = z.infer<typeof AssistantOutput>;
