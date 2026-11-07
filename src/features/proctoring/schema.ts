import { z } from "zod";
import type { IntegrityRecord } from "@/lib/contracts";
const time = z.number().finite().nonnegative();
const base = { t: time, room: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional() };
export const sampleSchema = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("face"), faces: z.number().int().nonnegative(), confidence: z.number().min(0).max(1) }).strict(),
  z.object({ ...base, kind: z.literal("voice"), active: z.boolean() }).strict(),
  z.object({ ...base, kind: z.literal("visibility"), hidden: z.boolean() }).strict(),
  z.object({ ...base, kind: z.literal("focus"), focused: z.boolean() }).strict(),
  z.object({ ...base, kind: z.literal("fullscreen"), active: z.boolean() }).strict(),
  z.object({ ...base, kind: z.literal("device"), camera: z.boolean(), mic: z.boolean() }).strict(),
]);
export const preparationSchema = z.object({ assessmentId: z.string(), fingerprint: z.string(), mode: z.enum(["browser", "camera_mic"]), consent: z.enum(["given", "declined", "not_required"]), consentAt: z.iso.datetime().optional(), calibration: z.object({ faceOk: z.boolean().nullable(), noiseFloor: z.number().nonnegative().nullable(), fullscreen: z.boolean().nullable() }) }).strict();
export type Preparation = z.infer<typeof preparationSchema>;
const signal = z.object({ id: z.string(), type: z.enum(["tab_hidden", "window_blur", "fullscreen_exit", "face_absent", "multiple_faces", "voice_activity", "camera_off", "mic_off"]), start: time, end: time, durationMs: time, room: base.room, snapshot: z.string().regex(/^data:image\/jpeg;base64,/).optional() }).strict();
export const recordSchema: z.ZodType<IntegrityRecord> = z.object({ sessionId: z.string(), mode: z.enum(["off", "browser", "camera_mic"]), consent: preparationSchema.shape.consent, consentAt: z.iso.datetime().optional(), calibration: preparationSchema.shape.calibration, signals: z.array(signal), summary: z.object({ counts: z.record(z.string(), time), totalsMs: z.record(z.string(), time), reviewSuggested: z.boolean(), reasons: z.array(z.string()), caveats: z.array(z.string()) }).strict() }).strict();
export const pendingSchema = z.object({ startedAt: z.iso.datetime(), aiAssistance: z.boolean(), faceSignalsEnabled: z.boolean(), samples: z.array(sampleSchema), snapshots: z.record(z.string(), z.string().regex(/^data:image\/jpeg;base64,/)) }).strict();
