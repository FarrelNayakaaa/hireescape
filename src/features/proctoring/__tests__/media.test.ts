// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createFaceSampler, faceCalibration } from "../media/faceSampler";
import { createVoiceMeter, median, rms } from "../media/voiceMeter";
const vision = vi.hoisted(() => ({ create: vi.fn(), detect: vi.fn(), close: vi.fn(), resolve: vi.fn() }));
vi.mock("@mediapipe/tasks-vision", () => ({ FilesetResolver: { forVisionTasks: vision.resolve }, FaceDetector: { createFromOptions: vision.create } }));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it("uses local assets, GPU then CPU, samples at one FPS, and closes the detector", async () => {
 vi.useFakeTimers(); vision.resolve.mockResolvedValue({}); vision.create.mockRejectedValueOnce(new Error("no GPU")).mockResolvedValueOnce({ detectForVideo: vision.detect, close: vision.close }); vision.detect.mockReturnValue({ detections: [{ categories: [{ score: .9 }] }] });
 const sample = vi.fn(); const stop = await createFaceSampler({ readyState: 2 } as HTMLVideoElement, sample, () => 1000);
 expect(vision.resolve).toHaveBeenCalledWith("/mediapipe/wasm"); expect(vision.create.mock.calls.map((args) => args[1].baseOptions.delegate)).toEqual(["GPU", "CPU"]);
 await vi.advanceTimersByTimeAsync(999); expect(sample).not.toHaveBeenCalled(); await vi.advanceTimersByTimeAsync(1); expect(sample).toHaveBeenCalledWith({ kind: "face", t: 1000, faces: 1, confidence: .9 }); stop(); expect(vision.close).toHaveBeenCalledOnce();
});
it("enables face signals only when four of five samples meet the confidence check", () => {
 const samples = Array.from({ length: 5 }, (_, i) => ({ kind: "face" as const, t: i * 1000, faces: i < 4 ? 1 : 0, confidence: i < 4 ? .9 : 0 }));
 expect(faceCalibration(samples)).toBe(true); expect(faceCalibration(samples.slice(0, 4))).toBe(false); expect(faceCalibration(samples.map((s) => ({ ...s, confidence: .6 })))).toBe(false);
});
it("measures RMS without speaker output and requires at least 60% sustained activity", () => {
 vi.useFakeTimers(); vi.setSystemTime(0); let amplitude = .02; const connect = vi.fn(), close = vi.fn().mockResolvedValue(undefined);
 class Context { destination = {}; createAnalyser() { return { fftSize: 1024, getFloatTimeDomainData(values: Float32Array) { values.fill(amplitude); }, disconnect() {} }; } createMediaStreamSource() { return { connect, disconnect() {} }; } resume() { return Promise.resolve(); } close = close; }
 vi.stubGlobal("AudioContext", Context); const sample = vi.fn(); const stop = createVoiceMeter({} as MediaStream, .005, sample, () => Date.now());
 vi.advanceTimersByTime(400); amplitude = 0; vi.advanceTimersByTime(600); expect(sample.mock.calls[0][0].active).toBe(false);
 amplitude = .02; vi.advanceTimersByTime(600); amplitude = 0; vi.advanceTimersByTime(400); expect(sample.mock.calls[1][0].active).toBe(true);
 expect(connect.mock.calls[0][0]).not.toHaveProperty("destination"); stop(); expect(close).toHaveBeenCalledOnce(); expect(median([1, 4, 2, 3])).toBe(2.5); expect(rms(new Float32Array([.5, -.5]))).toBe(.5);
});
