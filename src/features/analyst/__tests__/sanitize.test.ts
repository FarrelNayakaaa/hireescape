import { expect, it } from "vitest";
import { sanitizeSummary } from "../lib/sanitize";
it("retains at most three factual sentences",()=>{expect(sanitizeSummary("One. Two! Three? Four.")).toBe("One. Two! Three?");});
it.each(["Recommend hiring this candidate.","Reject this candidate.","Pass the candidate.","The candidate is talented."])("removes unsafe sentence: %s",text=>{expect(sanitizeSummary(`${text} The session recorded two test runs.`)).toBe("The session recorded two test runs.");});
