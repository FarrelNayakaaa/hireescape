"use client";

import { Component, type ReactNode } from "react";
import type { AssessmentConfig } from "@/lib/contracts";
import { t } from "@/lib/i18n";

export class EditorErrorBoundary extends Component<{ children: ReactNode; locale: AssessmentConfig["locale"] }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error("Code editor unavailable", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="space-y-4 p-6 text-he-text">
      <p>{t(this.props.locale, "editorUnavailable")}</p>
      <button type="button" onClick={() => window.location.reload()} className="min-h-10 rounded-lg border border-he-border px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-he-blue">{t(this.props.locale, "retry")}</button>
    </div>;
  }
}
