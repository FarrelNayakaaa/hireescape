"use client";
import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { z } from "zod";
import type { Report } from "@/lib/contracts";
import { ReportSchema } from "./schema";
export const reportCacheKey=(sessionId:string,promptVersion:string)=>JSON.stringify([sessionId,promptVersion]);
let persistenceWarning:string|null=null;
const storage:StateStorage={
 getItem(key){try{return typeof window==="undefined"?null:localStorage.getItem(key);}catch{persistenceWarning="Reports are available in this tab; browser storage is unavailable.";return null;}},
 setItem(key,value){try{if(typeof window!=="undefined")localStorage.setItem(key,value);}catch{persistenceWarning="Report could not be persisted. Keep this tab open and export it.";}},
 removeItem(key){try{if(typeof window!=="undefined")localStorage.removeItem(key);}catch{persistenceWarning="Browser storage is unavailable.";}},
};
const persistedSchema=z.object({reports:z.record(z.string(),ReportSchema),cache:z.record(z.string(),ReportSchema).optional()});
interface ReportState {reports:Record<string,Report>;cache:Record<string,Report>;save:(report:Report)=>void}
export const useReportStore=create<ReportState>()(persist(set=>({reports:{},cache:{},save(report){const safe=ReportSchema.parse(report);set(state=>({reports:{...state.reports,[safe.sessionId]:safe},cache:{...state.cache,[reportCacheKey(safe.sessionId,safe.promptVersion)]:safe}}));}}),{
 name:"he:reports",skipHydration:true,storage:createJSONStorage(()=>storage),partialize:state=>({reports:state.reports,cache:state.cache}),
 merge:(saved,current)=>{const parsed=persistedSchema.safeParse(saved);return parsed.success?{...current,...parsed.data,cache:parsed.data.cache??{}}:current;},
}));
let hydration:Promise<void>|undefined;
export function hydrateReports():Promise<void>{
 if(useReportStore.persist.hasHydrated())return Promise.resolve();
 hydration??=Promise.resolve(useReportStore.persist.rehydrate()).finally(()=>{hydration=undefined;});return hydration;
}
const subscribe=(notify:()=>void)=>{const a=useReportStore.persist.onHydrate(notify),b=useReportStore.persist.onFinishHydration(notify);return()=>{a();b();};};
export function useReportHydration(){const ready=useSyncExternalStore(subscribe,useReportStore.persist.hasHydrated,()=>false);useEffect(()=>{void hydrateReports();},[]);return ready;}
export function getReportPersistenceWarning(){return persistenceWarning;}
