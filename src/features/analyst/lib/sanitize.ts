export const prohibitedLanguage=/\b(?:smart|lazy|talented|genius|personality|age|gender|religion|ethnic|accent|hire|hiring|reject|recommend(?:ation|ed|s)?|pass the candidate|fail the candidate)\b/i;
export function sanitizeSummary(text:string):string {
  const sentences=text.replace(/\s+/g," ").trim().match(/[^.!?]+(?:[.!?]+|$)/g)??[];
  return sentences.map(s=>s.trim()).filter(s=>s&&!prohibitedLanguage.test(s)).slice(0,3).join(" ").slice(0,500).trim();
}
