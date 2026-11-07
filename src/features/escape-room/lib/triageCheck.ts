export type MarkedRange = [number, number];
export function triageCheck(marked: MarkedRange | null, defect: MarkedRange): { valid: boolean; correct: boolean } {
  if (!marked || !marked.every(Number.isInteger) || marked[0] < 1 || marked[1] < marked[0] || marked[1] - marked[0] >= 8) return { valid: false, correct: false };
  return { valid: true, correct: marked[0] <= defect[1] + 2 && marked[1] >= defect[0] - 2 };
}
export function toggleMarkedLine(marked: MarkedRange | null, line: number): MarkedRange | null {
  if (!marked) return [line, line];
  if (marked[0] === line && marked[1] === line) return null;
  if (marked[0] === line) return [line + 1, marked[1]];
  if (marked[1] === line) return [marked[0], line - 1];
  return [Math.min(line, marked[0]), Math.max(line, marked[1])];
}
