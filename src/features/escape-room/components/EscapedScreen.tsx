"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { AssessmentConfig, Session } from "@/lib/contracts";
import { KeyCounter, formatTime } from "@/components/game";
import { AccentCard, buttonStyles } from "@/components/ui";
import { t } from "@/lib/i18n";
import { Mascot } from "@/components/ui/Mascot";
export function EscapedScreen({ session, locale }: { session: Session; locale: AssessmentConfig["locale"] }) {
  const reduced = useReducedMotion();
  return <AccentCard accent="room3" className="he-escape-celebration mx-auto max-w-3xl space-y-6"><Mascot state="done" className="he-reward-mascot" /><h1>{t(locale, "escapedTime", { time: formatTime(Date.parse(session.endedAt ?? session.startedAt) - Date.parse(session.startedAt)) })}</h1>
    <KeyCounter keys={3} label={t(locale, "keys", { count: 3 })} earnedLabel={t(locale, "earnedKey")} lockedLabel={t(locale, "lockedKey")} />
    {!reduced && <motion.div aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.6 }} className="h-8 rounded-t-full border-t border-he-green" />}
    <p>{t(locale, "escapedThanks")}</p>
    <Link href="/" className={buttonStyles("primary")}>{t(locale, "backToHome")}</Link></AccentCard>;
}
