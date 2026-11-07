import { vi } from "vitest";

export function mockBrowser(initialWidth = 1280, initialReduced = false) {
  let width = initialWidth;
  let reduced = initialReduced;
  const queries = new Set<MediaQueryList>();
  const matches = (query: string) => query.includes("reduced-motion") ? reduced : width >= 768;
  vi.stubGlobal("matchMedia", vi.fn((query: string) => {
    const target = new EventTarget();
    const media = {
      media: query, matches: matches(query), onchange: null,
      addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
      addListener: (listener: EventListener) => target.addEventListener("change", listener),
      removeListener: (listener: EventListener) => target.removeEventListener("change", listener),
    } as MediaQueryList;
    queries.add(media);
    return media;
  }));
  const notify = () => {
    for (const media of queries) {
      const next = matches(media.media);
      if (media.matches === next) continue;
      Object.defineProperty(media, "matches", { value: next, configurable: true });
      const event = new Event("change");
      Object.defineProperty(event, "matches", { value: next });
      media.dispatchEvent(event);
    }
  };
  return {
    resize: (next: number) => { width = next; notify(); },
    reduceMotion: (next: boolean) => { reduced = next; notify(); },
  };
}
