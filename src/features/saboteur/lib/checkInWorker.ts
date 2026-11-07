import type { Level } from "@/lib/contracts";
import { staticChecks, type CheckResult } from "./staticChecks";
let worker:Worker|null=null;
let queue:Promise<unknown>=Promise.resolve();
function execute(output:unknown,level:Level):Promise<CheckResult[]> {
  if(typeof Worker==="undefined")return Promise.resolve(staticChecks(output,level));
  return new Promise(resolve=>{
    let current:Worker;
    try{current=worker??=new Worker(new URL("./static.worker.ts",import.meta.url),{type:"module"});}
    catch{resolve([{id:"S4",pass:false,message:"S4 failed: validation worker could not start"}]);return;}
    const finish=(checks:CheckResult[],terminate=false)=>{
      clearTimeout(timer);current.onmessage=null;current.onerror=null;current.onmessageerror=null;
      if(terminate){current.terminate();worker=null;}
      resolve(checks);
    };
    const timer=setTimeout(()=>finish([{id:"S4",pass:false,message:"S4 failed: module loading timed out"}],true),5000);
    current.onmessage=(event:MessageEvent<CheckResult[]>)=>finish(event.data);
    current.onerror=(event)=>{event.preventDefault();finish([{id:"S4",pass:false,message:"S4 failed: validation worker stopped"}],true);};
    current.onmessageerror=()=>finish([{id:"S4",pass:false,message:"S4 failed: invalid worker response"}],true);
    try{current.postMessage({output,level});}catch{finish([{id:"S4",pass:false,message:"S4 failed: validation worker could not receive input"}],true);}
  });
}
export function checkInWorker(output:unknown,level:Level):Promise<CheckResult[]> {
  const result=queue.then(()=>execute(output,level));
  queue=result.catch(()=>undefined);
  return result;
}
