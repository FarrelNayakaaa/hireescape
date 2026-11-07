"use client";
import { AccentCard, Button } from "@/components/ui";
import { copy } from "../lib/copy";
export function ConsentScreen({ locale, captureSnapshots, onAgree, onDecline }: { locale: "en" | "id"; captureSnapshots: boolean; onAgree(): void; onDecline(): void }) {
  return <AccentCard accent="neutral" className="mx-auto max-w-2xl space-y-5"><h1>{copy(locale, "consentStep")}</h1><p>{copy(locale, "consent")}</p><p>{copy(locale, "retention")}</p>{captureSnapshots && <p>{copy(locale, "snapshots")}</p>}<div className="flex gap-4"><Button onClick={onAgree}>{copy(locale, "agree")}</Button><Button variant="secondary" onClick={onDecline}>{copy(locale, "decline")}</Button></div></AccentCard>;
}
