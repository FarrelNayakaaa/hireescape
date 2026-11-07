# src/app — AGENTS.md (child: routes, pages, API wiring)

> **Owner: Dev A (Manager & Platform)** — except `src/app/play/**`, `/api/inquisitor` and `/api/assistant`, which are **Dev B**'s. · Consumes: every feature through its `index.ts`.

> Inherits everything from the root `AGENTS.md`. Pages are **composition only**; logic lives in
> `src/features/*`. API routes are **thin** and **stateless**.

## Routes

| Route | Audience | Purpose | Main feature component |
|---|---|---|---|
| `/` | everyone | Landing: hero, "How it works" (3 rooms + 4 Codex roles), two CTAs: "I'm hiring" / "Try a demo room" | `components/ui` only |
| `/manager` | manager | List of assessments + sessions + reports (from localStorage). "New assessment", "Quick demo assessment", "Export/Import JSON" | `features/assessment` |
| `/manager/new` | manager | Create assessment: alias, level, defect type, **AI Assistance toggle**, proctoring, duration. Runs Saboteur + validation with a gamified progress view | `features/assessment` (+ `features/saboteur`) |
| `/play/[assessmentId]` | candidate | Full escape-room flow (Room 0 Security Check if proctoring ≠ off → rules → rooms → escape/timeout screen) | `features/escape-room`, `features/proctoring` |
| `/report/[sessionId]` | manager | One-page evidence report + replay + human decision panel | `features/report` |
| `/report/demo` | judges | Pre-built fictional report (works with zero API calls) | `features/report` |

**Ownership:** `/`, `/manager/**`, `/report/**` → Dev A · `/play/**` → Dev B.

All routes must render something useful when localStorage is empty (empty state with a clear CTA,
or "Load demo data" when `NEXT_PUBLIC_DEMO_MODE=1`).

## API Routes

| Route | Owner | Method | Codex role | Auth | Server timeout | Retries |
|---|---|---|---|---|---|---|
| `/api/assessment/token` | A | POST | — | none (demo) | 2s | — |
| `/api/saboteur` | A | POST | Saboteur | none (manager) | 50s | 0 (client loop regenerates, max 3) |
| `/api/inquisitor` | B | POST | Inquisitor | assessment token | 12s | 1 |
| `/api/assistant` | B | POST | Assistant | assessment token **and** `aiAssistance === true` in the token **and** `room === 2` | 20s | 1 |
| `/api/analyst` | A | POST | Analyst | none (manager) | 50s | 0 ("Regenerate" button) |
| `/api/health/codex` | A | GET | tiny live call | none | 10s | 0 |

Every agent route returns `{ ...data, meta: AgentMeta }` (see `src/lib/codex/AGENTS.md`). Proctoring has
**no API route on purpose**: all media processing stays in the browser.

Each route: `runtime = "nodejs"`, `maxDuration = 60`. A request must always finish inside 60 s, which is why the long agents
(Saboteur, Analyst) have **no server-side retry**: the client regenerates instead.

## Assessment token (`src/lib/assessment-token.ts`)

Purpose: enforce the manager's AI toggle **on the server**, so turning the panel back on in devtools
does nothing.

```ts
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

type TokenPayload = { assessmentId: string; aiAssistance: boolean; exp: number }; // exp = epoch seconds

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

export function signToken(p: TokenPayload): string {
  const body = b64url(JSON.stringify(p));
  const sig = createHmac("sha256", process.env.ASSESSMENT_SECRET!).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", process.env.ASSESSMENT_SECRET!).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
  return p.exp > Date.now() / 1000 ? p : null;
}
```

- Token lifetime: `durationMin + 30` minutes.
- `/api/assistant` returns **403 `ai_disabled`** when `aiAssistance` is false. The UI never shows a
  raw 403; the panel is already locked, so this only triggers on tampering.
- The token is stored in `AssessmentConfig.token` and sent as header `x-assessment-token`.

## Manager setup flow (`/manager/new`)

Implemented by `features/assessment` (see its AGENTS.md for the field table and the public API Dev B relies on).

1. Form: candidate alias (prefilled fictional names list), level, defect type (or "Surprise me"),
   AI Assistance ON/OFF with one-line explanation of each, **Proctoring** (Off / Browser only /
   Camera + mic, plus "required" and "snapshots" switches; default Browser only, snapshots off),
   candidate language (EN/ID), duration (default 45).
   Hint under proctoring: "Camera + mic is most useful when AI Assistance is OFF." 
2. Submit → `/api/assessment/token` → Saboteur generation + validation (client-orchestrated, see
   `features/saboteur/AGENTS.md`) → save `AssessmentConfig`, `Challenge`, `ChallengeSecret`.
3. Success screen: "Challenge validated ✓ (hidden tests fail on broken code, pass on reference fix)",
   copyable candidate link `/play/<id>`, and "Open as candidate (demo)" button.

The validation checklist must be **visible** on this screen — it is a key demo moment for Build
Quality and Use of Codex.

## Headers (`next.config.ts`)

```ts
async headers() {
  return [{ source: "/:path*", headers: [
    { key: "Permissions-Policy", value: "camera=(self), microphone=(self), fullscreen=(self)" },
  ]}];
}
```

Camera/mic require HTTPS — works on Vercel and `localhost`, **not** on a LAN IP over http. Demo from the
deployed URL or localhost only.

## Layouts

- `src/app/layout.tsx`: load the bundled fonts with `next/font/local` from
  `src/components/ui/fonts/` (paths relative to the layout: `../components/ui/fonts/…`), dark
  background, `<NeonArcs />` decoration, skip-to-content link. Typography follows
  `src/components/ui/ui.md` §1.1–2, using the local assets below instead of `next/font/google`.

  | Font role | Default theme | Retro theme | Local assets |
  |---|---|---|---|
  | Interface: headings, body, navigation, buttons, labels | Open Sans | Blockblueprint | `OpenSans.ttf`, `OpenSans-Italic.ttf`; `BlockBlueprint.ttf` |
  | Code, timer, metrics, IDs, keyboard hint chips | JetBrains Mono | JetBrains Mono | `JetBrainsMono.ttf`, `JetBrainsMono-Italic.ttf` |

  Connect the generated font variables to `--he-font-ui` and `--he-font-mono`; override only the
  interface font under `[data-theme="retro"]`. Use the supplied italic assets for Open Sans and
  JetBrains Mono. Follow the weights and type scale in `ui.md` §2; do not synthesize bold or apply
  negative letter-spacing to Blockblueprint. Verify its English, Bahasa Indonesia, numeral, and
  punctuation coverage; use SVG icons for unsupported symbols. Fonts must work without a runtime CDN
  or a build-time Google Fonts download.
- Candidate route uses a full-height layout with no marketing header (focus mode).
- `metadata`: title "HireEscape — evidence-backed technical screening", no tracking scripts.

## Rules

- No data fetching in pages beyond reading params. Feature components load from stores.
- `loading.tsx` and `error.tsx` for `/play/[assessmentId]` and `/report/[sessionId]`.
- Unknown `assessmentId` / `sessionId` → friendly not-found with link back to `/manager`.
- No auth, no cookies, no analytics during the hackathon.

## Definition of Done (routes)

- [ ] All routes reachable via UI (no hidden URLs needed in the demo except `/report/demo`).
- [ ] Every API route rejects invalid input with 400 and logs no candidate code in production.
- [ ] Token tampering test: flip `aiAssistance` in the token body → `/api/assistant` returns 403.
