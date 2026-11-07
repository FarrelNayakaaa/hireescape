import { beforeEach, expect, it, vi } from "vitest";
import type { RunResult } from "@/lib/contracts";
import { runTests } from "@/features/runner";
import fixture from "@/lib/codex/fixtures/saboteur.json";
import { validateChallenge } from "../lib/validateChallenge";
vi.mock("@/features/runner",()=>({runTests:vi.fn()}));
const passing=(target:"visible"|"hidden"="hidden"):RunResult=>({runId:"test",target,total:1,passed:1,failed:0,results:[{name:"behaviour",status:"pass",durationMs:0}],timedOut:false,durationMs:0});
const failed=():RunResult=>({...passing(),passed:0,failed:1,results:[{name:"behaviour",status:"fail",message:"Expected truthy",durationMs:0}]});
beforeEach(()=>{vi.mocked(runTests).mockReset();});
function queue(overrides:Partial<Record<number,RunResult>>={}){[passing("visible"),failed(),passing(),passing("visible")].forEach((r,i)=>vi.mocked(runTests).mockResolvedValueOnce(overrides[i]??r));}
it("runs the four combinations serially and emits every check",async()=>{queue();const checks=vi.fn();expect(await validateChallenge(fixture,"mid",checks)).toMatchObject({ok:true,failures:[]});expect(checks).toHaveBeenCalledTimes(10);expect(vi.mocked(runTests).mock.calls.map(([r])=>[r.code===fixture.starterCode?"starter":"fix",r.target])).toEqual([["starter","visible"],["starter","hidden"],["fix","hidden"],["fix","visible"]]);});
it.each([[0,"R1 failed: visible test 'behaviour' fails on starterCode: Expected truthy"],[2,"R3 failed: hidden test 'behaviour' fails on referenceFix: Expected truthy"],[3,"R4 failed: visible test 'behaviour' fails on referenceFix: Expected truthy"]] as const)("reports failed suite %i",async(index,message)=>{queue({[index]:failed()});expect((await validateChallenge(fixture,"mid")).failures).toContain(message);});
it("rejects hidden tests that do not catch the bug",async()=>{queue({1:passing()});expect((await validateChallenge(fixture,"mid")).failures).toContain("R2 failed: no hidden test fails on starterCode (the bug is not caught)");});
it("rejects runtime errors while accepting ordinary test exceptions as evidence of a broken starter",async()=>{queue({1:{...failed(),runtimeError:"Could not load"}});expect((await validateChallenge(fixture,"mid")).ok).toBe(false);vi.mocked(runTests).mockReset();queue({1:{...failed(),results:[{name:"behaviour",status:"error",message:"Null dereference",durationMs:0}]}});expect((await validateChallenge(fixture,"mid")).ok).toBe(true);});
it("reports timeouts even when aggregate counters appear green",async()=>{queue({2:{...passing(),timedOut:true,results:[{name:"slow",status:"error",message:"Test timed out",durationMs:1500}]}});expect((await validateChallenge(fixture,"mid")).failures).toContain("R5 failed: test 'slow' timed out");});
it("rejects empty suites and never runs code after a static failure",async()=>{queue({0:{...passing(),total:0,passed:0,results:[]}});expect((await validateChallenge(fixture,"mid")).ok).toBe(false);vi.mocked(runTests).mockReset();expect((await validateChallenge({},"mid")).ok).toBe(false);expect(runTests).not.toHaveBeenCalled();});
