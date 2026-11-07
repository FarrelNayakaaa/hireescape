import type { AssessmentConfig } from "@/lib/contracts";
import { en, type TranslationKey } from "./en";
import { id } from "./id";

export type { TranslationKey } from "./en";

export function t(locale: AssessmentConfig["locale"], key: TranslationKey, values: Record<string, string | number> = {}): string {
  const template = locale === "id" ? id[key] ?? en[key] : en[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}
