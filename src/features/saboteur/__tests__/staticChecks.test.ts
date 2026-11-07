import { describe, expect, it } from "vitest";
import fixture from "@/lib/codex/fixtures/saboteur.json";
import { staticChecks } from "../lib/staticChecks";
const check=(value:unknown,id:string)=>staticChecks(value,"mid").find(c=>c.id===id);
describe("static checks",()=>{
 it("passes S1–S5 for the mechanically generated fixture",()=>{expect(staticChecks(fixture,"mid")).toEqual(["S1","S2","S3","S4","S5"].map(id=>({id,pass:true})));});
 it("rejects invalid output through S1",()=>{expect(check({...fixture,defectLines:[0]},"S1")?.pass).toBe(false);});
 it.each(["require","import","process","fetch","eval","Function(","setInterval","Date.now","Math.random","XMLHttpRequest","WebSocket","importScripts","window","document"])("rejects forbidden %s in either code field",token=>{for(const field of ["starterCode","referenceFix"]){expect(check({...fixture,[field]:`${fixture.starterCode}\n// ${token}`},"S2")).toMatchObject({pass:false,message:`S2 failed: forbidden token "${token}" in ${field}`});}});
 it("enforces both lower and upper level bounds",()=>{expect(check({...fixture,starterCode:"module.exports = {};"},"S3")?.message).toBe("S3 failed: starterCode has 1 lines; mid needs 40-100");expect(check({...fixture,starterCode:"\n".repeat(101)},"S3")?.pass).toBe(false);expect(check({...fixture,referenceFix:"\n".repeat(101)},"S3")?.pass).toBe(false);});
 it("reports module syntax and initialization errors",()=>{expect(check({...fixture,starterCode:fixture.starterCode+"\n!@"},"S4")?.message).toContain("S4 failed: starterCode does not load:");expect(check({...fixture,referenceFix:fixture.referenceFix+"\nthrow new Error('bad module')"},"S4")?.message).toContain("referenceFix does not load: bad module");});
 it("rejects oversized diffs and incorrect or reversed defect ranges",()=>{expect(check({...fixture,referenceFix:fixture.referenceFix.split("\n").map((l,i)=>l+` // ${i}`).join("\n")},"S5")?.message).toBe("S5 failed: diff too large");expect(check({...fixture,defectLines:[1,1]},"S5")?.message).toBe("S5 failed: no overlap with defectLines");expect(check({...fixture,defectLines:[20,1]},"S5")?.pass).toBe(false);});
});
