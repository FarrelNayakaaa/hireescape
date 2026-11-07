import type { AssessmentConfig } from "@/lib/contracts";
import type { QuestionOutput } from "../schema";
export const fallbackQuestions = [
  "What could happen if the dependency on this line remains unavailable under load?",
  "Which signal would help distinguish a dependency failure here from invalid input?",
  "What trade-off does this choice introduce when traffic grows?",
] as const;
const fallbackId = ["Apa yang dapat terjadi jika dependensi pada baris ini tetap tidak tersedia saat beban tinggi?", "Sinyal apa yang membantu membedakan kegagalan dependensi di sini dari input tidak valid?", "Kompromi apa yang timbul dari pilihan ini saat trafik meningkat?"] as const;
export function fallbackQuestion(code: string, index: number, locale: AssessmentConfig["locale"] = "en"): QuestionOutput {
  const lines = code.split("\n");
  const line = Math.max(0, lines.findIndex((text) => text.trim().length >= 8));
  return { skip: false, question: (locale === "id" ? fallbackId : fallbackQuestions)[index as 0 | 1 | 2], groundedIn: { line: line + 1, quote: lines[line].trim() }, intent: (["failure_mode", "observability", "tradeoff"] as const)[index as 0 | 1 | 2] };
}
