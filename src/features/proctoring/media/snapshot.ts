export function captureSnapshot(video: HTMLVideoElement | null): string | null {
  if (!video || video.readyState < 2) return null;
  try { const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 120; const context = canvas.getContext("2d"); if (!context) return null; context.drawImage(video, 0, 0, 160, 120); return canvas.toDataURL("image/jpeg", .5); }
  catch { return null; }
}
