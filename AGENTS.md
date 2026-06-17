## General

- Be extremely concise. Sacrifice grammar for the sake of concision.
- Before starting a new dev server, check whether one is already running (usually on port 5173) to reuse.

## Project

- **The Inner Loop** is an internal, self-serve visual field guide explaining LLMs and coding agents to non-technical and semi-technical colleagues. Build accurate intuition, not a comprehensive ML course or marketing site.
- Narrative spine: reveal the hidden nested machine inside one user turn. The agent's prompt loop contains a tool-calling loop (`think -> act -> observe`); each model call contains one-token-at-a-time generation.
- Eight-chapter path: cold-open agent demo -> tokenization -> next-token prediction -> attention/temperature -> context window -> agent tools/inner loop -> context engineering -> harness engineering.
- Design for the least technical reader first. Hook before abstraction; visuals/interactions carry the explanation; prose stays caption-length. Put optional technical depth in closed `Go deeper` expanders.
- Keep terms distinct: **context engineering** chooses what enters each model call; **harness engineering** is the surrounding loop, tools, retries, orchestration, and guardrails.
- Be accurate and plain-spoken. Label simplified demos as illustrative; avoid hype, false precision, and implying the model remembers between calls.

## Hosting / Stack

- Target hosting: GitHub Pages, so the app must build to static files.
- Use SvelteKit + TypeScript + adapter-static + GSAP
- Animations should use GSAP only! Exceptions only if no other option.
- Package manager: bun, build + test: Vite
- If publishing under `org.github.io/repo`, set Vite `base` to `/repo/`; use `/` for custom domains or root user/org sites.
- Use the agent-browser cli (`agent-browser --help`) for E2E verification

## Design

**Concept: a precision observatory.** The site is one glowing technical schematic on black-glass mineral chrome. The machine (PRD §6.1) reads like an instrument lit in the dark — the cold open shows it ticking before anything is named. The palette stays restrained: chrome (panels, lines, type) is monochrome with one **brand blue** carrying every structural accent, the two **flow accents** mark token *motion*, and each **context-window category** carries one distinct muted hue so layers read apart by color, not just shade. The eye still tracks meaning, not decoration. This matches the 3Blue1Brown register while keeping the editorial calm of distill.pub.

### Palette

**Brand blue is the chrome accent — and only the chrome accent.** `--brand` draws structural marks: the 2–3px top border on the header and every stage panel, section tick-marks, focus rings, selection, the toggle/hover states. `--brand-strong` (brighter, AA on dark fills) colors eyebrows/kickers, list numerals, value readouts, and highlighted mono labels. Brand never tints token chips, flow arrows, or strata — and conversely, cool/warm never leak into chrome.

The two flow accents are **reserved for token motion** (PRD §6.1, §9) — the travelling token chips and flow arrows, never buttons, links, or chrome. Cool = context tokens travelling **right into the LLM**; warm = the generated response streaming **left back to the agent**. That consistency is the navigational cue, so don't dilute it.

**Context-window categories each get one muted hue** so adjacent strata are distinguishable at a glance (`--cat-*`): system prompt = slate blue, tool definitions = violet, conversation history = azure, user input = green. Tool output and model response deliberately reuse the cool/warm flow accents — they *are* context-in and response-out — which ties the strata back to the flow. Each category is an `{accent, fill}` pair: accent on the label + a thin left stripe, the darker fill as the block body. A budget **overflow** still flashes warm on the `max` line as a breach signal. Keep these hues muted and confined to the strata (and their legend).

```css
:root {
  /* canvas — black glass, mineral chrome */
  --ink:        #080B0F;  /* page background */
  --surface:    #10161D;  /* panels, expanders */
  --diagram-surface: #10161D;  /* SVG stage fill */
  --surface-raised:  #17202A;  /* raised controls */
  --line:       #26323F;  /* schematic strokes, hairlines, grid */
  --line-bright:#4B5C6E;  /* active/framed strokes */

  /* type */
  --paper:      #F1F4F7;  /* body text */
  --muted:      #9BA8B5;  /* captions, secondary labels */
  --faint:      #667586;  /* disabled, far-away diagram detail */

  /* brand — structural chrome accents ONLY (never token motion) */
  --brand:        #1C69D4;  /* borders, ticks, focus, selection */
  --brand-strong: #4D96F5;  /* eyebrows, numerals, readouts */
  --brand-soft:   rgba(28,105,212,.14);  /* tinted fills/glows */
  --glow-brand:   0 0 12px rgba(28,105,212,.45);

  /* flow accents — token MOTION only (chips + flow arrows) */
  --cool:       #38E1C6;  /* context tokens → into the model */
  --warm:       #FF9D4D;  /* response tokens ← back to the agent */
  --cool-soft:  rgba(56,225,198,.12);  /* chip fills */
  --warm-soft:  rgba(255,157,77,.14);
  --glow-cool:  0 0 12px rgba(56,225,198,.45);
  --glow-warm:  0 0 12px rgba(255,157,77,.45);

  /* context-window category hues — one per stratum, {accent, fill} */
  --cat-system:  #8798D0; --cat-system-fill:  #1B2438;  /* slate blue */
  --cat-tools:   #B394E6; --cat-tools-fill:   #292342;  /* violet */
  --cat-history: #63B6E1; --cat-history-fill: #143242;  /* azure */
  --cat-user:    #6BD0A2; --cat-user-fill:    #16342A;  /* green */
  --cat-tool:    var(--cool); --cat-tool-fill:    #103632;  /* cool — context in */
  --cat-response:var(--warm); --cat-response-fill:#382716;  /* warm — response out */

  /* shared surfaces — use these, don't restate gradients per component */
  --panel-gradient: linear-gradient(155deg, #0B1016 0%, var(--surface) 58%, #111C29 100%);
  --panel-shadow:   0 30px 70px -42px rgba(0,0,0,.9);
  --header-bg:      rgba(8,11,15,.88);
  --grid-color:     rgba(75,92,110,.17);  /* page line-grid */
  --token-fill:     #1A2634;  /* static (non-travelling) token chips */
  --transformer-fill: #17212D;
  --bar-fill:       #26384D;  /* probability bars */
  --liquid:         #4B5C6E;  /* tank liquid gradient */
}
```

**Panel idiom:** every stage panel reads as one instrument card — `border: 1px solid var(--line)`, `border-top: 2px solid var(--brand)`, `border-radius: 3px`, `background: var(--panel-gradient)`, `box-shadow: var(--panel-shadow)`. Sharp corners, no large radii.

### Typography

Engineering field-guide trio (all Google Fonts) — technical grotesque + scholarly serif + instrument mono, chosen to read "BMW precision instrument" rather than "Mercedes luxury editorial." Never substitute Inter/Roboto/Arial/system or Space Grotesk.

- **Display / chapter titles — `Sora`.** Geometric technical grotesque; engineered, open apertures. Use weight 500 large for the "hook" line of each arc and the chapter numerals — it carries the schematic/chrome register where a high-contrast didone (Instrument Serif) read too luxury-editorial.
- **Body / prose — `Source Serif 4`.** Sturdy scholarly screen-serif with an optical-size axis; reads as a technical field guide. Constrain the reading column to ~62ch; one–two sentences per beat (PRD §8).
- **Technical layer — `Spline Sans Mono`.** Every token, diagram label, glossary term, temperature/value readout, and code sample. Tokens rendered as monospace "chips" are a recurring motif; sub-word splits and leading-space artifacts (PRD Ch 2) read naturally in mono.

### Motion (GSAP)

- **Camera = discrete stops, not scrubbing.** Implement the §6.1 camera path with ScrollTrigger snapping between a handful of framed states; the diagram is a *pinned stage* the prose scrolls past. Snap on section entry — never bind a continuous zoom to scroll position.
- **Detail fades in on frame.** Labels and sub-mechanisms for a region appear only when the camera frames it (staggered reveals via timeline delays); they fade back to `--faint`/hidden when it leaves. Keep any single view uncluttered.
- **Tokens are particles on paths.** Token chips travel along the channel between agent and LLM — cool rightward, warm leftward — using motion-path tweens. This is the one signature effect; spend the animation budget here.
- **Motion makes an argument (PRD §5.2).** A concept assembling itself, a word dissolving into chunks. If a tween can be cut without losing meaning, cut it.
- **Conceptual chapters break away.** Tokenization, embeddings, and hallucinations leave the diagram for full-bleed bespoke canvases, then return the camera to the schematic afterward.

### Layout & atmosphere

- Pinned diagram stage on `--surface`; reading column overlaid or beside it, asymmetric, generous negative space around the lit machine.
- **The context window is a stratified tank** (PRD §7) — the mediator in the agent↔LLM channel, not just two flow lines. Labeled token strata (system prompt, tool definitions, user prompt, tool outputs, responses) stack in a vessel against a finite `used / max` budget line; it fills as the inner loop runs, is handed to the model **whole** on every call, and **evicts the oldest content on overflow**. Each stratum wears its category hue (`--cat-*`) — a tinted fill plus an accent label and left stripe — so layers read apart by color. Rendered compact in the hero's context-window stop and full-scale (a sticky tank scrolled past prose steps) in Chapter 7.
- Background depth: a faint full-page blueprint line-grid (`--grid-color`) with one brand-tinted radial glow top-right, plus a subtle film-grain overlay — never flat fills. Glow on active strokes and token chips via `box-shadow`/`drop-shadow` with `--glow-*`.
- **"Go deeper" expanders** (PRD §8) styled as folded schematic cards on `--surface` with a `--line` hairline; closed by default so the main path reads clean for the least technical viewer.
- Illustrative-demo disclaimers (PRD §5.5, §8) set small in `--muted` `Spline Sans Mono`.

### Accessibility & degradation (PRD §11)

- `--paper` on `--ink` clears WCAG AA for body; the flow accents are decorative motion, never the sole carrier of meaning (always paired with a mono label or arrowhead).
- Static-first build (adapter-static): each camera stop maps to a real in-page anchor so the narrative is navigable without JS.
