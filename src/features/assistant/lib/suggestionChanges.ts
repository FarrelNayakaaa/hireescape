import { diffLineOps } from "@/features/session";
export function suggestionChanges(current: string, suggested: string) {
  const changes = diffLineOps(current.split("\n"), suggested.split("\n"));
  return { linesAdded: changes.filter((op) => op.type === "add").length, linesRemoved: changes.filter((op) => op.type === "remove").length };
}
