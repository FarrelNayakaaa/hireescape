import { expect, it } from "vitest";
import type { Claim } from "@/lib/contracts";
import { orderClaims } from "../lib/claimOrder";
import { reviewedApplies } from "../lib/events";
import { fixtureSession } from "./fixtures";
it("interleaves concerns/strengths by dimension, with observations last",()=>{const claim=(id:string,dimension:Claim["dimension"],signal:Claim["signal"]):Claim=>({id,dimension,signal,statement:"Verified",evidence:[],basis:"executed"});const claims=[claim("o","debugging","observation"),claim("s1","debugging","strength"),claim("s2","debugging","strength"),claim("c","debugging","concern"),claim("ds","design","strength")];expect(orderClaims(claims).map(c=>c.id)).toEqual(["c","s1","s2","ds","o"]);expect(claims[0].id).toBe("o");});
it("counts reviewed applies rather than double-counting repeat diff views",()=>{const events=fixtureSession().events;const view=events.find(e=>e.type==="ai_diff_view")!;events.splice(events.indexOf(view),0,{...view,id:"e-extra"});expect(reviewedApplies(events)).toEqual({reviewed:1,total:1});});
