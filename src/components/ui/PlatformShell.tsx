"use client";

import { Monitor } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { shellCopy } from "./copy";
import { getLastApplicationFocus, ReportMotionContext, setTheme, useUiEnvironment } from "./environment";

function focusHeading(container: HTMLElement | null) {
  const heading = container?.querySelector<HTMLElement>("main h1, main h2, h1, h2");
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
  heading.focus();
}

export function PlatformShell({ children }: { children: ReactNode }) {
  const environment = useUiEnvironment();
  const pathname = usePathname();
  const report = pathname?.startsWith("/report") ?? false;
  const application = useRef<HTMLDivElement>(null);
  const blocker = useRef<HTMLHeadingElement>(null);
  const previousStatus = useRef("checking");
  const status = !environment.ready ? "checking" : environment.supported ? "ready" : "blocked";

  useLayoutEffect(() => {
    if (status === "checking") return;
    if (status === "blocked") blocker.current?.focus();
    else if (previousStatus.current === "blocked") {
      const previous = getLastApplicationFocus();
      if (previous?.isConnected && application.current?.contains(previous) && !previous.matches(":disabled") && !previous.closest("[hidden], [inert]")) previous.focus();
      else focusHeading(application.current);
    }
    previousStatus.current = status;
  }, [status]);

  return <div className="he-platform-shell">
    <a href="#main-content" className="skip-link" hidden={status !== "ready"} inert={status !== "ready"}
      onClick={(event) => {
        const main = application.current?.querySelector<HTMLElement>("main");
        if (!main) return;
        event.preventDefault();
        main.tabIndex = -1;
        main.focus();
        main.scrollIntoView?.({ block: "start" });
      }}>Skip to content</a>
    <div className="he-shell-tools">
      <fieldset className="he-theme-selector" data-ready={environment.ready} disabled={!environment.ready}>
        <legend className="sr-only">Theme</legend>
        {(["default", "retro"] as const).map((theme) => <label key={theme} className="he-theme-option">
          <input className="sr-only" type="radio" name="he-theme" value={theme} checked={environment.theme === theme} onChange={() => setTheme(theme)} />
          <span>{theme === "default" ? "Default" : "Retro"}</span>
        </label>)}
      </fieldset>
    </div>
    {status === "checking" && <p className="he-shell-check" role="status">{shellCopy.checking}</p>}
    {status === "blocked" && <section className="he-viewport-blocker" aria-labelledby="he-blocker-heading">
      <Monitor size={40} aria-hidden="true" />
      <h1 ref={blocker} id="he-blocker-heading" tabIndex={-1}>{shellCopy.heading}</h1>
      <p>{shellCopy.explanation}</p>
    </section>}
    <ReportMotionContext value={report}>
      <div ref={application} data-he-application="" className={report ? "he-application he-report" : "he-application"}
        hidden={status !== "ready"} inert={status !== "ready"} aria-hidden={status !== "ready"}>
        {environment.admitted ? children : null}
      </div>
    </ReportMotionContext>
  </div>;
}
