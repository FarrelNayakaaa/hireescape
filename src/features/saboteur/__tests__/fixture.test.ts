import { expect, it } from "vitest";
import { listSeededChallenges } from "@challenges";
import { getSeededSecret } from "@challenges/secrets";
import fixture from "@/lib/codex/fixtures/saboteur.json";
import { SaboteurOutput } from "../schema";
import { seedOutput } from "../lib/seedOutput";
import { validateChallenge } from "../lib/validateChallenge";
it("parses the mock fixture and proves it with the real runner harness",async()=>{expect(SaboteurOutput.safeParse(fixture).success).toBe(true);expect(await validateChallenge(fixture,"mid")).toMatchObject({ok:true,failures:[],checks:expect.arrayContaining([{id:"R2",pass:true},{id:"R3",pass:true}])});});
it.each(listSeededChallenges().map(c=>({challenge:c})))('revalidates $challenge.id after whitespace-only size normalization',async({challenge})=>{const secret=getSeededSecret(challenge.id)!;const output=seedOutput(challenge,secret);expect(output.starterCode.trimEnd()).toBe(challenge.starterCode.trimEnd());expect(output.referenceFix.trimEnd()).toBe(secret.referenceFix.trimEnd());expect(await validateChallenge(output,challenge.level)).toMatchObject({ok:true,failures:[]});});
