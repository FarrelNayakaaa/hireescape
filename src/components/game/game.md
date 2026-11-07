# src/components/game — AGENTS.md (candidate-journey gamification)

> **Owner: Dev B (Candidate Experience)** · Depends on: `components/ui` tokens and generic primitives (Dev A) ·
> Consumed by: `features/escape-room`, `features/proctoring`.
> Inherits the root `AGENTS.md`. Design tokens, typography, motion and accessibility rules live in
> `src/components/ui/AGENTS.md` — **read sections 1, 2, 7, 8 there first.** This file only adds what is specific to
> the candidate's journey.

Gamify the **journey**, never the **judgement**. Everything in this folder is used on `/play/[id]` only.
Manager and report pages are sober and never import from `components/game`.

## Files

```text
components/game/
  RoomDoor.tsx  KeyCounter.tsx  Timer.tsx  SignalMap.tsx  IntegrityShield.tsx
  RoomIntroCard.tsx        1.5 s intro per room (skippable)
  IncidentTicket.tsx       the brief rendered as an incident ticket card
  HiddenTestLocks.tsx      one lock per hidden test; unlocks as tests pass
  DoorOpenTransition.tsx   500 ms door-open + key-fly animation
  index.ts
  __tests__/Timer.test.tsx (formatting + thresholds)  __tests__/SignalMap.test.tsx (counts only, never a grade)
```

## 1. Primitives (from the design system, specific to the journey)

| Primitive | Spec |
|---|---|
| `<RoomDoor room state>` | 56×72 door tile. `locked`: grey + lock icon · `active`: accent border + glow + subtle pulse · `escaped`: accent fill 15% + key icon. Connected by a dotted line that fills with accent colour as you progress. |
| `<KeyCounter keys>` | 3 key slots; earned keys glow in the room colour. |
| `<Timer endsAt>` | Mono countdown inside a circular progress ring. Normal = white ring · ≤10:00 yellow · ≤02:00 yellow + one pulse per minute. |
| `<SignalMap>` | 4-axis radar (SVG, no chart lib): debugging, design, communication, AI supervision. Live mode = **signals captured** (dots that appear on each axis), never a grade. |
| `<IntegrityShield state>` | Shield icon + label, neutral colours (see proctoring AGENTS.md). |
| `<RoomIntroCard room>` | Big `NumberBadge`, room name, one-line goal, accent glow; auto-dismiss after 1.5 s, any key skips. |
| `<IncidentTicket brief>` | Card with mono ticket id (e.g. `INC-2417`), severity chip, the brief text, and a fake log line in a code block. |
| `<HiddenTestLocks results>` | One small lock per hidden test (names on hover). A passing test plays a 150 ms "click-unlock"; all passing = "Vault open" state. Show text too: `✓ 6/6 hidden tests pass`. |
| `<DoorOpenTransition>` | Two door halves slide apart (scaleX) in 500 ms and a key flies into `KeyCounter`. With reduced motion: a 150 ms fade. |

All primitives use the tokens and `AccentCard` / `NumberBadge` / `Button` from `components/ui`. If a generic
primitive you need is not there yet (it ships by 10:30, `ARCHITECTURE.md` H4), use Tailwind tokens directly and
swap later; do not edit `components/ui`.

## 2. Gamification rules

Gamify the **journey**, never the **judgement**.

✅ Do
- **Doors & keys**: rooms unlock with a 500ms door-open (scaleX on two halves) + a key flying into `KeyCounter`.
- **Room intro cards** (1.5s, skippable with any key): big `NumberBadge`, room name, one-line goal, accent glow.
  - "01 · Triage — Find where it breaks."
  - "02 · The Bug — Make the hidden tests pass."
  - "03 · The Defence — Explain your fix in your own words."
- **Mission framing**: the brief is an "incident ticket" card with mono ID, severity chip, and a fake log line.
- **Test runs as feedback**: each hidden test is a small lock icon; passing tests "unlock" with a click
  animation; all six → "Vault open" state on the Room 2 door.
- **Signal map fills** live as evidence is captured (dot pops on the axis + tiny "+1 debugging signal" toast, max one per 20s).
- **Escape screen**: "You escaped in 31:42" (mono, large), 3 glowing keys, one calm neon arc sweep, then
  "Your session has been sent to a human reviewer. Thank you." No score.
- **Security Check (Room 0)** framed as "Entering the vault" (see §4.1 below).

❌ Don't
- No points, XP, streaks, leaderboards, percentiles, "better than X%".
- No celebration anywhere outside `/play`.
- No sound by default (optional toggle, off).
- No red/green-only meaning: always icon + text ("✓ 6/6 hidden tests pass").
- No anxiety design: no flashing timer, no countdown sounds, no "you are being watched" language.

## 3. Mapping from session data to visuals (pure functions, unit-tested)

| Visual | Source | Rule |
|---|---|---|
| Doors / keys | flow state | locked → active → escaped; keys = rooms escaped |
| `Timer` | `session.startedAt` + `durationMin` | yellow ≤ 10:00; announce at 10:00 and 02:00 via `aria-live`, never every second |
| `HiddenTestLocks` | last `test_run` event | unlocked count = hidden passed |
| `SignalMap` | `features/escape-room/lib/signals.ts` | **counts of captured signals per axis**, never a grade |

## 4. Candidate screens

### 4.1 Security Check `/play/[id]` (Room 0, only if proctoring ≠ off) — Tier 3
- Full-screen dark vault motif, centered card. Steps in `StepList`: Consent → Camera → Microphone → Fullscreen.
- Camera: 320×240 preview in a rounded frame with a neon ring; detected face box drawn as a thin blue rectangle;
  "Face found ✓" chip.
- Mic: "Stay quiet for 3 seconds" progress, then "Say *siap!*" with a 12-bar level meter.
- Final button: "Enter the vault" (requests fullscreen).

### 4.2 Rules
- Three door cards, the AI rule sentence, proctoring summary sentence, "A human reviews your session.
  Nothing is auto-rejected.", checkbox, Start.

### 4.3 Rooms (candidate main screen, min width 1280)

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [🚪1]···[🚪2]···[🚪3]  🔑🔑▫   INC-2417 · Product page 500s    [AI: ON] [🛡][📷] [⏱ 31:42] │ 64px
├──────────────────────────────────────────────────┬───────────────────────────────┤
│ Monaco editor (60%)                              │ Right panel (40%)              │
│  - Room 1: clickable gutter, marked lines glow   │ Tabs: Brief · Tests ·          │
│    blue                                          │   🔦 Inquisitor · ✦ Assistant  │
│  - Inquisitor-cited line flashes blue 3s         │ (locked tabs show a lock and   │
│  - Room 3: read-only + "View diff" toggle        │  the reason)                   │
│                                                  │ ─────────────────────────────  │
│                                                  │ SignalMap (collapsible)        │
├──────────────────────────────────────────────────┴───────────────────────────────┤
│ [▶ Run tests ⌘↵]  [✦ Check]  hidden 🔒🔒🔓🔓🔓🔒 4/6        [Next room →] (disabled) │ 56px
└──────────────────────────────────────────────────────────────────────────────────┘
```

- Below 1024px: friendly "Please use a laptop or desktop for this assessment."
- Monaco theme `hireescape-dark`: background `--he-surface`, line highlight `--he-surface-2`, selection purple
  20%, cursor orange, comments muted, strings green, keywords blue, numbers yellow.

### 4.4 Escaped / Timeout
- Escaped: as in §2 ("You escaped in 31:42", 3 glowing keys, calm arc sweep, no score). Timeout: calm, "Time's up — your work so far has been submitted. Thank you."

## 5. Monaco theme `hireescape-dark`

Background `--he-surface`, line highlight `--he-surface-2`, selection purple 20 %, cursor orange, comments muted,
strings green, keywords blue, numbers yellow. Font JetBrains Mono 14. Register it once in `EditorPane`.

## 6. QA checklist (run at 13:30 and 15:00)

- [ ] Every candidate screen has at least one signature motif (top-bar card, pill title, number badge, arcs).
- [ ] Reduced-motion mode checked once (doors, keys, intro cards fall back to fades).
- [ ] Locked tabs show a lock **and** the reason; no silent disabled controls.
- [ ] 1280×800 and 1920×1080 screenshots look intentional (S1 captures them for the deck).
- [ ] Nothing on `/play` implies a score, a rank or "you are being watched".

## Definition of Done

- [ ] `Timer` formats `mm:ss`, switches colour at thresholds, announces only at 10:00 and 02:00.
- [ ] `SignalMap` shows counts only; a unit test proves no numeric "score" is rendered.
- [ ] `DoorOpenTransition` respects `prefers-reduced-motion`.
- [ ] No import from `features/*` inside `components/game` (ESLint rule).
