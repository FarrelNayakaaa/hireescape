import type { Theme } from "./environment";

export function readStoredTheme(read: () => string | null): Theme {
  try { return read() === "retro" ? "retro" : "default"; } catch { return "default"; }
}

// A fixed, self-contained script runs before body content; no user content is interpolated.
export const themeBootstrap = `(()=>{let theme="default";try{if(localStorage.getItem("he-theme")==="retro")theme="retro";}catch{}document.documentElement.dataset.theme=theme;})();`;
