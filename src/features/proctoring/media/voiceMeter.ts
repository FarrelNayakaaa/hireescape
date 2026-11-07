import type { VoiceSample } from "../lib/samples";
export const rms = (values: Float32Array) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / Math.max(1, values.length));
export function median(values: readonly number[]) { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }
function audioReader(stream: MediaStream) {
  const context = new AudioContext(), analyser = context.createAnalyser(); analyser.fftSize = 1024;
  const source = context.createMediaStreamSource(stream); source.connect(analyser);
  const values = new Float32Array(analyser.fftSize); let closed = false;
  return { context, read: () => { if (closed) return 0; analyser.getFloatTimeDomainData(values); return rms(values); }, close: () => { if (closed) return; closed = true; source.disconnect(); analyser.disconnect(); void context.close().catch(() => console.warn("Microphone analysis was already closed")); } };
}
export function createVoiceMeter(stream: MediaStream, noiseFloor: number, onSample: (sample: VoiceSample) => void, now: () => number, onLevel: (level: number) => void = () => {}) {
  const reader = audioReader(stream); void reader.context.resume().catch(() => console.warn("Microphone analysis could not resume"));
  let activeMs = 0;
  const measure = setInterval(() => { const value = reader.read(); onLevel(Math.min(1, value / (Math.max(noiseFloor, .001) * 3))); activeMs += value > Math.max(noiseFloor, .001) * 3 ? 200 : 0; }, 200);
  const emit = setInterval(() => { onSample({ kind: "voice", t: now(), active: activeMs >= 600 }); activeMs = 0; }, 1000);
  return () => { clearInterval(measure); clearInterval(emit); reader.close(); };
}
export function calibrateMicrophone(stream: MediaStream, onPhase: (phase: "quiet" | "speak") => void, onLevel: (level: number) => void = () => {}) {
  const reader = audioReader(stream); void reader.context.resume().catch(() => console.warn("Microphone analysis could not resume")); onPhase("quiet");
  let timer: ReturnType<typeof setInterval>, done = false, cancel = () => {};
  const promise = new Promise<{ noiseFloor: number; voiceDetected: boolean }>((resolve) => {
    const quiet: number[] = []; let ticks = 0, floor = .001;
    const finish = (voiceDetected: boolean) => { if (done) return; done = true; clearInterval(timer); reader.close(); resolve({ noiseFloor: floor, voiceDetected }); };
    cancel = () => finish(false);
    timer = setInterval(() => {
      const value = reader.read(); onLevel(Math.min(1, value / (floor * 3))); ticks++;
      if (ticks <= 30) quiet.push(value);
      if (ticks === 30) { floor = Math.max(.001, median(quiet)); onPhase("speak"); }
      if (ticks > 30 && value > floor * 3) finish(true);
      if (ticks >= 130) finish(false);
    }, 100);
  });
  return { promise, cancel: () => cancel() };
}
