import { AccentCard } from "@/components/ui";
import type { AssessmentConfig } from "@/lib/contracts";
import { t } from "@/lib/i18n";
import { Mascot } from "@/components/ui/Mascot";
export function TimeoutScreen({ locale }: { locale: AssessmentConfig["locale"] }) { return <AccentCard accent="neutral" className="he-escape-celebration"><Mascot state="idle" className="he-reward-mascot" /><h1>{t(locale, "timeoutThanks")}</h1></AccentCard>; }
