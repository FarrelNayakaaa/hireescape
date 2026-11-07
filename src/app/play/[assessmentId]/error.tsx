"use client";

import { AssessmentState } from "@/features/escape-room";

export default function PlayError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="min-h-screen bg-he-bg p-8"><AssessmentState state="error" onRetry={reset} /></main>;
}
