"use client";
import { useMonacoDiff } from "@/lib/hooks/useMonacoDiff";
export function AssistantDiff({ original, modified, label = "Suggestion diff" }: { original: string; modified: string; label?: string }) {
  const container = useMonacoDiff(original, modified, label);
  return <div ref={container} className="h-[55vh] w-full" />;
}
