export function canAskNudge({ count, automatic, now, lastAskedAt, changed, idle, busy }: { count: number; automatic: boolean; now: number; lastAskedAt: number; changed: boolean; idle: boolean; busy: boolean }): boolean {
  return !busy && count < 6 && (!automatic || (changed && idle && now - lastAskedAt >= 60_000));
}
export function questionCodeHash(code: string): number {
  let hash = 2166136261;
  for (let index = 0; index < code.length; index++) hash = Math.imul(hash ^ code.charCodeAt(index), 16777619);
  return hash >>> 0;
}
