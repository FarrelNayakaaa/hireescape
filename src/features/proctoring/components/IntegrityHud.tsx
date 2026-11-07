"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { IntegrityShield } from "@/components/game/IntegrityShield";
import { IntegrityContext } from "./context";
import { copy } from "../lib/copy";
import { integrityStorageWarning } from "../store";
export function IntegrityHud() {
  const context = useContext(IntegrityContext); const [minimized, setMinimized] = useState(false); const video = useRef<HTMLVideoElement | null>(null);
  const stream = context?.stream;
  useEffect(() => { if (video.current) video.current.srcObject = stream ?? null; }, [stream]);
  if (!context?.preparation) return null;
  const { locale, preparation, paused, retryMedia } = context;
  const browser = preparation.mode === "browser";
  return <div className="flex flex-wrap items-center gap-2"><IntegrityShield state={browser ? "browser" : paused ? "paused" : "active"} label={copy(locale, browser ? "browserOnly" : paused ? "paused" : "active")} />
    {!browser && <><video ref={video} muted playsInline autoPlay width={64} height={64} aria-label={copy(locale, "camera")} className={minimized ? "h-2 w-2 rounded-full border border-he-muted" : "h-16 w-16 rounded-full border-2 border-he-muted object-cover"} /><Button size="sm" variant="ghost" onClick={() => setMinimized((value) => !value)}>{copy(locale, minimized ? "expand" : "minimize")}</Button>{paused && <Button variant="secondary" size="sm" onClick={retryMedia}>{copy(locale, "camera")}: {copy(locale, "retry")}</Button>}</>}
    {integrityStorageWarning() && <p role="status">{copy(locale, "storage")}</p>}
  </div>;
}
