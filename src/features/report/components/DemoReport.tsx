"use client";
import { demoSession, demoStarterCode, demoIntegrity } from "../fixtures/demoSession";
import { demoReport } from "../fixtures/demoReport";
import { ReportDocument } from "./ReportDocument";
export function DemoReport(){return <ReportDocument demo session={demoSession} candidateAlias="Candidate A — Rani (fictional)" challengeTitle="INC-2417: Product page 500s during cache flaps" starterCode={demoStarterCode} proctoring={{mode:"browser",required:false,captureSnapshots:false}} report={demoReport} objective={demoReport.objective} disclaimer={demoReport.disclaimer} promptVersion={demoReport.promptVersion} integrityPreview={demoIntegrity}/>;}
