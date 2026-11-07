"use client";
import Link from "next/link";
import { AccentCard, Button } from "@/components/ui";
export default function ReportError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main id="main-content" className="he-page-width py-16"><AccentCard><h1>Report unavailable</h1><p className="he-muted my-5">Your saved session remains in this browser. Retry or return to the manager workspace.</p><div className="flex gap-4"><Button variant="secondary" onClick={reset}>Retry report</Button><Link href="/manager" className="he-chip">Back to manager</Link></div></AccentCard></main>;}
