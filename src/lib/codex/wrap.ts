export const wrapCandidate = (label: string, text: string): string =>
  `<candidate_${label}>\n${text.replaceAll("</candidate_", "</candidate-")}\n</candidate_${label}>`;

export const numberLines = (code: string): string =>
  code.split("\n").map((line, index) => `${String(index + 1).padStart(3, " ")}| ${line}`).join("\n");
