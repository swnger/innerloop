# Product

## Register

brand

## Users

Internal, non-technical and semi-technical colleagues — PMs, designers, ops, leadership, junior engineers — who hear "LLM," "token," "context window," "agent," and "harness" every day but lack an accurate mental model of them. They arrive curious yet often a little intimidated, and they read **self-serve**: no presenter, no live walkthrough, on their own time and at their own pace. The job to be done is to build *accurate intuition fast* — to leave each chapter with a correct, plain mental model they can reuse in conversations and decisions. They do not want, and will not finish, a comprehensive ML course.

## Product Purpose

The Inner Loop is a self-serve, scroll-driven visual field guide explaining how LLMs and coding agents actually work. A seven-chapter narrative — the outer + inner agentic loop (user interaction + tool calls, pseudo code) -&gt; tokenization -&gt; context window -&gt; next-token prediction (inference) -&gt; agent tool calling/inner loop -&gt; context engineering -&gt; harness engineering — replaces jargon with interactive, illustrative demos.

Success looks like a non-technical reader finishing a chapter and thinking *"oh — that's all it is."* The fog lifts; an intimidating term collapses into a simple, correct model. It is explicitly **not** a course, not a marketing site, and not reference documentation.

## Brand Personality

Calm, lucid, expert. Three words: **clear, precise, unhurried.** The voice is plain-spoken and accurate — confident enough to simplify without dumbing down and without hype. The emotional goal is **demystification**: the reader feels the fog lift and the jargon resolve into a mental model they can hold. The instrument-grade "precision observatory" aesthetic (dark glass, mineral chrome, one electric-blue accent) is the *vehicle* that earns trust — but the felt outcome is calm clarity, never intimidation or spectacle.

## Anti-references

- **The current shipped aesthetic is itself a failure to depart from.** The dark "precision observatory" identity now on screen (near-black ground, electric-blue glow, blueprint grid, film grain, monospace eyebrows) reads as AI-generated and performs *technical intimidation* — the opposite of the calm-clarity north star for a non-technical reader. Treat the live surface as the thing to move away from, not the identity to preserve. Departure mode is the default for visual work until a new direction is chosen.
- **Marketing / SaaS landing pages.** No hype copy, no gradient-text, no hero-metric templates, no persuasion architecture. It explains; it never sells.
- **Generic dev-docs.** No sidebar-plus-endless-API-reference, no flat utilitarian shell. This is a guided narrative, not reference material to look things up in.
- **Childish / cartoonish edutainment.** No mascots, no bright primary-color over-simplification that would undercut credibility with a technically literate audience.
- **False precision.** Don't imply exactness the simplification doesn't have, and never imply the model remembers between calls. Label illustrative demos as illustrative.

## Design Principles

1. **Least-technical reader first.** Design for the person with the weakest model; everyone above them is carried along too.
2. **Hook before abstraction.** Open each chapter with something concrete and alive. Earn the concept before naming it
3. **Show, don't tell.** Visuals and interactions carry the explanation
4. **Accurate by default.** Plain-spoken, no hype, no false precision. Keep the two terms distinct: *context engineering* chooses what enters each model call; *harness engineering* is the surrounding loop, tools, retries, orchestration, and guardrails.
5. **Motion teaches.** Animation is part of the explanation — the inner loop literally loops — not decoration. Every motion must still read with motion disabled.

## Accessibility &amp; Inclusion

Target **WCAG AA**: ≥4.5:1 for body text and ≥3:1 for large text across the dark palette, including the muted/faint grays and placeholder text. Keyboard-navigable with a visible focus ring (already present via `:focus-visible`). Never rely on color alone — the context-window strata pair each category hue with a text label.

**Motion is core to the teaching, not garnish.** Every animation must ship a `prefers-reduced-motion: reduce` alternative that *preserves the explanation* — a static end-state, a crossfade, or a steppable view — rather than simply removing it and leaving the concept untaught.