"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSessionStore } from "@/features/session";
const subscribe=(notify:()=>void)=>{const persistence=useSessionStore.persist;if(!persistence)return()=>{};const start=persistence.onHydrate(notify),finish=persistence.onFinishHydration(notify);return()=>{start();finish();};};
const snapshot=()=>useSessionStore.persist?.hasHydrated()??true;
export function useSessionHydration(){
 const ready=useSyncExternalStore(subscribe,snapshot,()=>false);
 const [error,setError]=useState(false),[empty,setEmpty]=useState(false);
 useEffect(()=>{let active=true;const persistence=useSessionStore.persist;
  if(persistence&&!persistence.hasHydrated())void(async()=>{
   try{
    await persistence.rehydrate();
    if(active&&!persistence.hasHydrated()){
     // H8's merge may reject missing storage; an absent record is a legitimate empty browser.
     const options=persistence.getOptions();
     const saved=options.name?await options.storage?.getItem(options.name):null;
     if(active){if(saved==null)setEmpty(true);else setError(true);}
    }
   }catch{if(active)setError(true);}
  })();return()=>{active=false;};
 },[]);
 return {ready:ready||empty,error};
}
