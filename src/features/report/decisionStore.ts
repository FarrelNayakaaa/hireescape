"use client";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { z } from "zod";
export const decisionChoices={advance:"Advance to next round",hold:"Hold",do_not_advance:"Do not advance"} as const;
const decisionSchema=z.object({sessionId:z.string().min(1),decision:z.enum(["advance","hold","do_not_advance"]),note:z.string().trim().min(20),savedAt:z.iso.datetime()});
export type Decision=z.infer<typeof decisionSchema>;
let storageFailed=false;
const storage:StateStorage={
 getItem(key){try{if(typeof window==="undefined")return null;const raw=localStorage.getItem(key);if(raw)JSON.parse(raw);return raw;}catch{storageFailed=true;return null;}},
 setItem(key,value){try{if(typeof window!=="undefined")localStorage.setItem(key,value);}catch{storageFailed=true;}},
 removeItem(key){try{if(typeof window!=="undefined")localStorage.removeItem(key);}catch{storageFailed=true;}},
};
interface DecisionState{decisions:Record<string,Decision>;save:(input:Omit<Decision,"savedAt">)=>boolean}
export const useDecisionStore=create<DecisionState>()(persist(set=>({decisions:{},save(input){const decision=decisionSchema.parse({...input,savedAt:new Date().toISOString()});storageFailed=false;set(state=>({decisions:{...state.decisions,[decision.sessionId]:decision}}));return !storageFailed;}}),{
 name:"he:decisions",skipHydration:true,storage:createJSONStorage(()=>storage),partialize:state=>({decisions:state.decisions}),
 merge:(saved,current)=>{const parsed=z.object({decisions:z.record(z.string(),decisionSchema)}).safeParse(saved);return parsed.success?{...current,...parsed.data}:current;},
}));
