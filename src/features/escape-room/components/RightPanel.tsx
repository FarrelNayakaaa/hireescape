"use client";

import { useId, useReducer, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LockKeyhole } from "lucide-react";
import type { AssessmentConfig, EventDataMap, Room, RunResult } from "@/lib/contracts";
import { HiddenTestLocks, IncidentTicket } from "@/components/game";
import { TestResultsPanel } from "@/features/runner";
import { Button } from "@/components/ui";
import { t } from "@/lib/i18n";
import { initialRoomUiState, roomUiReducer, type PanelTab } from "../lib/flow";

const tabs: PanelTab[] = ["brief", "tests", "inquisitor", "assistant"];

export function RightPanel({ room, aiAssistance, title, brief, visible = null, hidden = null, running = false, recorded = null, activeTab: controlledTab, onTabChange, assistantPanel, inquisitorPanel, lastQuestionId, locale = "en" }: {
  room: Room; aiAssistance: boolean; title: string; brief: string;
  visible?: RunResult | null; hidden?: RunResult | null; running?: boolean; locale?: AssessmentConfig["locale"];
  assistantPanel?: ReactNode; inquisitorPanel?: ReactNode; lastQuestionId?: string;
  recorded?: EventDataMap["test_run"] | null; activeTab?: PanelTab; onTabChange?: (tab: PanelTab) => void;
}) {
  const [ui, dispatch] = useReducer(roomUiReducer, initialRoomUiState);
  const prefix = useId();
  const reducedMotion = useReducedMotion();
  const activeTab = controlledTab ?? ui.activeTab;
  const select = (tab: PanelTab) => { dispatch({ type: "select_tab", tab }); onTabChange?.(tab); };
  const assistantReason = !aiAssistance ? "aiDisabled" : room === 1 ? "aiRoom1" : room === 3 ? "aiRoom3" : null;
  const reason = activeTab === "assistant" ? assistantReason : activeTab === "inquisitor" && room === 1 ? "inquisitorRoom1" : null;
  return <aside className="min-w-0 space-y-4 bg-he-surface p-4 text-he-text">
    <div role="tablist" aria-label={t(locale, "brief")} className="flex flex-wrap gap-1 border-b border-he-border pb-3">
      {tabs.map((tab, index) => {
        const locked = tab === "assistant" ? assistantReason !== null : tab === "inquisitor" && room === 1;
        return <Button key={tab} variant="ghost" type="button" role="tab" id={`${prefix}-${tab}`} aria-controls={`${prefix}-panel`} aria-selected={activeTab === tab}
          tabIndex={activeTab === tab ? 0 : -1} onClick={() => select(tab)}
          onKeyDown={(event) => {
            const destination = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
            if (destination === undefined) return;
            event.preventDefault();
            const next = tabs[destination];
            select(next);
            document.getElementById(`${prefix}-${next}`)?.focus();
          }}
          className={`inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm ${activeTab === tab ? "bg-he-surface-2 text-he-text" : "text-he-muted"}`}>
          {locked && <LockKeyhole size={12} aria-hidden="true" />}<motion.span key={tab === "inquisitor" ? lastQuestionId : tab} animate={tab === "inquisitor" && lastQuestionId && !reducedMotion ? { opacity: [1, 0.35, 1, 0.35, 1] } : { opacity: 1 }} transition={{ duration: 1.2 }}>{t(locale, tab)}</motion.span>
        </Button>;
      })}
    </div>
    <div role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-${activeTab}`} tabIndex={0} className="space-y-4 focus-visible:outline-2 focus-visible:outline-he-blue">
      {activeTab === "brief" && <IncidentTicket brief={brief} title={title} label={t(locale, "incident")} emptyLabel={t(locale, "noBrief")} />}
      {activeTab === "tests" && <>
        {!visible && !hidden && recorded && !running ? <section className="space-y-3" aria-label={t(locale, "recordedResults")}>
          <p className="text-sm text-he-muted">{t(locale, "recordedResults")}</p>
          <p>{t(locale, "testCounts", { ...recorded.visible, suite: t(locale, "visibleSuite") })}</p>
          {recorded.hidden.total > 0 && <p>{t(locale, "testCounts", { passed: recorded.hidden.passed, total: recorded.hidden.total, suite: t(locale, "hiddenSuite") })}</p>}
          {recorded.hidden.failedNames.map((name, index) => <p key={`${index}-${name}`} className="text-sm text-he-muted">{name}</p>)}
          {recorded.timedOut && <p role="alert">{t(locale, "testTimeout")}</p>}
          {recorded.runtimeError && <p role="alert">{t(locale, "testExecutionError")}</p>}
        </section> : <TestResultsPanel visible={visible} hidden={hidden} running={running} />}
        <HiddenTestLocks results={hidden} recordedCounts={recorded?.hidden} summary={t(locale, "testCounts", { passed: hidden?.passed ?? recorded?.hidden.passed ?? 0, total: hidden?.total ?? recorded?.hidden.total ?? 0, suite: t(locale, "hiddenSuite") })}
          emptyLabel={t(locale, "hiddenPending")} openLabel={t(locale, "vaultOpen")}
          statusLabels={{ pass: t(locale, "pass"), fail: t(locale, "fail"), error: t(locale, "error") }} />
      </>}
      {activeTab === "inquisitor" && !reason && inquisitorPanel}
      {activeTab === "assistant" && assistantPanel}
      {((activeTab === "assistant" && !assistantPanel) || (activeTab === "inquisitor" && (reason || !inquisitorPanel))) && <p className="rounded-lg border border-he-border p-5 text-sm leading-6 text-he-muted">{t(locale, reason ?? "agentsComing")}</p>}
    </div>
  </aside>;
}
