# Design Brief — Inner Loop re-skin (handoff)

> Planning artifact from an `/impeccable shape` session. **No code written yet.**
> A fresh session can implement directly from this + `PRODUCT.md` + `DESIGN.md`.
> Stack constraints live in `CLAUDE.md` (SvelteKit + TS + adapter-static, **GSAP
> only**, bun, build via Vite, GitHub Pages static). Reuse the dev server on 5173.

## 1. Summary

Full, production-ready re-skin of The Inner Loop's 5 built chapters into the
**Isotype information-design system** defined in `DESIGN.md`: light, precise,
**BMW-in-daylight**, with structure made legible through a learn-once color code
anchored in the **BMW M tricolor**. Replaces the prior dark "observatory"
aesthetic. The site is for **internal BMW employees** who are non-technical.

## 2. Primary user action

**Read the picture first.** A reader should grasp each chapter's structure from a
color-coded diagram before reading a word of (caption-length) prose.

## 3. Decisions locked in this session

| Topic | Decision |
|---|---|
| Register | brand (design carries the explanation) |
| Scope | **full re-skin**, all 5 built chapters, production-ready / polish-to-ship |
| Direction | Isotype info-design; **light** theme; **Full palette**; **muted-archival** |
| Anchors | Information is Beautiful / The Pudding · BMW corporate · BMW M tricolor |
| Palette | per `DESIGN.md` Colors — concept role-hues, M-tricolor = hero three |
| Motif | BMW M tricolor = the agent **loop spine** (restrained, one signature use) |
| Type | **Hanken Grotesk** (display+body via weight) + **Spline Sans Mono** (tokens/code only). **Drop Sora + Source Serif 4.** |
| Motion | GSAP `ScrollTrigger` + `Flip`; **connective cross-chapter through-line** is required, not optional |
| A11y | WCAG AA; motion-as-core with reduced-motion fallbacks that still teach |

## 4. The connective through-line (signature requirement)

Chapters are designed as **one continuous system**, not five independent skins.
Shared objects persist and morph across each boundary so concepts visibly
compose. The **Hero loop is the spine / map**; each chapter zooms into one node
and back out.

Object handoffs (build the shared object layer first so all chapters speak it):

- **Ch.2 tokens** (colored chips) → flow into **Ch.3** next-token prediction as
  the same chips.
- **Ch.3 output** → stacks into **Ch.4** context-window strata (same role-hues).
- **Ch.4 context** → feeds **Ch.5** inner loop; the **M-tricolor spine becomes
  the literal cycle** (append → call → act → append).
- A persistent **loop mini-map** marks the current node throughout — and is the
  **reduced-motion fallback**: handoffs collapse to the mini-map advancing one
  node + static "carried from Ch.N →" connectors + end-state diagrams.

## 5. Chapter mapping (existing → new)

| Ch | Component | Role in new system |
|----|-----------|--------------------|
| 01 | `Hero.svelte` | Cold-open agent loop = the **spine/map** every chapter zooms into. Recolor strata to concept hues; loop drawn in M-tricolor. |
| 02 | `Tokenization.svelte` | **Origin of the token chip** object that hands forward. |
| 03 | `Inference.svelte` | Next-token prediction; consumes Ch.2 chips; shows scored candidates as Isotype bars. |
| 04 | `ContextWindow.svelte` | Strata receive Ch.3 output; canonical home of the role-hue legend. |
| 05 | `ToolCalling.svelte` | Inner loop; context feeds the M-tricolor cycle. |
| 06–07 | _not built_ | Context engineering, harness engineering. **Out of scope** — build later via `/impeccable craft` on this system. |

## 6. Build sequence (recommended)

1. **Foundation — `src/app.css`:** replace the dark token block with the light
   OKLCH system from `DESIGN.md`. Remove `color-scheme: dark`, the blueprint-grid
   `background-image`, the `--glow-*` shadows, and the `.film-grain` overlay.
   Rewrite the `.eyebrow` (drop 0.22em uppercase mono).
2. **Fonts — `src/app.html`:** swap the Google Fonts link to **Hanken Grotesk**
   (400/500/600/700) + keep **Spline Sans Mono**; drop Sora + Source Serif 4.
   Set `<meta name="color-scheme" content="light">`. Preload to avoid FOUC.
3. **Shared layer:** legend component, loop spine / mini-map component, flat
   Isotype pictogram SVG set (one per concept), shared token-chip + strata
   primitives, and a GSAP orchestration util (`ScrollTrigger` pin + `Flip`
   handoff) plus a reduced-motion guard.
4. **Re-skin chapters 01→05 in order,** wiring the object handoffs at each
   boundary.
5. **Reduced-motion fallbacks** per chapter (mini-map + static end-states).
6. **Verify:** responsive at each breakpoint (no title overflow), AA contrast on
   body/muted/label text and concept labels, keyboard focus. Use the
   `agent-browser` CLI (per `CLAUDE.md`).

## 7. Open questions (asserted defaults — override if needed)

- **BMW roundel:** default = neutral custom mark, **not** the official
  roundel/trademark, unless brand approval exists. (Internal use may permit it —
  confirm.)
- **BMW Type web kit:** if a licensed kit is available, substitute it for Hanken
  Grotesk on `display`/`title`.
- **M-tricolor intensity:** default = restrained (one signature placement, the
  loop). Bolden only on request.

## 8. Useful impeccable references during build

`colorize.md` (semantic color system) · `layout.md` (diagram grids + rhythm) ·
`animate.md` (teaching motion + reduced-motion) · `typeset.md` (single-family
weight hierarchy).
