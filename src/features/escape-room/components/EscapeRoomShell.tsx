import { t } from "@/lib/i18n";
import { AssessmentState } from "./AssessmentState";

export function EscapeRoomShell({ assessmentId }: { assessmentId: string }) {
  // TODO(H5b): load this assessmentId through useAssessmentBundle from the assessment
  // public index once Dev A ships it. Map its loading/ready/not_found states here,
  // hydrate sessions before deriving flow, then compose RulesScreen or the room UI.
  // H5a is also absent: do not fabricate assessment data or import starter secrets.
  return <main id="main-content" data-assessment-id={assessmentId} className="min-h-screen bg-he-bg px-6 py-16 text-he-text">
    <p className="mb-6 text-center text-sm text-he-muted lg:hidden">{t("en", "laptopNotice")}</p>
    <AssessmentState state="unavailable" />
  </main>;
}
