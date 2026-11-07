"use client";
import { useEffect, useState } from "react";

export function useDemoOffline() {
  const [status, setStatus] = useState<"preparing" | "ready" | "unavailable">("preparing");
  useEffect(() => {
    let active = true;
    let observer: MutationObserver | undefined;
    let channel: MessageChannel | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const editorReady = new Promise<void>(resolve => {
      if (document.querySelector(".monaco-editor")) { resolve(); return; }
      observer = new MutationObserver(() => {
        if (document.querySelector(".monaco-editor")) { observer?.disconnect(); resolve(); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
    const prepare = async () => {
      if (!("serviceWorker" in navigator)) throw new Error("Offline cache is unsupported");
      const existing = await navigator.serviceWorker.getRegistration("/report/demo");
      if (!navigator.onLine && existing?.active) { await editorReady; return; }
      await navigator.serviceWorker.register("/demo-offline-worker.js", { scope: "/report/demo", updateViaCache: "none" });
      const registration = await navigator.serviceWorker.ready;
      await Promise.all([editorReady, document.fonts?.ready]);
      if (!active) return;
      if (!registration.active) throw new Error("Offline worker is unavailable");
      channel = new MessageChannel();
      const saved = new Promise<void>((resolve, reject) => {
        channel!.port1.onmessage = event => event.data?.type === "DEMO_CACHED" ? resolve() : reject(new Error("Demo could not be cached"));
      });
      const urls = performance.getEntriesByType("resource").map(entry => entry.name);
      registration.active.postMessage({ type: "CACHE_DEMO", urls }, [channel.port2]);
      await saved;
    };
    void Promise.race([prepare(), new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Offline preparation timed out")), 15_000);
    })]).then(() => { if (active) setStatus("ready"); }).catch(() => {
      if (active) { console.warn("Demo offline backup could not be prepared"); setStatus("unavailable"); }
    }).finally(() => { clearTimeout(timeout); observer?.disconnect(); channel?.port1.close(); });
    return () => { active = false; clearTimeout(timeout); observer?.disconnect(); channel?.port1.close(); };
  }, []);
  return status;
}
