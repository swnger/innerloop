## General

- Before starting a new dev server, check whether one is already running (usually on port 5173) to reuse.

## Project

- **The Inner Loop** is an internal, self-serve visual field guide explaining LLMs and coding agents to non-technical and semi-technical colleagues. Build accurate intuition, not a comprehensive ML course or marketing site. 
- Seven-chapter path: The outer + inner agentic loop (user interaction + tool calls, pseudo code) -&gt; tokenization -&gt; context window -&gt; next-token prediction (inference) -&gt; agent tool calling/inner loop -&gt; context engineering -&gt; harness engineering. 
- Design for the least technical reader first. Hook before abstraction; visuals/interactions carry the explanation
- Keep terms distinct: **context engineering** chooses what enters each model call; **harness engineering** is the surrounding loop, tools, retries, orchestration, and guardrails.
- Be accurate and plain-spoken. 

## Design Context

- See `PRODUCT.md` (impeccable). Register: **brand** (design IS the product). North star: **calm clarity / demystified** — least-technical reader first.
- Anti-refs: marketing/SaaS, generic dev-docs, childish, false precision. A11y: WCAG AA, motion-as-core (every animation needs a reduced-motion fallback that still teaches).

## Hosting / Stack

- Target hosting: GitHub Pages, so the app must build to static files.
- Use SvelteKit + TypeScript + adapter-static + GSAP
- Package manager: bun, build + test: Vite
- If publishing under `org.github.io/repo`, set Vite `base` to `/repo/`; use `/` for custom domains or root user/org sites.
- Use the agent-browser cli (`agent-browser --help`) for E2E verification

