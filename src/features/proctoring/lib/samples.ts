import type { Room } from "@/lib/contracts";
type Base = { t: number; room?: Room | 0 };
export type FaceSample = Base & { kind: "face"; faces: number; confidence: number };
export type VoiceSample = Base & { kind: "voice"; active: boolean };
export type BrowserSample = Base & ({ kind: "visibility"; hidden: boolean } | { kind: "focus"; focused: boolean } | { kind: "fullscreen"; active: boolean });
export type IntegritySample = FaceSample | VoiceSample | BrowserSample | (Base & { kind: "device"; camera: boolean; mic: boolean });
