import { AccentCard } from "@/components/ui";
import type { AssessmentConfig } from "@/lib/contracts";
import { t } from "@/lib/i18n";
export function TimeoutScreen({ locale }: { locale: AssessmentConfig["locale"] }) { return <AccentCard accent="neutral"><h1>{t(locale, "timeoutThanks")}</h1></AccentCard>; }
