// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import { getIntegrityRecord, useIntegrityStore } from "../store";
import { getSession, useSessionStore } from "@/features/session";
import { getSeededChallenge } from "@challenges";
import type { AssessmentConfig } from "@/lib/contracts";
const config: AssessmentConfig = { id: "fictional-integrity", challengeId: "seed", candidateAlias: "Candidate A (fictional)", level: "mid", aiAssistance: false, durationMin: 45, proctoring: { mode: "browser", required: false, captureSnapshots: false }, locale: "en", token: "test", createdAt: new Date(0).toISOString() };
beforeEach(() => { localStorage.clear(); useIntegrityStore.setState({ records: {}, preparations: {}, pending: {} }); useSessionStore.setState({ sessions: {} }); });
it("keeps samples isolated, checkpoints explicitly, and discards them at completion", async () => {
 const id = useSessionStore.getState().start(config, getSeededChallenge()); const before = JSON.stringify(getSession(id));
 const store = useIntegrityStore.getState(); store.begin(id, new Date(0).toISOString(), false, { assessmentId: config.id, fingerprint: "browser:false:false", mode: "browser", consent: "not_required", calibration: { faceOk: null, noiseFloor: null, fullscreen: null } });
 store.append(id, { kind: "visibility", t: 0, hidden: true }); store.append(id, { kind: "visibility", t: 70_000, hidden: false });
 expect(JSON.parse(localStorage.getItem("he:integrity")!).state.pending[id].samples).toEqual([]);
 store.checkpoint(id); expect(JSON.parse(localStorage.getItem("he:integrity")!).state.pending[id].samples).toHaveLength(2);
 await useIntegrityStore.persist.rehydrate(); store.finish(id, 71_000);
 expect(getIntegrityRecord(id)?.signals).toHaveLength(1); expect(getIntegrityRecord(id)?.summary.reviewSuggested).toBe(true);
 expect(useIntegrityStore.getState().pending[id]).toBeUndefined(); expect(store.samples(id)).toEqual([]);
 expect(JSON.parse(localStorage.getItem("he:integrity")!).state.pending[id]).toBeUndefined();
 expect(JSON.stringify(getSession(id))).toBe(before);
 store.append(id, { kind: "focus", t: 80_000, focused: false }); expect(store.samples(id)).toEqual([]);
});
it("rejects raw media/identity payloads at the sample boundary", () => {
 const store = useIntegrityStore.getState(); store.begin("safe", new Date(0).toISOString(), false, { assessmentId: "safe", fingerprint: "browser", mode: "browser", consent: "not_required", calibration: { faceOk: null, noiseFloor: null, fullscreen: null } });
 expect(() => store.append("safe", { kind: "face", t: 0, faces: 1, confidence: .9, embedding: [1] } as unknown as Parameters<typeof store.append>[1])).toThrow();
});
it("limits optional local snapshots to ten and supports deleting them", () => {
 const store = useIntegrityStore.getState(); store.begin("snapshots", new Date(0).toISOString(), false, { assessmentId: "safe", fingerprint: "camera_mic:false:true", mode: "camera_mic", consent: "given", calibration: { faceOk: true, noiseFloor: .01, fullscreen: false } });
 for (let i = 0; i < 12; i++) store.attachSnapshot("snapshots", `face_absent:${i}`, "data:image/jpeg;base64,YQ==");
 expect(Object.keys(useIntegrityStore.getState().pending.snapshots.snapshots)).toHaveLength(10);
 store.deleteSnapshots("snapshots"); expect(useIntegrityStore.getState().pending.snapshots.snapshots).toEqual({});
});

it("does not replace uncheckpointed device samples when monitoring restarts", () => {
 const store = useIntegrityStore.getState();
 const preparation = { assessmentId: "restart", fingerprint: "camera_mic", mode: "camera_mic" as const, consent: "given" as const, calibration: { faceOk: true, noiseFloor: .01, fullscreen: true } };
 store.begin("restart", new Date(0).toISOString(), false, preparation);
 store.append("restart", { kind: "device", t: 1000, camera: false, mic: true });
 store.begin("restart", new Date(0).toISOString(), false, preparation);
 store.append("restart", { kind: "device", t: 4000, camera: true, mic: true });
 expect(store.refresh("restart", 5000)?.signals).toMatchObject([{ type: "camera_off", start: 1000, end: 4000 }]);
 store.finish("restart", 5000);
});
