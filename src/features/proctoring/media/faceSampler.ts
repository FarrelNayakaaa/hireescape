import type { FaceSample } from "../lib/samples";
export type FaceBox = { x: number; y: number; width: number; height: number };
export async function createFaceSampler(video: HTMLVideoElement, onSample: (sample: FaceSample) => void, now: () => number, onError: () => void = () => {}, onBoxes: (boxes: FaceBox[]) => void = () => {}) {
  const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const options = { runningMode: "VIDEO" as const, minDetectionConfidence: .5 };
  let detector;
  try { detector = await FaceDetector.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: "/mediapipe/blaze_face_short_range.tflite", delegate: "GPU" } }); }
  catch { detector = await FaceDetector.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: "/mediapipe/blaze_face_short_range.tflite", delegate: "CPU" } }); }
  let closed = false;
  const stop = () => { if (closed) return; closed = true; clearInterval(timer); detector.close(); };
  const timer = setInterval(() => {
    if (video.readyState < 2 || closed) return;
    try {
      const result = detector.detectForVideo(video, performance.now());
      onBoxes(result.detections.flatMap((detection) => { const box = detection.boundingBox; return box ? [{ x: box.originX * 320 / (video.videoWidth || 320), y: box.originY * 240 / (video.videoHeight || 240), width: box.width * 320 / (video.videoWidth || 320), height: box.height * 240 / (video.videoHeight || 240) }] : []; }));
      onSample({ kind: "face", t: now(), faces: result.detections.length, confidence: Math.max(0, ...result.detections.map((detection) => detection.categories[0]?.score ?? 0)) });
    } catch { stop(); onError(); }
  }, 1000);
  return stop;
}
export function faceCalibration(samples: readonly FaceSample[]) {
  return samples.length >= 5 && samples.filter((sample) => sample.faces >= 1).length >= 4 && samples.reduce((sum, sample) => sum + sample.confidence, 0) / samples.length >= .7;
}
