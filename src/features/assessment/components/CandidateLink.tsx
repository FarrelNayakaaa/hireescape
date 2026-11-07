"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, buttonStyles } from "@/components/ui";
export function CandidateLink({id}:{id:string}) {
 const [status,setStatus]=useState<"idle"|"loading"|"success"|"error">("idle");
 const path=`/play/${encodeURIComponent(id)}`;
 async function copy(){setStatus("loading");try{await navigator.clipboard.writeText(new URL(path,window.location.origin).href);setStatus("success");}catch{setStatus("error");}}
 return <div className="flex flex-wrap items-center gap-3"><Link className={buttonStyles("primary")} href={path}>Open as candidate</Link><Button variant="secondary" onClick={()=>void copy()} loading={status==="loading"}>Copy candidate link</Button><span role="status" className="he-small">{status==="success"?"Link copied":status==="error"?"Copy unavailable. Use the candidate link above.":""}</span></div>;
}
