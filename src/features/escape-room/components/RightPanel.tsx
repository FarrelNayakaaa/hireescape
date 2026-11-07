"use client";

import { useId, useReducer } from "react";
import { LockKeyhole } from "lucide-react";
import type { AssessmentConfig, Room, RunResult } from "@/lib/contracts";
import { HiddenTestLocks, IncidentTicket } from "@/components/game";
import { TestResultsPanel } from "@/features/runner";
import { t } from "@/lib/i18n";
import { initialRoomUiState, roomUiReducer, type PanelTab } from "../lib/flow";

const tabs: PanelTab[] = ["brief", "tests", "inquisitor", "assistant"];

export function RightPanel({ room, aiAssistance, title, brief, visible = null, hidden = null, running = false, locale = "en" }: {
  room: Room; aiAssistance: boolean; title: string; brief: string;
  visible?: RunResult | null; hidden?: RunResult | null; running?: boolean; locale?: AssessmentConfig["locale"];
}) {
  const [ui, dispatch] = useReducer(roomUiReducer, initialRoomUiState);
  const prefix = useId();
  const assistantReason = !aiAssistance ? "aiDisabled" : room === 1 ? "aiRoom1" : room === 3 ? "aiRoom3" : null;
  const reason = ui.activeTab === "assistant" ? assistantReason : ui.activeTab === "inquisitor" && room === 1 ? "inquisitorRoom1" : null;
  return <aside className="min-w-0 space-y-4 bg-he-surface p-4 text-he-text">
    <div role="tablist" aria-label={t(locale, "brief")} className="flex flex-wrap gap-1 border-b border-he-border pb-3">
      {tabs.map((tab, index) => {
        const locked = tab === "assistant" ? assistantReason !== null : tab === "inquisitor" && room === 1;
        return <button key={tab} type="button" role="tab" id={`${prefix}-${tab}`} aria-controls={`${prefix}-panel`} aria-selected={ui.activeTab === tab}
          tabIndex={ui.activeTab === tab ? 0 : -1} onClick={() => dispatch({ type: "select_tab", tab })}
          onKeyDown={(event) => {
            const destination = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
            if (destination === undefined) return;
            event.preventDefault();
            const next = tabs[destination];
            dispatch({ type: "select_tab", tab: next });
            document.getElementById(`${prefix}-${next}`)?.focus();
          }}
          className={`inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-he-blue ${ui.activeTab === tab ? "bg-he-surface-2 text-he-text" : "text-he-muted"}`}>
          {locked && <LockKeyhole size={12} aria-hidden="true" />}{t(locale, tab)}
        </button>;
      })}
    </div>
    <div role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-${ui.activeTab}`} tabIndex={0} className="space-y-4 focus-visible:outline-2 focus-visible:outline-he-blue">
      {ui.activeTab === "brief" && <IncidentTicket brief={brief} title={title} label={t(locale, "incident")} emptyLabel={t(locale, "noBrief")} />}
      {ui.activeTab === "tests" && <>
        <TestResultsPanel visible={visible} hidden={hidden} running={running} />
        <HiddenTestLocks results={hidden} summary={t(locale, "testCounts", { passed: hidden?.passed ?? 0, total: hidden?.total ?? 0, suite: t(locale, "hiddenSuite") })}
          emptyLabel={t(locale, "hiddenPending")} openLabel={t(locale, "vaultOpen")}
          statusLabels={{ pass: t(locale, "pass"), fail: t(locale, "fail"), error: t(locale, "error") }} />
      </>}
      {(ui.activeTab === "assistant" || ui.activeTab === "inquisitor") && <p className="rounded-lg border border-he-border p-5 text-sm leading-6 text-he-muted">{t(locale, reason ?? "agentsComing")}</p>}
    </div>
  </aside>;
}
