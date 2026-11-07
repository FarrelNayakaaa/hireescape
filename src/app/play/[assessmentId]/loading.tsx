import { AssessmentState } from "@/features/escape-room";

export default function PlayLoading() {
  return <main id="main-content" className="min-h-screen bg-he-bg p-8"><AssessmentState state="loading" /></main>;
}
