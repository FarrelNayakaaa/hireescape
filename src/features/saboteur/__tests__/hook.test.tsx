// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AgentMeta } from "@/lib/contracts";
import fixture from "@/lib/codex/fixtures/saboteur.json";
import { postAgent, ApiError } from "@/lib/api-client";
import { useGenerateChallenge } from "../hooks/useGenerateChallenge";
vi.mock("@/lib/api-client",async(importOriginal)=>({...await importOriginal<typeof import("@/lib/api-client")>(),postAgent:vi.fn()}));
const meta:AgentMeta={role:"saboteur",model:"mock",promptVersion:"saboteur@2",latencyMs:800,attempts:1,mock:true};
beforeEach(()=>{vi.mocked(postAgent<{output:unknown;meta:AgentMeta}>).mockReset();});afterEach(cleanup);
const params={level:"mid" as const,defectType:"cache_no_fallback" as const};
it("seals valid output, keeps fixes separate, and resets",async()=>{
 vi.mocked(postAgent<{output:unknown;meta:AgentMeta}>).mockResolvedValue({output:fixture,meta});const {result}=renderHook(()=>useGenerateChallenge());
 let sealed!:Awaited<ReturnType<typeof result.current.start>>;await act(async()=>{sealed=await result.current.start(params);});
 expect(result.current).toMatchObject({status:"done",attempt:1,usedFallback:false});expect(result.current.checks.every(c=>c.status==="pass")).toBe(true);expect(result.current.steps.every(s=>s.status==="done")).toBe(true);expect(sealed.challenge).not.toHaveProperty("referenceFix");expect(sealed.secret.referenceFix).toBe(fixture.referenceFix);expect(result.current.metas).toEqual([meta]);
 act(()=>result.current.reset());expect(result.current.status).toBe("idle");
});
it("retries failed validation with targeted feedback then succeeds",async()=>{
 vi.mocked(postAgent<{output:unknown;meta:AgentMeta}>).mockResolvedValueOnce({output:{...fixture,hiddenTests:fixture.visibleTests},meta}).mockResolvedValueOnce({output:fixture,meta});const {result}=renderHook(()=>useGenerateChallenge());await act(async()=>{await result.current.start(params);});
 expect(result.current).toMatchObject({status:"done",attempt:2,usedFallback:false});expect(vi.mocked(postAgent<{output:unknown;meta:AgentMeta}>).mock.calls[1][1]).toMatchObject({previousFailures:expect.arrayContaining(["R2 failed: no hidden test fails on starterCode (the bug is not caught)"])});
 expect(result.current.attempts.map(a=>a.status)).toEqual(["failed","passed"]);
});
it("revalidates a seeded fallback after three failures",async()=>{
 vi.mocked(postAgent<{output:unknown;meta:AgentMeta}>).mockResolvedValue({output:{...fixture,hiddenTests:fixture.visibleTests},meta});const {result}=renderHook(()=>useGenerateChallenge());await act(async()=>{await result.current.start(params);});
 expect(postAgent).toHaveBeenCalledTimes(3);expect(result.current).toMatchObject({status:"done",attempt:3,usedFallback:true});expect(result.current.fallbackReason).toContain("three attempts");expect(result.current.checks.every(c=>c.status==="pass")).toBe(true);expect(result.current.result?.challenge.source).toBe("seeded");
});
it("falls back after an API/configuration error and uses the seed's actual difficulty",async()=>{
 vi.mocked(postAgent<{output:unknown;meta:AgentMeta}>).mockRejectedValue(new ApiError(500,"config","sensitive details"));const {result}=renderHook(()=>useGenerateChallenge());await act(async()=>{await result.current.start({...params,level:"senior"});});
 expect(result.current).toMatchObject({status:"done",usedFallback:true,fallbackReason:"The model service is not configured."});expect(result.current.result?.challenge.level).toBe("mid");expect(JSON.stringify(result.current)).not.toContain("sensitive details");
});
it("coalesces duplicate starts and resolves surprise to a level-suited defect",async()=>{
 vi.mocked(postAgent<{output:unknown;meta:AgentMeta}>).mockResolvedValue({output:fixture,meta});const {result}=renderHook(()=>useGenerateChallenge());let a!:ReturnType<typeof result.current.start>;let b!:typeof a;
 await act(async()=>{a=result.current.start({level:"junior",defectType:"surprise"});b=result.current.start(params);await a;});expect(a).toBe(b);expect(postAgent).toHaveBeenCalledTimes(1);expect(vi.mocked(postAgent<{output:unknown;meta:AgentMeta}>).mock.calls[0][1]).toMatchObject({defectType:expect.stringMatching(/^(off_by_one|shared_mutation|unhandled_null)$/)});expect(result.current.result?.challenge).toMatchObject({level:"mid",defectType:"cache_no_fallback"});
});
it("aborts a stalled request with enough budget left to prove the fallback",async()=>{
 vi.useFakeTimers();vi.mocked(postAgent<{output:unknown;meta:AgentMeta}>).mockImplementation((_url,_body,opts)=>new Promise((_resolve,reject)=>opts?.signal?.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")),{once:true})));
 const {result}=renderHook(()=>useGenerateChallenge());let completed!:ReturnType<typeof result.current.start>;
 await act(async()=>{completed=result.current.start(params);await vi.advanceTimersByTimeAsync(120_000);vi.useRealTimers();await completed;});
 expect(result.current).toMatchObject({status:"done",attempt:1,usedFallback:true,fallbackReason:"Generation reached the time budget."});
});
