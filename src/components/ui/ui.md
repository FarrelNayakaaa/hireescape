# src/components/ui — AGENTS.md (child: design system, generic primitives, manager & report screens)

> **Owner: Dev A (Manager & Platform)** · Consumed by everyone · Candidate-journey gamification lives in
> `src/components/game/AGENTS.md` (Dev B). Tokens and generic primitives ship by **10:30** (`ARCHITECTURE.md` H4).

> Inherits the root `AGENTS.md`. This file defines **how HireEscape looks, moves, and feels**.
> Default theme: inspired by the Regional Codex Hackathon (Sea x OpenAI) deck — near-black canvas,
> glowing neon arcs, cards with coloured top bars, pill-outlined titles, outlined number badges.
> Retro theme: a clean pixel game interface with Blockblueprint typography, crisp borders, and stepped details.
> We borrow the **style**, never the **logos**.
>
> Quality bar: a judge should want to screenshot it. If a screen looks like a default Tailwind template,
> it isn't done.

---

## 1. Design Tokens (`globals.css` + `tailwind.config.ts`)

```css
:root {
  /* surfaces */
  --he-bg:         #050508;   /* page */
  --he-surface:    #11111A;   /* cards */
  --he-surface-2:  #181826;   /* raised: editor chrome, modals */
  --he-surface-3:  #20202F;   /* hover */
  --he-border:     #2A2A3C;
  --he-text:       #F5F5F7;
  --he-muted:      #A3A3B8;

  /* neon accents (from the deck's arcs and card bars) */
  --he-orange:     #F26B3A;   /* Room 2 · The Bug · primary CTA */
  --he-blue:       #4FB8F2;   /* Room 1 · Triage · focus ring · Inquisitor */
  --he-green:      #5ED88F;   /* Room 3 · The Defence · tests passing */
  --he-purple:     #8B5CF6;   /* Codex agents · AI Assistant */
  --he-yellow:     #F5B941;   /* timer · warnings · "AI-predicted" */
  --he-red:        #F2545B;   /* failing tests · errors (always with icon + text) */

  /* glow */
  --he-glow-orange: 0 0 24px rgba(242,107,58,.35);
  --he-glow-blue:   0 0 24px rgba(79,184,242,.35);
  --he-glow-green:  0 0 24px rgba(94,216,143,.35);
  --he-glow-purple: 0 0 24px rgba(139,92,246,.40);

  --he-radius: 12px;
}
```

Semantic names (use these in components, never raw hex):

| Semantic | Token | Used for |
|---|---|---|
| `room1` | blue | Triage door, Room 1 accents, Inquisitor |
| `room2` | orange | Bug door, primary buttons |
| `room3` | green | Defence door, all-green test state |
| `agent` | purple | Codex agents, Assistant panel, AI-origin lines in replay |
| `time` | yellow | Timer, warnings, AI-predicted label |
| `danger` | red | failing tests, errors |
| `integrity` | muted grey + white | proctoring HUD and report section (deliberately neutral, never red) |

### 1.1 Platform themes

Provide exactly two themes: **Default** (`default`) and **Retro** (`retro`). Both use dark surfaces and
the semantic accent colours above; these are visual styles, not light/dark modes. Default retains the
existing neon identity. Retro uses a full pixel game interface while keeping content easy to read.

- Mount one keyboard-accessible **Default / Retro** selector in the shared platform shell, available on
  every page, including the small-screen blocker (§6.5). Give it the accessible name "Theme" and expose
  the selected option to assistive technology.
- Start with Default when no valid preference exists. Store the selected value in `localStorage` under
  `he-theme`; accept only `default` or `retro`. If storage is unavailable, keep switching functional for
  the current visit. Apply a saved choice before showing page content to avoid a theme flash.
- Set `data-theme="default"` or `data-theme="retro"` on the root `<html>` element. Apply the theme to
  all routes, shared primitives, candidate screens, dialogs, and toasts. Switching themes must not
  reload the page, reset forms, or change an assessment's state or timer.
- Use shared CSS tokens and theme selectors; do not fork feature markup or add theme props to the
  frozen primitive signatures in §3.1. The token block above defines Default colours and glows.

| Property | Default | Retro |
|---|---|---|
| Interface font | Open Sans | Blockblueprint |
| Code, timer, metrics, IDs | JetBrains Mono | JetBrains Mono |
| Panel/control outlines | Existing primitive specs (§3) | Crisp 2px solid borders; retain 4px card top bars |
| Corners | Existing rounded shapes; `--he-radius: 12px` | Square corners; `--he-radius: 0`; stepped decorative details |
| Glows | Existing `--he-glow-*` tokens | Set every `--he-glow-*` token to `none`; no blurred shadows |
| Arc decoration | Smooth neon arcs | Static, crisp stair-step corner lines in the same accent colours |

Define `--he-font-ui` and `--he-font-mono` for these font roles; override `--he-font-ui` under
`[data-theme="retro"]`. Route all other theme-dependent borders, radii, and effects through shared
tokens or primitive-level theme selectors so hardcoded pill/button radii cannot leak into Retro.

Retro applies pixel typography and geometry throughout the interface. Keep spacing generous, align
details to whole CSS pixels, and leave content unobstructed. Do not add CRT distortion, scanline
overlays, flashing effects, or decorative animation. Preserve the sober manager, landing, and report
rules in §5: a retro appearance does not add points, sounds, confetti, or other game mechanics.

## 2. Typography

- Default headings: **Open Sans** 700/800, letter-spacing −0.02em on display sizes. Default body,
  navigation, buttons, and labels: Open Sans 400/600.
- Retro headings, body, navigation, buttons, and labels: **Blockblueprint**. Use its supplied weights;
  do not synthesize bold or apply negative letter-spacing to its pixel glyphs.
- Both themes: code, timer, metrics, IDs (INC-2417, e14, L24), and keyboard hint chips use
  **JetBrains Mono** 500, including inside Retro controls.
- Default scale (font size/line height, CSS px): display 56/60 · h1 36/44 · h2 24/32 · h3 18/26 ·
  body 15/24 · small 13/20 · mono-metric 28/32. Retro keeps the heading/metric scale but uses at least
  body 16/26 and small 14/22. Increase size or spacing if needed for readable Blockblueprint glyphs;
  allow wrapping instead of clipping labels or shrinking text to fit.
- Load Open Sans and JetBrains Mono with `next/font/google` in the root layout (self-hosted at build
  time = no runtime CDN). Load self-hosted **Blockblueprint** font files with `next/font/local` and
  connect the generated font variables to the shared font tokens in §1.1.
- **Implementation prerequisite:** obtain the Blockblueprint font assets and include them in the
  project before implementing Retro typography. Do not assume Google Fonts hosts this font or silently
  substitute another pixel font. Verify glyph coverage for English, Bahasa Indonesia, numerals, and
  UI punctuation; use SVG icons for symbols the font does not contain.

## 3. Signature motifs → generic primitives (Dev A, ships by 10:30)

The table below describes Default styling. Retro must retain the same components, content, and
behaviour, with these overrides: 2px outlines, square corners on titles/cards/buttons/chips/badges,
Blockblueprint interface text, and no glow, blur, or decorative motion. Keep the technical font roles
from §2. `NeonArcs` renders static stair-step corner lines in Retro using its existing props and
placement limits; `GridBackdrop` uses a faint static pixel grid without blur or a radial mask.
Hover and focus use crisp border or colour changes in Retro. All decorative SVGs remain `aria-hidden`.

| Primitive | Spec |
|---|---|
| `<PillTitle>` | Title inside rounded-full 2px white outline, px-10 py-3, display or h1 size. One per page max. |
| `<AccentCard accent>` | `--he-surface`, 1px border, **4px top bar** in accent, radius 12, p-6. Hover: border → accent at 40%, translateY(−2px). |
| `<NumberBadge n accent>` | 36×36 outlined square, mono "01", accent border + text. |
| `<NeonArcs position>` | SVG of 5 concentric arcs (orange, blue, green, blue, orange), 1.5px strokes, blur glow filter, `aria-hidden`. Corners only, max 2 per page, behind content (`-z-10`). Slow opacity breathe (6s), off with reduced motion. |
| `<GridBackdrop>` | Faint 32px grid lines at 3% white, radial-masked to the center. Landing + Room 0 only. |
| `<Button variant>` | `primary` orange fill + dark text + glow on hover · `secondary` outlined · `ghost` · `danger`. Min height 40, radius 10, mono keyboard hint chip (⌘↵) optional. |
| `<AgentAvatar agent size>` | Codex agent character (see §4). |
| `<AgentChip agent status>` | Avatar + name + status ("thinking…", "done 2.1s", "LIVE"/"MOCK"). |
| `<EvidenceChip>` | Mono chip "L24" / "e19 · ai_apply", hover glow, click → replay jump. |
| `<AiModeBadge on>` | Pill "AI Assistance: ON" (purple) / "OFF" (outlined grey). |
| `<BasisLabel>` | Yellow outline "AI-predicted, not executed". |
| `<StepList steps>` | Vertical checklist with animated ticks (Saboteur progress, Security Check). |
| `<Toast tone>` | Bottom-right, max 2 visible, auto-dismiss 5s, `aria-live="polite"`. |

Candidate-journey primitives (`RoomDoor`, `KeyCounter`, `Timer`, `SignalMap`, `IntegrityShield`, room intro cards, test locks) live in
`src/components/game/` and belong to Dev B. Do not build them here.


### 3.1 Primitive props (FROZEN at 10:30 — Dev B codes against these exact signatures)

```ts
// src/components/ui/index.ts re-exports everything below
export type Accent = "room1" | "room2" | "room3" | "agent" | "time" | "danger" | "neutral";   // blue, orange, green, purple, yellow, red, grey

Button        { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md"; kbd?: string; loading?: boolean } & ButtonHTMLAttributes
AccentCard    { accent?: Accent; as?: ElementType; padded?: boolean; className?: string; children }       // 4px top bar in the accent colour
PillTitle     { as?: "h1" | "h2"; className?: string; children }
NumberBadge   { n: number; accent?: Accent }                                                              // renders "01", "02", …
NeonArcs      { position: "top-right" | "top-left" | "bottom-right" | "bottom-left"; className?: string }  // aria-hidden, decorative
GridBackdrop  { className?: string }
Toast         useToast(): { push(t: { tone?: "info" | "success" | "warning" | "error"; title: string; description?: string; durationMs?: number }): void }
              <ToastViewport />   // mounted once in the root layout
StepList      { steps: { id: string; label: string; status: "pending" | "active" | "done" | "error"; detail?: string }[] }
AgentAvatar   { agent: CodexRole; size?: "sm" | "md" | "lg"; state?: "idle" | "thinking" | "done" | "error" }
AgentChip     { agent: CodexRole; status?: string; mock?: boolean; latencyMs?: number }
AiModeBadge   { on: boolean }
BasisLabel    { basis: "executed" | "ai_predicted" }
EvidenceChip  { kind: "code_line" | "event"; label: string; onClick?: () => void }
```

Everything is a named export, client-safe, and uses only tokens from `globals.css`. Adding optional props later is fine; changing or removing one needs a request.

## 4. The Codex agents as characters

Each agent is a **character** with a consistent avatar, so users (and judges) instantly see which Codex
agent is acting. Default avatars are simple geometric SVGs (circle badge + lucide icon), purple family, each with
a secondary hue ring:

| Agent | Icon (lucide) | Ring hue | Personality line (landing page) | Where it appears |
|---|---|---|---|---|
| **Saboteur** | `Bomb` | orange | "Plants one realistic bug — then proves it with tests." | Manager setup, Agent Console |
| **Inquisitor** | `Flashlight` | blue | "Asks about *your* code. Never gives answers." | Candidate Inquisitor tab, Room 3 |
| **Assistant** | `Sparkles` | purple | "Helps when your manager allows it." | Candidate Assistant tab |
| **Analyst** | `ScanSearch` | green | "Every claim cites evidence — or it's deleted." | Report, Agent Console |

Default states: `idle` (static) · `thinking` (ring rotates, 1.2s loop) · `done` (ring flashes once) · `error`
(ring turns grey, retry affordance). Respect reduced motion (thinking = dots "…" only).
Retro uses square badges with stepped accent outlines and the same agent icons and hues. Its states
are static: `idle` (badge), `thinking` ("thinking…" text), `done` (check icon + text), and `error`
(grey outline + retry affordance). No rotation or flashing in Retro.

## 5. Gamification boundary

- The **candidate journey** (doors, keys, timer, signal map, room intros) is specified in `src/components/game/AGENTS.md` (Dev B).
- **Manager side gamification** is limited to one moment: the **Saboteur theatre** on `/manager/new`. The Saboteur
  avatar "works" through the `StepList`; attempts are shown honestly ("Attempt 2/3 · fixing: a hidden test failed on
  the reference fix").
- Manager, landing and report pages stay sober: no points, XP, streaks, leaderboards, percentiles, confetti, sound
  or "better than X %". Never rely on colour alone: always icon + text.
- Never use anxiety design on any page: no flashing timers, no "you are being watched" language.


## 6. Screen-by-screen specs (manager, landing, report)

Every screen uses the active theme (§1.1) and the shared minimum-width gate (§6.5).
At supported widths, including 768px, stack panels or reflow content so controls remain accessible;
do not require a desktop-width two-column layout or horizontal page scrolling.

### 6.1 Landing `/`
- Hero: `GridBackdrop` + two `NeonArcs`; `PillTitle` "HireEscape"; subtitle "Hire engineers for the job
  they'll actually do."; CTAs: primary "I'm hiring" → `/manager/new`, secondary "Try the demo room".
- Section "Three rooms": three `AccentCard`s (blue/orange/green) with `NumberBadge` 01–03.
- Section "Meet the agents": four `AgentAvatar`s with personality lines.
- Section "Evidence, not verdicts": a mock claim with `EvidenceChip`s and a struck-through dropped claim.
- Footer: "Built at Regional Codex Hackathon Indonesia" (text only).

### 6.2 Manager setup `/manager/new`
(Field list and flow: `src/features/assessment/AGENTS.md`. This section is only the visual layout.)
- Left: form in an `AccentCard` (orange): alias (fictional presets), level (segmented control), defect type
  (cards with icons + "Surprise me"), **AI Assistance** toggle with explanation, **Proctoring** mode
  (Off / Browser only / Camera + mic) with "required" and "snapshots" switches and a privacy note, duration.
- Right: Saboteur panel — `AgentAvatar saboteur` + `StepList` + `ValidationChecklist` (R1–R5, S1–S5) +
  collapsible Agent Console.
- Success: big "Challenge sealed ✓", candidate link with copy button, "Open as candidate".

### 6.3 Candidate screens

Security Check (Room 0), Rules, the Rooms layout, and the Escaped/Timeout screens are specified in
`src/components/game/AGENTS.md §4` (Dev B). They use the tokens and primitives defined here.


### 6.4 Report `/report/[sessionId]` — **sober**, no gamification
- Order: header → 01 Objective (executed) → 02 Competency map → 03 Evidence-backed observations →
  04 Replay → 05 Integrity signals (if any) → 06 Your decision.
- Uses `AccentCard` + `NumberBadge` for section headers for visual consistency, but no glow, no animation
  beyond 150ms fades, in either theme. Print CSS: white background, black text, accent bars kept.

### 6.5 Minimum viewport width — all application routes

- Require a browser viewport width of **at least 768 CSS pixels**. Widths `<768px` are blocked;
  widths `>=768px` are allowed. Use the same `(min-width: 768px)` media query for layout and access
  checks. Do not infer eligibility from user agent, device name, physical screen resolution, or
  device pixel ratio. There is no minimum height requirement.
- Place the gate in the shared application shell so it covers landing, manager, candidate, and report
  routes, including direct links and navigation. This is a UI requirement; it does not change API routes.
  Do not show a usable application frame before the initial width check completes.
- Below the threshold, show only the theme selector and a blocking screen with this English copy:
  - Heading: **"A larger screen is required."**
  - Explanation: "HireEscape requires a browser width of at least 768 pixels. Enlarge your browser
    window, rotate your tablet to landscape, or switch to a larger screen to use the full platform."
- Provide no close button, dismissal, or "continue anyway" path. The blocked application must not
  accept pointer or keyboard input or remain exposed to assistive technology; a visual overlay alone
  is insufficient. Do not begin an assessment while the initial viewport is unsupported.
- Keep the blocking screen readable at narrow widths, with wrapping text, a semantic heading, and
  the active theme's typography, contrast, and focus styling. Store its candidate-facing copy in the
  locale files described in §9.
- Recheck when the viewport changes, including browser resizing and device rotation. If an active
  session becomes too narrow, preserve its mounted session state and entered work while blocking
  interaction. Do not pause, restart, extend, or otherwise change existing timer rules. Restore the
  application automatically when the viewport reaches 768px; do not require a reload.
- When blocking begins, move focus to the blocking heading. When access returns, restore focus to
  the previous application element if it still exists, otherwise to the page heading. Keep the theme
  selector keyboard accessible while blocked.

## 7. Motion

- Default: `framer-motion`, 150–600ms, ease-out. Only animate transform + opacity.
- Default infinite animations are limited to arc breathing (opacity, 6s) and the agent "thinking" ring.
- Retro: no decorative or infinite animation, including hover movement, arc breathing, tick animation,
  or avatar rotation/flashing. Functional state changes may use opacity fades up to 150ms.
- Both themes: `useReducedMotion()` → replace motion with opacity fades up to 150ms; disable arc
  breathing and avatar rotation. Theme switching must not animate or flash the full page.
- The report's stricter limit (§6.4) applies in both themes.

## 8. Accessibility

- Text contrast ≥ 4.5:1 (don't lighten `--he-muted`).
- Focus ring: 2px `--he-blue`, 2px offset, on every interactive element.
- Meaningful icons have `aria-label`; decorative SVGs `aria-hidden`.
- Timer announces at 10:00 and 02:00 via `aria-live="polite"`, never every second.
- All flows keyboard-only possible (gutter marking: `M` toggles the current line).
- Apply these requirements to both themes, the theme selector, and the minimum-width blocking screen.
  Check Blockblueprint glyph readability at its actual rendered sizes, not just its nominal font size.

## 9. Copy tone

- Candidate: warm, direct, second person. "Take your time reading. Nothing here is a trick."
- Manager: precise, evidence-first. "7 claims shown · 1 unverifiable claim removed."
- AI rule (rules screen):
  - ON: "You may use the built-in assistant. We look at how you use it, not whether you use it."
  - OFF: "The built-in assistant is off for this assessment. Please work without AI tools."
- Locale: all candidate-facing strings in `src/lib/i18n/{en,id}.ts`. Bahasa Indonesia is a nice touch for local judges.

## 10. UI QA checklist (run at 13:30 and 15:00)

- [ ] Every application screen has at least one theme-appropriate signature motif (top-bar card,
  outlined title, number badge, or corner decoration). The small-screen blocker prioritises readability.
- [ ] No default browser/Tailwind look left (unstyled inputs, blue links, white modals).
- [ ] Loading, empty, error states styled on every async surface (agents, runner, report).
- [ ] Agent avatars appear wherever an agent acts; Agent Console shows LIVE/MOCK correctly.
- [ ] Both themes look intentional at 768px, 1280×800, and 1920×1080; supported layouts reflow without
  horizontal page scrolling, clipped controls, or unreadable text.
- [ ] Default is used without a valid saved preference; switching updates every route, dialog, and
  toast without resetting work; a reload restores the choice. Switching still works without storage.
- [ ] Blockblueprint loads from local assets; inspect English, Bahasa Indonesia, numerals, and UI
  punctuation. Interface text uses Blockblueprint in Retro; technical text retains JetBrains Mono.
- [ ] Retro has crisp borders and square/stepped geometry; no blurred glow, smooth neon arcs, CRT
  effects, scanline overlays, flashing effects, or decorative animation remains.
- [ ] At 767px only the blocker and theme selector are accessible; at 768px and 769px the platform
  is accessible. Check direct links to landing, manager, candidate, and report routes.
- [ ] Resizing/rotating across 768px blocks/restores access automatically, preserves active session
  state and entered work, and follows existing timer rules without a reload.
- [ ] Keyboard access, blocker focus transitions, text contrast, and reduced motion checked in both
  themes. Blocked content cannot receive input or be reached by assistive technology.

## Don'ts

- No Sea/OpenAI logos or wordmarks in the product UI.
- No stock photos, no real faces in static assets (the live camera preview in Room 0 is the only exception, and it is never stored unless snapshots are enabled).
- Do not restyle primitives inline inside features — add a variant here instead.
