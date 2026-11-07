import { ReportPage } from "@/features/report";
export default async function SessionReportPage({params}:{params:Promise<{sessionId:string}>}){const {sessionId}=await params;return <ReportPage sessionId={sessionId}/>;}
