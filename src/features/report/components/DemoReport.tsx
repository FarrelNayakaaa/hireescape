"use client";
import { demoSession, demoStarterCode, demoIntegrity } from "../fixtures/demoSession";
import { demoReport } from "../fixtures/demoReport";
import { ReportDocument } from "./ReportDocument";
import { useDemoOffline } from "../hooks/useDemoOffline";
export function DemoReport(){const offline=useDemoOffline();return <><p role="status" data-print-hide className="he-page-width pt-8 he-small he-muted">{offline==="ready"?"Offline backup ready — this demo can be reopened without the network.":offline==="preparing"?"Preparing the offline demo backup…":"Offline backup could not be saved. Keep this page open for offline viewing."}</p><ReportDocument demo session={demoSession} candidateAlias="Candidate A — Rani (fictional)" challengeTitle="INC-2417: Product page 500s during cache flaps" starterCode={demoStarterCode} proctoring={{mode:"browser",required:false,captureSnapshots:false}} report={demoReport} objective={demoReport.objective} disclaimer={demoReport.disclaimer} promptVersion={demoReport.promptVersion} integrityPreview={demoIntegrity}/></>;}
