"use client";

import { useState } from "react";
import { useAssessmentBundle } from "@/features/assessment";
import { findActiveSession, useSessionStore } from "@/features/session";
import { ProctoringGate } from "@/features/proctoring";
import { t } from "@/lib/i18n";
import { useSessionHydration } from "../hooks/useSessionHydration";
import { AssessmentState } from "./AssessmentState";
import { RulesScreen } from "./RulesScreen";
import { RoomWorkspace } from "./RoomWorkspace";

export function EscapeRoomShell({ assessmentId }: { assessmentId: string }) {
  const { status, bundle } = useAssessmentBundle(assessmentId);
  const hydration = useSessionHydration();
  const sessions = useSessionStore((state) => state.sessions);
  const [startError, setStartError] = useState(false);
  const session = Object.values(sessions).filter((item) => item.assessmentId === assessmentId)
    .sort((a, b) => Number(Boolean(a.endedAt)) - Number(Boolean(b.endedAt)) || b.startedAt.localeCompare(a.startedAt))[0];
  const locale = bundle?.assessment.locale ?? "en";
  const start = () => {
    if (!bundle) return;
    const active = findActiveSession(assessmentId);
    if (active?.events.some((event) => event.type === "rules_ack")) return;
    try {
      const store = useSessionStore.getState();
      const id = active?.id ?? store.start(bundle.assessment, bundle.challenge);
      store.record(id, { type: "rules_ack", room: 0, data: {} });
      store.record(id, { type: "room_enter", room: 1, data: { room: 1 } });
    } catch { setStartError(true); }
  };
  return <main id="main-content" data-assessment-id={assessmentId} className="min-h-screen bg-he-bg px-6 pt-16 pb-6 text-he-text">
    <p className="mb-6 text-center text-sm text-he-muted lg:hidden">{t(locale, "laptopNotice")}</p>
    <div className="hidden lg:block">{hydration.error ? <AssessmentState state="error" locale={locale} onRetry={() => void hydration.retry()} />
      : status === "loading" || !hydration.hydrated ? <AssessmentState state="loading" locale={locale} />
      : !bundle ? <AssessmentState state="not_found" locale={locale} />
      : <ProctoringGate assessment={bundle.assessment} session={session ?? null}>{session && (session.endedAt || session.events.some((event) => event.type === "rules_ack")) ? <RoomWorkspace key={session.id} assessment={bundle.assessment} challenge={bundle.challenge} session={session} />
      : <>{startError && <p role="alert" className="mb-4 text-center text-he-red">{t(locale, "startError")}</p>}
        <RulesScreen assessment={bundle.assessment} title={bundle.challenge.title} onStart={start} /></>}</ProctoringGate>}
    </div>
  </main>;
}
