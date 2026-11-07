"use client";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { z } from "zod";
import type { IntegrityRecord, ProctoringConfig } from "@/lib/contracts";
import type { IntegritySample } from "./lib/samples";
import { foldSignals, summarizeIntegrity } from "./lib/integrity";
import { pendingSchema, preparationSchema, recordSchema, sampleSchema, type Preparation } from "./schema";
type Pending = z.infer<typeof pendingSchema>;
const live = new Map<string, IntegritySample[]>();
let storageWarning = false;
export const integrityStorageWarning = () => storageWarning;
const storage: StateStorage = {
  getItem(name) { try { return typeof window === "undefined" ? null : localStorage.getItem(name); } catch { storageWarning = true; return null; } },
  setItem(name, value) { try { localStorage.setItem(name, value); } catch { storageWarning = true; } },
  removeItem(name) { try { localStorage.removeItem(name); } catch { storageWarning = true; } },
};
export const preparationFingerprint = (config: ProctoringConfig) => `${config.mode}:${config.required}:${config.captureSnapshots}`;
interface IntegrityState {
  records: Record<string, IntegrityRecord>; preparations: Record<string, Preparation>; pending: Record<string, Pending>;
  prepare(value: Preparation): void;
  begin(id: string, startedAt: string, aiAssistance: boolean, preparation: Preparation): void;
  append(id: string, sample: IntegritySample): void;
  samples(id: string): readonly IntegritySample[];
  refresh(id: string, endT: number): IntegrityRecord | null;
  checkpoint(id: string): void;
  finish(id: string, endT: number): void;
  attachSnapshot(id: string, key: string, image: string): void;
  deleteSnapshots(id: string): void;
}
export const useIntegrityStore = create<IntegrityState>()(persist((set, get) => ({
  records: {}, preparations: {}, pending: {},
  prepare(input) { const value = preparationSchema.parse(input); set((state) => ({ preparations: { ...state.preparations, [value.assessmentId]: value } })); },
  begin(id, startedAt, aiAssistance, preparation) {
    if (get().records[id]) { if (get().pending[id] && !live.has(id)) live.set(id, [...get().pending[id].samples]); return; }
    const record: IntegrityRecord = { sessionId: id, mode: preparation.mode, consent: preparation.consent, ...(preparation.consentAt ? { consentAt: preparation.consentAt } : {}), calibration: preparation.calibration, signals: [], summary: summarizeIntegrity([], { aiAssistance }) };
    live.set(id, []);
    set((state) => ({ records: { ...state.records, [id]: record }, pending: { ...state.pending, [id]: { startedAt, aiAssistance, faceSignalsEnabled: preparation.mode === "camera_mic" && preparation.calibration.faceOk === true, samples: [], snapshots: {} } } }));
  },
  append(id, sample) {
    if (!get().pending[id]) return;
    const value = sampleSchema.parse(sample); const samples = live.get(id) ?? [...get().pending[id].samples];
    samples.push(value); live.set(id, samples);
  },
  samples(id) { return live.get(id) ?? get().pending[id]?.samples ?? []; },
  refresh(id, endT) {
    const record = get().records[id], pending = get().pending[id]; if (!record || !pending) return record ?? null;
    const samples = get().samples(id);
    const signals = foldSignals(samples, { endT, faceSignalsEnabled: pending.faceSignalsEnabled }).map((signal) => {
      const room = [...samples].reverse().find((sample) => sample.t <= signal.start && sample.room !== undefined)?.room;
      const snapshot = pending.snapshots[`${signal.type}:${signal.start}`];
      return { ...signal, ...(room !== undefined ? { room } : {}), ...(snapshot ? { snapshot } : {}) };
    });
    const summary = summarizeIntegrity(signals, { aiAssistance: pending.aiAssistance });
    if (record.mode === "camera_mic" && record.calibration.faceOk !== true) summary.caveats.push("Face detection was disabled because calibration was unavailable or unreliable.");
    if (record.mode === "camera_mic" && record.calibration.noiseFloor === null) summary.caveats.push("Voice signals were disabled because microphone calibration was unavailable.");
    const updated = { ...record, signals, summary };
    set((state) => ({ records: { ...state.records, [id]: updated } })); return updated;
  },
  checkpoint(id) { const pending = get().pending[id]; if (pending) set((state) => ({ pending: { ...state.pending, [id]: { ...pending, samples: [...get().samples(id)] } } })); },
  finish(id, endT) {
    if (!get().pending[id]) return;
    get().refresh(id, endT);
    live.delete(id); const pending = { ...get().pending }; delete pending[id]; set({ pending });
  },
  attachSnapshot(id, key, image) {
    const pending = get().pending[id];
    if (!pending || Object.keys(pending.snapshots).length >= 10 || pending.snapshots[key] || !/^data:image\/jpeg;base64,/.test(image)) return;
    set((state) => ({ pending: { ...state.pending, [id]: { ...pending, snapshots: { ...pending.snapshots, [key]: image } } } }));
  },
  deleteSnapshots(id) {
    const record = get().records[id]; if (!record) return;
    const signals = record.signals.map(({ snapshot, ...signal }) => { void snapshot; return signal; });
    const pending = get().pending[id];
    set((state) => ({ records: { ...state.records, [id]: { ...record, signals } }, ...(pending ? { pending: { ...state.pending, [id]: { ...pending, snapshots: {} } } } : {}) }));
  },
}), { name: "he:integrity", storage: createJSONStorage(() => storage), partialize: ({ records, preparations, pending }) => ({ records, preparations, pending }),
  merge(saved, current) { const parsed = z.object({ records: z.record(z.string(), recordSchema), preparations: z.record(z.string(), preparationSchema), pending: z.record(z.string(), pendingSchema) }).strict().safeParse(saved); if (!parsed.success) { if (saved !== undefined) storageWarning = true; return current; } return { ...current, ...parsed.data }; },
}));
export function getIntegrityRecord(sessionId: string): IntegrityRecord | null { return useIntegrityStore.getState().records[sessionId] ?? null; }
