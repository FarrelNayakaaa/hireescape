import { afterEach, expect, it, vi } from "vitest";
import fixture from "@/lib/codex/fixtures/saboteur.json";
import { checkInWorker } from "../lib/checkInWorker";
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it("terminates a stalled static-check worker after five seconds",async()=>{vi.useFakeTimers();const terminate=vi.fn();vi.stubGlobal("Worker",class {terminate=terminate;postMessage(){};});const result=checkInWorker(fixture,"mid");await vi.advanceTimersByTimeAsync(5000);expect(await result).toEqual([{id:"S4",pass:false,message:"S4 failed: module loading timed out"}]);expect(terminate).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);});
it("reports worker creation failure without running untrusted code on the page",async()=>{vi.stubGlobal("Worker",class {constructor(){throw new Error("worker blocked");}});expect(await checkInWorker(fixture,"mid")).toEqual([{id:"S4",pass:false,message:"S4 failed: validation worker could not start"}]);});
