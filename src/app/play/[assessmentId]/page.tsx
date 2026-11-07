import { EscapeRoomShell } from "@/features/escape-room";

export default async function PlayPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  return <EscapeRoomShell assessmentId={assessmentId} />;
}
