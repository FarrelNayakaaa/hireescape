"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null), [requesting, setRequesting] = useState(false);
  const current = useRef<MediaStream | null>(null), generation = useRef(0), mounted = useRef(true);
  const stop = useCallback(() => { generation.current++; for (const track of current.current?.getTracks() ?? []) track.stop(); current.current = null; if (mounted.current) { setStream(null); setRequesting(false); } }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stop(); }; }, [stop]);
  const request = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Media unavailable");
    const attempt = ++generation.current; setRequesting(true);
    try {
      const value = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" }, audio: true });
      if (!mounted.current || attempt !== generation.current) { for (const track of value.getTracks()) track.stop(); throw new Error("Media request cancelled"); }
      for (const track of current.current?.getTracks() ?? []) track.stop(); current.current = value; setStream(value); return value;
    } finally { if (mounted.current && attempt === generation.current) setRequesting(false); }
  }, []);
  return { stream, requesting, request, stop };
}
export function listenDevices(stream: MediaStream, callback: (state: { camera: boolean; mic: boolean }) => void) {
  const emit = () => callback({ camera: stream.getVideoTracks().some((track) => track.readyState === "live" && !track.muted), mic: stream.getAudioTracks().some((track) => track.readyState === "live" && !track.muted) });
  const events = ["ended", "mute", "unmute"] as const;
  for (const track of stream.getTracks()) for (const event of events) track.addEventListener(event, emit);
  navigator.mediaDevices?.addEventListener?.("devicechange", emit); emit();
  return () => { for (const track of stream.getTracks()) for (const event of events) track.removeEventListener(event, emit); navigator.mediaDevices?.removeEventListener?.("devicechange", emit); };
}
