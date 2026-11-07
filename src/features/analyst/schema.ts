import { z } from "zod";
import type { ObjectiveMetrics, Report } from "@/lib/contracts";
const count=z.number().int().nonnegative();
const seconds=z.number().nonnegative().nullable();
const share=z.number().min(0).max(1).nullable();
export const ObjectiveMetricsSchema: z.ZodType<ObjectiveMetrics> = z.object({
  hiddenPassed:count,hiddenTotal:count,testRuns:count,timeToFixSec:seconds,
  roomTimesSec:z.object({1:seconds,2:seconds,3:seconds}).strict(),changedLines:count,
  aiLineShare:share,aiEditedShare:share,pasteCount:count,assistantPrompts:count,diffViewsBeforeApply:count,testRunsAfterApply:count,
}).strict();
export const AnalystRequest=z.object({
  aiAssistance:z.boolean(),challenge:z.object({brief:z.string(),defectType:z.string(),rubricHints:z.array(z.string())}).strict(),
  referenceFix:z.string(),starterCode:z.string(),finalCode:z.string(),timeline:z.string(),objective:ObjectiveMetricsSchema,
  suggestions:z.array(z.object({id:z.string(),code:z.string()}).strict()),
}).strict();
export const AnalystOutput=z.object({
  claims:z.array(z.object({dimension:z.enum(["debugging","design","communication","ai_supervision"]),signal:z.enum(["strength","concern","observation"]),statement:z.string().max(280),
    evidence:z.array(z.object({kind:z.enum(["code_line","event"]),line:z.number().int().nullable(),eventId:z.string().nullable(),quote:z.string().max(200)})).min(1).max(3),basis:z.enum(["executed","ai_predicted"])})).max(14),
  summary:z.string().max(500),
});
export type AnalystInput=z.infer<typeof AnalystRequest>;
export type AnalysisOutput=z.infer<typeof AnalystOutput>;
const competency=z.enum(["strong","some","concern","insufficient","not_assessed"]);
export const ReportSchema: z.ZodType<Report> = z.object({
  sessionId:z.string(),generatedAt:z.iso.datetime(),promptVersion:z.string(),aiAssistance:z.boolean(),objective:ObjectiveMetricsSchema,
  claims:z.array(z.object({id:z.string(),dimension:z.enum(["debugging","design","communication","ai_supervision"]),signal:z.enum(["strength","concern","observation"]),statement:z.string(),evidence:z.array(z.object({kind:z.enum(["code_line","event"]),line:z.number().int().positive().optional(),eventId:z.string().optional(),quote:z.string()})),basis:z.enum(["executed","ai_predicted"])})),
  droppedClaims:count,competency:z.object({debugging:competency,design:competency,communication:competency,ai_supervision:competency}),summary:z.string(),disclaimer:z.string(),
});
