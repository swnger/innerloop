## General

- Be extremely concise. Sacrifice grammar for the sake of concision.
- Before starting a new dev server, check whether one is already running (usually on port 5173) to reuse.

## Project

- **The Inner Loop** is an internal, self-serve visual field guide explaining LLMs and coding agents to non-technical and semi-technical colleagues. Build accurate intuition, not a comprehensive ML course or marketing site. 
- Seven-chapter path: cold-open agent demo -> tokenization -> next-token prediction -> context window -> agent tools/inner loop -> context engineering -> harness engineering. (Attention/temperature live in `Go deeper`, not their own chapter.)
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
