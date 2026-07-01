---
version: alpha
name: The Inner Loop
description: >-
  Isotype-style information-design system for an internal BMW field guide to LLMs
  and coding agents. Precise and calm, with a learn-once color code anchored in
  the BMW M tricolor. Ships in two registers: a default light "BMW in daylight"
  and a sanctioned dark "BMW at night" (reader-toggled, system-aware). Both
  depart from — and never revive — the prior "precision observatory" aesthetic.
colors:
  paper: "oklch(0.985 0.004 255)"
  surface: "oklch(0.966 0.006 255)"
  surface-sunken: "oklch(0.945 0.008 255)"
  ink: "oklch(0.25 0.02 260)"
  ink-muted: "oklch(0.46 0.02 260)"
  line: "oklch(0.90 0.010 255)"
  line-strong: "oklch(0.80 0.015 255)"
  brand: "oklch(0.52 0.15 255)"
  brand-strong: "oklch(0.45 0.16 255)"
  # Concept role-hues — each owns one meaning, learned once, read everywhere.
  # Muted-archival register; the BMW M tricolor supplies the hero three.
  concept-system: "oklch(0.50 0.04 250)"
  concept-system-fill: "oklch(0.945 0.012 250)"
  concept-history: "oklch(0.52 0.13 245)"
  concept-history-fill: "oklch(0.935 0.030 245)"
  concept-user: "oklch(0.52 0.10 195)"
  concept-user-fill: "oklch(0.940 0.030 195)"
  concept-tools: "oklch(0.47 0.14 305)"
  concept-tools-fill: "oklch(0.935 0.035 305)"
  concept-tool-output: "oklch(0.53 0.16 25)"
  concept-tool-output-fill: "oklch(0.940 0.035 25)"
  concept-response: "oklch(0.58 0.10 75)"
  concept-response-fill: "oklch(0.945 0.040 75)"
  # BMW M tricolor — the loop-spine motif. Used as a set, with restraint.
  m-blue: "oklch(0.52 0.13 245)"
  m-violet: "oklch(0.47 0.14 305)"
  m-red: "oklch(0.55 0.18 25)"
# Dark register — "BMW at night". Applied under :root[data-theme='dark'];
# overrides only the canonical --c-* layer + concept hues, so every derived
# alias inherits. Depth comes from surface LIGHTNESS, not shadow. Fills invert
# to dark tints, inks/tricolor lift; every pairing re-checked ≥4.5:1 (AA).
colorsDark:
  paper: "oklch(0.165 0.013 260)"       # deep cool graphite, never near-black
  surface: "oklch(0.215 0.014 260)"     # raised panel (lighter = elevated)
  surface-sunken: "oklch(0.190 0.014 260)"
  ink: "oklch(0.93 0.012 255)"          # ~15.7:1 on paper
  ink-muted: "oklch(0.72 0.014 258)"    # ~7.8:1 (AA body)
  faint: "oklch(0.64 0.014 258)"        # ~5.7:1 (AA small)
  line: "oklch(0.30 0.012 260)"
  line-strong: "oklch(0.40 0.015 260)"
  brand: "oklch(0.66 0.14 255)"
  brand-strong: "oklch(0.74 0.13 255)"  # ~8.4:1 links on paper
  concept-system: "oklch(0.72 0.05 250)"
  concept-system-fill: "oklch(0.235 0.018 250)"
  concept-history: "oklch(0.72 0.13 245)"
  concept-history-fill: "oklch(0.27 0.045 245)"
  concept-user: "oklch(0.74 0.11 195)"
  concept-user-fill: "oklch(0.25 0.04 195)"
  concept-tools: "oklch(0.73 0.15 305)"
  concept-tools-fill: "oklch(0.26 0.05 305)"
  concept-tool-output: "oklch(0.73 0.16 25)"
  concept-tool-output-fill: "oklch(0.27 0.05 25)"
  concept-response: "oklch(0.80 0.13 75)"
  concept-response-fill: "oklch(0.27 0.05 75)"
  m-blue: "oklch(0.66 0.15 245)"
  m-violet: "oklch(0.64 0.16 305)"
  m-red: "oklch(0.66 0.18 25)"
typography:
  display:
    fontFamily: "Hanken Grotesk"
    fontSize: "clamp(2.2rem, 5vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Hanken Grotesk"
    fontSize: "clamp(1.6rem, 4vh, 2.4rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Hanken Grotesk"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "Hanken Grotesk"
    fontSize: "0.9rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Spline Sans Mono"
    fontSize: "0.72rem"
    fontWeight: 500
    letterSpacing: "0.04em"
  code:
    fontFamily: "Spline Sans Mono"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "2rem"
  xl: "4rem"
  "2xl": "8rem"
  gutter: "clamp(1rem, 4vw, 6rem)"
components:
  chapter-section:
    background: "{colors.paper}"
    text: "{colors.ink}"
  diagram-panel:
    background: "{colors.surface}"
    border: "{colors.line}"
    radius: "{rounded.lg}"
  token-chip:
    background: "{colors.concept-history-fill}"
    text: "{colors.ink}"
    radius: "{rounded.sm}"
  legend:
    background: "{colors.surface}"
    text: "{colors.ink-muted}"
  loop-spine:
    blue: "{colors.m-blue}"
    violet: "{colors.m-violet}"
    red: "{colors.m-red}"
---

# The Inner Loop — Design System

## Overview

The Inner Loop is an internal BMW field guide that explains how LLMs and coding
agents actually work to non-technical and semi-technical colleagues. The visual
system is **Isotype-style information design**: structure is made legible through
a small, consistent color code the reader learns once and re-reads in every
diagram. The register is **brand** — design carries the explanation.

The feel is **BMW in daylight**: a light, cool, near-white ground, generous white
space, one precise grotesque, and the **BMW M tricolor** (blue / violet / red) as
a disciplined structural accent and the motif of the agent "loop." It reads
calm, exact, and unhurried — the fog lifting, never technical intimidation.

This system deliberately **replaces** the prior dark "precision observatory"
aesthetic (near-black ground, electric-blue glow, blueprint grid, film grain,
monospace eyebrows), which read as generic AI dev-tool and fought the
calm-clarity goal. See [Do's and Don'ts](#dos-and-donts).

## Colors

**Strategy: Full palette** on a light ground. Color is *semantic*, not
decorative — each concept owns a hue, and that mapping is constant site-wide so a
reader learns the legend once.

**Surfaces & ink**

- `paper` — page background. Cool near-white with a whisper of BMW blue. **Not
  cream / sand / warm** — that warmth is the AI default and is banned here.
- `surface` / `surface-sunken` — panels and recessed wells for diagrams.
- `ink` — body text (~14:1 on `paper`). `ink-muted` — secondary text, held at
  ≥4.5:1 for AA. Do not let muted text drift lighter "for elegance."
- `line` / `line-strong` — hairlines and dividers.
- `brand` — BMW corporate blue for interactive chrome; `brand-strong` is the
  AA-safe variant for links/text on `paper`.

**Concept role-hues (learn once, read everywhere)**

Each pairs a saturated `*-ink` (labels, 2px borders, pictograms) with a pale
`*-fill` (block backgrounds). The BMW M tricolor supplies the hero three.

| Concept | Token | Hue |
|---|---|---|
| system prompt (fixed) | `concept-system` | slate |
| history / context flow | `concept-history` | **M blue** |
| user input | `concept-user` | teal |
| tool call | `concept-tools` | **M violet** |
| tool output | `concept-tool-output` | **M red** |
| model response | `concept-response` | ochre |

**M tricolor** (`m-blue`, `m-violet`, `m-red`) is reserved for the **loop-spine
motif** — used as an ordered set, once per context, never as scattered
decoration.

**Contrast rules:** body text is always `ink` / `ink-muted`, never a concept hue.
Concept hues carry meaning through fills, borders, and large labels — and are
**always paired with a text label** (never color alone), for color-blind and AA
compliance.

### Theming — light & dark registers

Light ("BMW in daylight") is the default and the brand's front door. Dark ("BMW
at night") is a sanctioned peer register — the *same* Isotype system after
hours, not a different identity and **never** a revival of the banned
observatory look (see [Don't](#dos-and-donts)).

- **One token layer, two grounds.** All UI reads canonical `--c-*` tokens (plus
  concept hues); the dark register overrides only that layer under
  `:root[data-theme='dark']`, so every derived alias inherits for free. See
  `colorsDark` in the frontmatter for the resolved values.
- **Dark is not inverted light.** The ground is a deep *cool graphite*
  (`oklch(0.165 …)`), never near-black. Depth comes from surface **lightness**
  (raised = lighter), not shadow. Concept `*-fill`s invert to low-lightness
  tints; `*-ink`s and the M tricolor lift so each pairing still clears AA
  (≥4.5:1 body, verified: ink 15.7:1, muted 7.8:1, every concept label ≥6:1 on
  its fill). No neon glow — the old glows become quiet, low-alpha tinted lifts.
- **Selection.** First paint is resolved by a blocking script in `app.html`: an
  explicit stored choice wins, otherwise the OS `prefers-color-scheme`; the page
  then follows the OS live until the reader toggles. This prevents a light-flash
  on dark devices (the site is fully static — no server to pick for us).
- **The toggle** is a single sun/moon icon button in the masthead (far right).
  The switch is a calm whole-page crossfade via the View Transitions API, with
  an instant fallback under `prefers-reduced-motion` and on unsupported
  browsers. The choice persists in `localStorage`.
- **GSAP-driven SVG highlights** (the few inline `fill`/`stroke`/`color` tweens
  in the chapter diagrams) resolve theme-aware hexes at mount, since GSAP tweens
  concrete colors; the static diagram itself reads live CSS tokens.

## Typography

**One family does the work: Hanken Grotesk** — a humanist grotesque that echoes
BMW Type's clean, engineered warmth while staying open-license (Google Fonts).
Hierarchy comes from weight and size contrast, not a second display face. A
serif would pull toward the editorial-magazine reflex and away from BMW's
sans-led identity — so there is none.

- `display` (700) — chapter titles. `title` (600) — section heads. `body` (400)
  / `caption` (500) — prose, held to caption length.
- **`label` / `code` use Spline Sans Mono**, reserved **only** for real tokens,
  code, and data values — never as a section eyebrow or "technical" costume.
- Modular scale, fluid `clamp()` on headings, ratio ≥1.25. Display
  letter-spacing floor −0.02em. Use `text-wrap: balance` on titles,
  `text-wrap: pretty` on prose. Cap measure at 65–75ch.

_Alt:_ Archivo may sub for `display` only, if a more engineered headline is
wanted. Spline Sans Mono is carried over from the prior system intentionally.

## Layout

Generous white space on a disciplined column/baseline grid — transit-map order,
not density. Each chapter **leads with a structural diagram** (color-coded flat
blocks + simple Gerd-Arntz-spirit pictograms); prose sits beside or below it at
caption length. Vary spacing for rhythm: tight groupings inside a diagram,
generous separation between ideas.

- Spacing scale `xs`…`2xl`; page edges use `spacing.gutter`
  (`clamp(1rem, 4vw, 6rem)`).
- A persistent **loop mini-map** lives in the margin (or top on mobile) and marks
  the current node of the agent loop, so the reader never loses the whole.
- Responsive: wide diagrams reflow to a vertical stack on mobile while keeping
  the legend visible. Test every chapter title at each breakpoint for overflow.
- Flexbox for 1D, Grid for 2D. Breakpoint-free card rows only where cards are the
  right affordance: `repeat(auto-fit, minmax(280px, 1fr))`.

## Elevation & Depth

Depth is **quiet and physical**, like ink on good paper — not glowing glass.

- No neon glow, ever. Separation comes from `surface` vs `surface-sunken`,
  hairline `line` borders, and at most one soft, low, neutral shadow
  (`0 1px 2px` / `0 8px 24px -16px` at low alpha) for panels that truly lift.
- Semantic z-index scale: base → sticky header → mini-map → expander → modal →
  tooltip. No arbitrary `9999`.

## Shapes

Precise and restrained, matching BMW's geometric discipline. Modest radii only:
`rounded.sm` (4px) for chips and small controls, `md` (8px) for inputs, `lg`
(12px) for diagram panels, `pill` for the rare toggle. No heavy rounding, no
giant rounded-corner icon tiles above headings (template tell).

## Components

- **Site header** — light, hairline bottom border; the M-tricolor appears as a
  thin spine accent, not a heavy top stripe. Wordmark in Hanken Grotesk;
  chapter `n/07` indicator.
- **Chapter section** — `paper` ground, `data-chapter` for the scroll observer;
  leads with its diagram-panel.
- **Diagram panel** — `surface` well, `line` border, `rounded.lg`; the Isotype
  stage where color-coded blocks and pictograms live.
- **Token chip** — small `rounded.sm` chip in a concept `*-fill`; the persistent
  object that hands off between chapters (Ch.2 → Ch.3 → Ch.4).
- **Context-window strata** — stacked bands, one concept hue each, each band
  text-labeled.
- **Legend** — always-available key mapping hue → concept; the contract that
  makes every diagram readable.
- **Loop spine / mini-map** — the agent loop drawn with the M-tricolor; marks the
  current node and is the reduced-motion fallback for the connective transitions.
- **"Go deeper" expander** — closed by default; holds optional technical depth
  (attention, temperature) out of the main reading line.
- **Footer** — quiet; restates the wordmark and the "illustrative, not production"
  disclaimer.

## Motion

**Motion teaches — it is part of the explanation, not garnish.** GSAP only
(`ScrollTrigger` + `Flip` are GSAP plugins; honors the stack constraint).

- **Connective through-line (signature).** Chapters are one continuous system.
  Shared objects persist and morph across each boundary so concepts visibly
  compose: tokens from Ch.2 flow into Ch.3's prediction, then stack into Ch.4's
  context window, then feed Ch.5's loop. The Hero loop is the spine; each chapter
  zooms into one of its nodes and back out. Implement with `ScrollTrigger` pinning
  + `Flip` for element handoff.
- **Diagram motion** — tokens flow, the context window fills, the loop cycles;
  each animation reveals an already-visible default state (never gates content
  visibility on a class).
- **Easing** — ease-out (quart / expo). No bounce, no elastic.
- **Reduced motion is mandatory and must still teach.** Under
  `prefers-reduced-motion: reduce`, big handoffs collapse to the loop mini-map
  advancing one node + static "carried from Ch.N →" connectors and end-state
  diagrams. Never a blank or untaught section.

## Do's and Don'ts

**Do**

- Default to light, cool, and spacious — BMW in daylight. The dark register is
  its sanctioned night twin: same system, deep cool graphite ground, depth via
  surface lightness (not glow). See [Theming](#theming--light--dark-registers).
- Make color mean something; keep the concept→hue mapping constant; always pair
  hue with a label.
- Use the M-tricolor as one disciplined motif (the loop), not scattered stripes.
- Keep prose caption-length; push depth into "Go deeper."
- Give every motion a reduced-motion fallback that still teaches.
- Hold body and placeholder text to AA (≥4.5:1); large/bold text ≥3:1.

**Don't**

- No revival of the "precision observatory": no neon/electric-blue glow, no
  blueprint-grid background, no film-grain overlay, no near-black ground. These
  are the banned tells — the sanctioned dark register avoids every one of them
  (deep cool graphite, quiet lifts, learn-once color code intact).
- No cream / sand / warm-neutral `paper`. Cool near-white only.
- No monospace as a "technical" costume; mono is for tokens and code only.
- No tracked uppercase eyebrow above every section (`letter-spacing: 0.22em`
  uppercase mono — removed from the old system).
- No gradient text, no side-stripe accent borders, no glassmorphism, no
  identical icon-card grids.
- No childish / cartoonish pictograms; keep them flat, exact, Isotype-grade.
- Never encode meaning in color alone.
