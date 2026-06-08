## General

- Be extremely concise. Sacrifice grammar for the sake of concision.

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

**Concept: a blueprint observatory.** The site is one glowing technical schematic on a near-black ink-blue canvas. The machine (PRD §6.1) reads like an instrument lit in the dark — the cold open shows it ticking before anything is named. The whole palette is restrained and monochrome-blue *except* the two token-flow accents, so the eye always tracks meaning, not decoration. This matches the 3Blue1Brown register while keeping the editorial calm of distill.pub.

### Palette

The two flow accents are **reserved exclusively for token flow** (PRD §6.1, §9) — never use them for buttons, links, or chrome. Cool = context tokens travelling **right into the LLM**; warm = the generated response streaming **left back to the agent**. That consistency is the navigational cue, so don't dilute it.

Two derived uses stay inside the rule because they still read as *flow*, not chrome: a context-window stratum that holds model output wears a thin **warm** resting edge (it *is* response tokens), and a budget **overflow** flashes warm on the `max` line as a breach signal. Both are always paired with a mono label, and neither ever lands on a button, link, or border.

```css
:root {
  /* canvas */
  --ink:        #0A0D16;  /* page background — blue-black, not pure black */
  --surface:    #11151F;  /* panels, expanders, the diagram stage */
  --line:       #1E2533;  /* schematic strokes, hairlines, grid */
  --line-bright:#2C3650;  /* active/framed strokes */

  /* type */
  --paper:      #E8E6DF;  /* body text — warm off-white for long reading */
  --muted:      #8A93A6;  /* captions, secondary labels */
  --faint:      #5A6275;  /* disabled, far-away diagram detail */

  /* the only saturated colors — token flow ONLY */
  --cool:       #38E1C6;  /* context tokens → into the model */
  --warm:       #FF9D4D;  /* response tokens ← back to the agent */
  --glow-cool:  0 0 12px rgba(56,225,198,.45);
  --glow-warm:  0 0 12px rgba(255,157,77,.45);
}
```

### Typography

Distinctive editorial-scientific trio (all Google Fonts). Never substitute Inter/Roboto/Arial/system or Space Grotesk.

- **Display / chapter titles — `Instrument Serif`.** High-contrast, characterful, one weight; use large for the "hook" line of each arc and the chapter numerals.
- **Body / prose — `Newsreader`.** Humanist serif tuned for screen reading. Constrain the reading column to ~62ch; one–two sentences per beat (PRD §8).
- **Technical layer — `Spline Sans Mono`.** Every token, diagram label, glossary term, temperature/value readout, and code sample. Tokens rendered as monospace "chips" are a recurring motif; sub-word splits and leading-space artifacts (PRD Ch 2) read naturally in mono.

### Motion (GSAP)

- **Camera = discrete stops, not scrubbing.** Implement the §6.1 camera path with ScrollTrigger snapping between a handful of framed states; the diagram is a *pinned stage* the prose scrolls past. Snap on section entry — never bind a continuous zoom to scroll position.
- **Detail fades in on frame.** Labels and sub-mechanisms for a region appear only when the camera frames it (staggered reveals via timeline delays); they fade back to `--faint`/hidden when it leaves. Keep any single view uncluttered.
- **Tokens are particles on paths.** Token chips travel along the channel between agent and LLM — cool rightward, warm leftward — using motion-path tweens. This is the one signature effect; spend the animation budget here.
- **Motion makes an argument (PRD §5.2).** A concept assembling itself, a word dissolving into chunks. If a tween can be cut without losing meaning, cut it.
- **Conceptual chapters break away.** Tokenization, embeddings, and hallucinations leave the diagram for full-bleed bespoke canvases, then return the camera to the schematic afterward.

### Layout & atmosphere

- Pinned diagram stage on `--surface`; reading column overlaid or beside it, asymmetric, generous negative space around the lit machine.
- **The context window is a stratified tank** (PRD §7) — the mediator in the agent↔LLM channel, not just two flow lines. Labeled token strata (system prompt, tool definitions, user prompt, tool outputs, responses) stack in a vessel against a finite `used / max` budget line; it fills as the inner loop runs, is handed to the model **whole** on every call, and **evicts the oldest content on overflow**. Strata are monochrome luminance steps so the flow accents stay reserved. Rendered compact in the hero's context-window stop and full-scale (a sticky tank scrolled past prose steps) in Chapter 7.
- Background depth: a faint blueprint dot-grid behind the stage (`--line` at low opacity) and a subtle full-page film-grain overlay — never flat fills. Glow on active strokes and token chips via `box-shadow`/`drop-shadow` with `--glow-*`.
- **"Go deeper" expanders** (PRD §8) styled as folded schematic cards on `--surface` with a `--line` hairline; closed by default so the main path reads clean for the least technical viewer.
- Illustrative-demo disclaimers (PRD §5.5, §8) set small in `--muted` `Spline Sans Mono`.

### Accessibility & degradation (PRD §11)

- `--paper` on `--ink` clears WCAG AA for body; the flow accents are decorative motion, never the sole carrier of meaning (always paired with a mono label or arrowhead).
- Honor `prefers-reduced-motion`: replace token particle flow and camera tweens with instant snaps to each framed state plus static directional arrows — the explanation must survive with zero animation.
- Static-first build (adapter-static): each camera stop maps to a real in-page anchor so the narrative is navigable without JS.
