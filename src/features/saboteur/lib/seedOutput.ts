import type { Challenge, ChallengeSecret, Level } from "@/lib/contracts";
import type { GeneratedOutput } from "../schema";
export const lineBounds: Record<Level, readonly [number, number]> = { junior: [25, 50], mid: [40, 100], senior: [80, 150] };
/** Existing seeds predate A5's size bounds. Only append blank lines; executable text and defect positions stay exact. */
export function seedOutput(challenge: Challenge, secret: ChallengeSecret): GeneratedOutput {
  const pad = (code: string) => code + "\n".repeat(Math.max(0, lineBounds[challenge.level][0] - code.split("\n").length));
  return { title: challenge.title, brief: challenge.brief, starterCode: pad(challenge.starterCode), referenceFix: pad(secret.referenceFix), visibleTests: challenge.visibleTests, hiddenTests: challenge.hiddenTests, defectLines: [...challenge.defectLines], rubricHints: [...challenge.rubricHints] };
}
