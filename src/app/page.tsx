import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Code2, FileCheck2, ShieldCheck, X } from "lucide-react";
import { AccentCard, AgentAvatar, BasisLabel, buttonStyles, EvidenceChip, GridBackdrop, NeonArcs, NumberBadge, PillTitle, type Accent } from "@/components/ui";
import type { CodexRole } from "@/lib/contracts";
import { ReadableText } from "@/components/ui/ReadableText";

const rooms: { n: number; accent: Accent; title: string; description: string; detail: string }[] = [
  { n: 1, accent: "room1", title: "Triage", description: "Find where it breaks.", detail: "Read the incident. Mark the fault. Build a hypothesis." },
  { n: 2, accent: "room2", title: "The Bug", description: "Make the hidden tests pass.", detail: "Work in the code. Run the tests. Show how you get to a fix." },
  { n: 3, accent: "room3", title: "The Defence", description: "Explain your fix.", detail: "Talk through the tradeoffs and the decisions behind your code." },
];
const agents: { agent: CodexRole; name: string; line: string }[] = [
  { agent: "saboteur", name: "Saboteur", line: "Plants one realistic bug — then proves it with tests." },
  { agent: "inquisitor", name: "Inquisitor", line: "Asks about your code. Never gives answers." },
  { agent: "assistant", name: "Assistant", line: "Helps when your manager allows it." },
  { agent: "analyst", name: "Analyst", line: "Every claim cites evidence — or it's deleted." },
];

export default function Home() {
  return <>
    <header className="he-site-header he-page-width">
      <Link href="/" className="he-brand" aria-label="HireEscape home"><span className="he-brand-mark"><Code2 size={18} aria-hidden="true" /></span>HireEscape</Link>
      <span className="he-site-kicker he-small he-muted">Code verifies. Humans decide.</span>
    </header>
    <main id="main-content">
      <section className="he-hero" aria-labelledby="he-hero-title">
        <GridBackdrop /><NeonArcs position="top-right" /><NeonArcs position="bottom-left" />
        <div className="he-page-width he-hero-content">
          <p className="he-eyebrow"><span className="he-status-dot" aria-hidden="true" />Evidence-backed technical screening</p>
          <PillTitle className="he-hero-title">HireEscape</PillTitle>
          <p id="he-hero-title" className="he-hero-subtitle">Hire engineers for the job they&apos;ll actually do.</p>
          <p className="he-hero-description he-muted">A broken codebase. Three rooms. A clear record of how someone thinks, builds, and explains.</p>
          <div className="he-hero-actions">
            <Link href="/manager/new" className={buttonStyles("primary")}>I&apos;m hiring <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link href="/manager" className={buttonStyles("secondary")}>Try the demo room <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <p className="he-hero-note he-small he-muted"><ShieldCheck size={15} aria-hidden="true" />Evidence for a human decision. No automatic verdicts.</p>
        </div>
      </section>

      <section className="he-page-width he-landing-section" aria-labelledby="he-rooms-title">
        <div className="he-section-heading"><p className="he-eyebrow he-muted">THE ASSESSMENT</p><h2 id="he-rooms-title">Three rooms</h2><p className="he-muted">A realistic incident, from first read to final explanation.</p></div>
        <div className="he-room-grid">{rooms.map((room) => <AccentCard key={room.n} accent={room.accent} as="article" className="he-room-card">
          <NumberBadge n={room.n} accent={room.accent} /><h3>{room.title}</h3><p className="he-room-description">{room.description}</p><p className="he-small he-muted">{room.detail}</p>
        </AccentCard>)}</div>
      </section>

      <section className="he-page-width he-landing-section" aria-labelledby="he-agents-title">
        <div className="he-section-heading"><p className="he-eyebrow he-muted">FOUR SEPARATE ROLES</p><h2 id="he-agents-title">Meet the agents</h2><p className="he-muted">Each has a job. Every output has something to prove.</p></div>
        <div className="he-agent-grid">{agents.map(({ agent, name, line }) => <article className="he-agent-card" key={agent}>
          <AgentAvatar agent={agent} size="lg" /><h3>{name}</h3><p className="he-small he-muted"><ReadableText>{line}</ReadableText></p>
        </article>)}</div>
      </section>

      <section className="he-page-width he-landing-section he-evidence-section" aria-labelledby="he-evidence-title">
        <div className="he-evidence-intro"><p className="he-eyebrow he-muted">THE REPORT</p><h2 id="he-evidence-title">Evidence, not verdicts</h2><p className="he-muted">Read what happened, inspect the evidence, and make your own decision.</p><p className="he-evidence-promise"><FileCheck2 size={19} aria-hidden="true" />If a claim cannot be verified, it does not make the report.</p></div>
        <AccentCard accent="room3" className="he-evidence-sample">
          <div className="he-sample-heading"><span className="he-small he-mono he-muted">SAMPLE REPORT · FICTIONAL SESSION</span><BasisLabel basis="executed" /></div>
          <div className="he-claim"><Check size={19} aria-hidden="true" /><div><p className="he-small he-verified-label">Verified observation</p><p>Added a database fallback when the cache read failed.</p><div className="he-evidence-chips"><EvidenceChip kind="code_line" label="L24" /><EvidenceChip kind="event" label="e19 · test_run" /></div></div></div>
          <div className="he-dropped-claim"><X size={17} aria-hidden="true" /><div><p className="he-small"><s>Handles every cache outage in production.</s></p><p className="he-small he-muted">Removed: no supporting evidence.</p></div></div>
        </AccentCard>
      </section>
    </main>
    <footer className="he-site-footer he-page-width"><span>HireEscape</span><p className="he-small he-muted">Built at Regional Codex Hackathon Indonesia</p></footer>
  </>;
}
