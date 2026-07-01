# Design Brief — Inner Loop re-skin (handoff)

> Planning artifact from an `/impeccable shape` session. **Foundation + full
> visual re-skin implemented** — see [§9 Implementation record](#9-implementation-record--what-shipped)
> and [§10 Still open](#10-still-open--not-yet-built) for status. Original plan
> (§1–8) is preserved unchanged as the intent of record.
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

---

## 9. Implementation record — what shipped

Implemented on branch `refactor/impeccable-design` via `/impeccable craft`.
Approach: **re-theme through the token layer** rather than rewrite every
component. The five chapter components reference a stable set of CSS variables
plus a small number of hardcoded literals; redefining the tokens flips ~90% of
the surface, and the literals were fixed surgically. This preserves the finely
tuned GSAP/ScrollTrigger choreography (token hand-off, pinned scrollytelling,
the inner loop) intact.

**Foundation — `src/app.css` (full rewrite).**
- Canonical light Isotype tokens from `DESIGN.md` are the source of truth
  (`--c-*`, `--concept-*`, `--m-blue/violet/red`). Legacy names the components
  read (`--paper`, `--ink`, `--surface`, `--muted`, `--faint`, `--line`,
  `--cat-*`, `--cool/warm`, `--token-fill`, etc.) are **aliased** to them.
- **Deliberate ink↔paper inversion:** the dark theme used `--ink` as the page
  ground and `--paper` as text; the light theme swaps their roles. This is the
  one thing to understand before touching the tokens (commented in the file).
- Removed `color-scheme: dark`, the blueprint-grid `background-image`, the
  `--glow-*` neon, and the film-grain layer. `--glow-*` now resolve to soft,
  low, single-layer shadows that are valid in **both** `box-shadow` and
  `drop-shadow()` (no spread), so every legacy `filter: drop-shadow(var(--glow-*))`
  call degrades to tasteful elevation. `--panel-gradient/--panel-shadow` are now
  quiet light depth. `.eyebrow` rewritten (sentence-case Hanken, brand-weighted —
  no 0.22em uppercase mono). Added `overflow-x: clip` on `body` (sticky-safe).
- **Contrast was solved, not assumed.** WCAG ratios were computed for every
  critical pair; the `response` (ochre) and `user` (teal) concept inks were
  **deepened** from the `DESIGN.md` draft values so even small in-diagram labels
  clear ≥4.5:1 on their own `*-fill`. Text grays set to `--muted` L0.44 /
  `--faint` L0.50 (both AA on paper/surface/sunken).

**Fonts — `src/app.html`.** Google Fonts swapped to **Hanken Grotesk**
(400/500/600/700) + **Spline Sans Mono**; **Sora + Source Serif 4 dropped**.
`meta color-scheme=light`, preload added, film-grain `<div>` removed.

**Shell — `src/routes/+page.svelte`** (header/footer/wordmark live here, *not*
`+layout.svelte`). Heavy 3px brand top-stripe → thin **M-tricolor spine**
(`::before`, blue·violet·red); wordmark "LOOP" chase recolored to cycle the M
tricolor; wordmark + footer mark moved off mono onto Hanken; kicker de-tracked;
dark chrome/glow removed.

**Chapter recolor (by meaning, not find-replace).** ~30 hardcoded literals fixed
across `Hero`, `Tokenization`, `Inference`, `ContextWindow`, `ToolCalling`:
tool-output accent → **M-red** (`--cat-tool`), model-response → **ochre**,
tools → **M-violet** (already), context-flow → **M-blue**. Inference's GSAP
highlight states inverted correctly (the "cool into context" beat now becomes a
pale-fill / dark-text resting chip instead of a dark box). Neon `drop-shadow`
glows in the embedding cloud and tool-schema transition softened/removed.

**Signature M-tricolor motif (restrained, per §7 default):** two cohesive
placements only — the masthead spine and the animated wordmark loop. Not
scattered onto cards/sections.

**Verification (agent-browser).** All 5 chapters at desktop (1440) + mobile
(390); `prefers-reduced-motion` (static end-state diagram + spine fallback);
no horizontal overflow (fixed a 14px rotated-stamp bleed); `svelte-check` 0
errors; `vite build` → static `build/` OK.

## 10. Still open — not yet built

**Net-new shared-layer work from §4 / §6.3 — deferred (these are new features,
not a re-skin, and each warrants its own craft pass):**
- **Persistent loop mini-map** in the margin marking the current node across all
  chapters (and doubling as the reduced-motion connective fallback). Not built.
- **New flat Gerd-Arntz-spirit pictogram set** (one per concept). Not built —
  chapters still rely on their existing diagram primitives.
- **Generalized GSAP `Flip` hand-off util + `ScrollTrigger` orchestration
  helper** as a shared layer. Not built as a shared util. The existing Ch.1→Ch.2
  token hand-off through-line is **preserved and works** in the light theme, but
  the Ch.3→Ch.4→Ch.5 object hand-offs described in §4 are not yet wired as one
  continuous system.

**Polish / follow-ups:**
- **Radius scale not reconciled.** Pre-existing component radii (3px panels, 14px
  cards, 10px inputs) are outside the `DESIGN.md` `rounded` scale (4/8/12). Left
  as-is — out of scope for a colour/type re-skin; the design hook flags them.
- **In-JS colour literals.** GSAP colour tweens need concrete resolved colours
  (it can't reliably interpolate `var(--token)`), so a handful of hex/rgba values
  that *mirror* the palette live in component scripts. The design hook flags
  these; they are intentional, not drift.
- **`single-font` hook finding** is a false positive — `DESIGN.md` mandates one
  grotesque (Hanken) + mono (Spline) by design. Not silenced via config.
- **Open questions from §7 still unanswered:** BMW roundel (custom mark used,
  not the trademark), licensed BMW Type web kit (Hanken used), M-tricolor
  intensity (kept restrained).
- **Chapters 06–07** (context / harness engineering) remain unbuilt, as scoped.
- Nothing committed — changes are on the working tree of `refactor/impeccable-design`.
