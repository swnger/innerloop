# Chapter 05 — Tool calling ("the hands")

## Context

The site (`The Inner Loop`) reveals the nested machine inside one agent turn. Chapters 1–4 ship:
cold-open agent loop → tokenization → next-token prediction → context window. The seven-chapter
spine (CLAUDE.md) puts **agent tools / the inner loop at Chapter 05**, right after the context
window. It does not exist yet.

This chapter answers one question for a non-technical reader: **"How can an LLM call tools on my
machine if it can only output text?"** The honest answer — the model *never* touches your machine.
It only ever emits tokens. When it "calls a tool" it just produces text in an agreed-upon shape
(a JSON-schema-shaped blob); the **agent/harness** parses that text, runs the real function, and
feeds the result back as more text. We make that boundary visible, then scale it up to MCP and the
cost it imposes on the context window.

The groundwork is already laid: the Hero's agent code (`src/lib/components/Hero.svelte:54-63`)
literally contains `out = run_tool(response.tool_call)` and `if not response.has_tool_call`, and its
tank has `tool definitions` / `model response · tool call` / `tool output` bands. Ch.5 zooms into
exactly that moment.

## Requirements → coverage

| User ask | Where it lands |
|---|---|
| JSON schema approach to tool calls | Centerpiece beat 1 (the "menu") + a schema card |
| Example flow: agent ⇄ LLM tool-call exchange, step by step | Centerpiece, reader-stepped (6 beats) |
| MCP: how it registers tools | MCP section, step 2 (`tools/list` → schemas register) |
| MCP context-window caution | MCP section, steps 3–4 (tool-defs band balloons, re-sent every call) |
| Transition animation into the chapter | FLIP handoff from the Ch.4 tank (confirmed choice) |
| GSAP-heavy, max visual, not too scroll-heavy | Reader-stepped (confirmed) via IntersectionObserver discrete states, short handoff scrub |

## Decisions (confirmed with user)

- **Centerpiece = reader-stepped.** Use the `ContextWindow` idiom: a **sticky SVG stage + a short
  column of prose beats**, each beat activated by IntersectionObserver with **discrete GSAP state
  morphs** (not scrubbed). Reader-paced, minimal scroll. Token chips travel on motion-paths
  (signature effect).
- **Transition = cinematic handoff from the Ch.4 tank.** Replicate the Ch.1→Ch.2 FLIP
  (`Tokenization.svelte:156-289`): a brief pinned, scrubbed intro at the top of Ch.5 that picks up
  the tank's warm **`model response`** band and morphs it into Ch.5's tool-call JSON blob as the
  title resolves. Keep the scrub short (`end: '+=100%'`) to respect "not too scroll-heavy."

## Approach

### 1. New component + wiring
- Create `src/lib/components/ToolCalling.svelte`. Section root:
  `<section id="tools" class="tc" data-chapter="05" bind:this={rootEl} aria-labelledby="tc-title">`.
  Class prefix `tc-`. Chapter tracking is automatic (the `[data-chapter]` IntersectionObserver in
  `+page.svelte:24`; header already reads `/07`).
- Wire into `src/routes/+page.svelte`: import alongside the others (`:7`) and render **after
  `<ContextWindow />`** (`:55`).
- Load GSAP dynamically in `onMount` (match existing pattern): `gsap` + `ScrollTrigger` (handoff) +
  `MotionPathPlugin` (chips). See `Inference.svelte:417-426`.
- Add a tiny anchor `id="context"` to the Ch.4 section (`ContextWindow.svelte:259`) so the handoff can
  target it reliably (`.ctx` also works; prefer an explicit id).

### 2. Transition-in — FLIP handoff from the Ch.4 tank
Model on `Tokenization.svelte:156-289` (`measureSourceTransforms` → `fromTo` per-element start
transform → scrub → fade old stage, draw new frame; `invalidateOnRefresh` + `onRefreshInit`
re-measure for robustness).
- **Source:** the warm model-response band in Ch.4's settled final step:
  `document.querySelector('#context [data-band="response3"] .band-body')` (rendered by
  `ContextWindow.svelte:296-319`). Ch.4's last step is active by the time Ch.5 enters, so the band
  exists/on-screen (its sticky tank sits at `top:8vh`).
- **Target:** a Ch.5 element — the warm "tool call" chip that unfolds into the JSON blob.
- **Mechanism:** pin a `.tc-handoff` stage at Ch.5 top (`scrub:1, end:'+=100%', anticipatePin:1,
  invalidateOnRefresh:true`). On enter, measure source vs. target rect (offset + scale), set the
  chip's start transform to the source (FLIP), then scrub it to rest while: the JSON blob unfolds
  out of the chip, the panel chrome draws in, and the eyebrow/title resolve.
- **Fallback (defensive, like Tokenization's `if (!source)`):** if the source rect is missing/off
  screen, start the chip from top-center of the Ch.5 stage so the intro still plays.
- `:global(html.no-js)` reveals the Ch.5 intro statically (per `ContextWindow.svelte:522`).

### 3. Centerpiece — the exchange, reader-stepped
Sticky SVG stage (idiom: `ContextWindow.svelte:137-256, 269-352`). Three nodes:
**AGENT** (left) ⇄ **LLM** (right), plus a **`YOUR MACHINE`** box (shell / files / network) wired to
the agent, and a **dashed boundary line** between the model and the machine. Persistent caption:
*"The model only ever emits tokens. Everything that touches your machine is the agent."*

Beats (each = a short `.tc-step`; IntersectionObserver sets `activeStep`; a per-step GSAP timeline
morphs the stage to discrete states — pattern from `activateStep` in `ContextWindow.svelte:137-227`;
chips fly on motion-paths via the `motionPath` helper from `Hero.svelte:240-246, 281-446`):

1. **The menu.** Tool definitions = JSON schemas, riding in the context. Show a schema card and send
   context → LLM (cool chips travel right). Schema card (mono):
   `{ "name": "run_shell", "description": "Run a shell command, return its output",
   "parameters": { "type":"object", "properties": { "command": { "type":"string" } },
   "required": ["command"] } }`
2. **The model emits a tool call — just text.** Warm chips travel left, assembling
   `{ "tool": "run_shell", "arguments": { "command": "pytest -q" } }`. Scanner highlight: *the model
   produced text; it ran nothing.* (continues the site's "fix the failing test" thread).
3. **The agent parses + validates** the JSON against the schema (highlight pass on the blob).
4. **The agent — not the model — runs it on YOUR MACHINE.** Machine box lights; boundary line flares:
   *"the model never crosses this line."* This is the visual answer to the chapter's question.
5. **Result appended as text, sent back** (cool: tool result → LLM).
6. **This time: a plain answer, no tool call** → returned to the user (warm: answer → user); ties to
   the Hero's `if not response.has_tool_call: return` loop exit.

### 4. MCP — scaling the menu, and its cost
Reuse the Ch.4 **tank** visual language (gauge, `max` line, fixed/dynamic brackets, category-hue
strata: `ContextWindow.svelte:282-348`). Sticky tank + 3–4 short reader-stepped beats:
1. **Without MCP:** tools are hand-wired into the agent one by one.
2. **MCP is a standard.** External servers (e.g. GitHub, Postgres, Filesystem, Gmail) each advertise
   a tool list (name + description + JSON schema). On connect the agent calls `tools/list`; those
   schemas **register into the tool-definitions stratum**.
3. **Every schema rides in the window.** The tool-definitions band is **fixed** and **re-sent on
   every model call** (callback to Ch.4). Animate the violet band **growing** as servers connect.
4. **The caution.** Many servers → the band balloons → thousands of tokens spent before any real
   work, pushing toward `max` (warm overflow flash, echoing `ContextWindow.svelte:284,292-293`), and
   a longer menu makes the model likelier to pick the **wrong** tool. Takeaway: *connect
   deliberately; prune what you don't use.*

### 5. Close / bridge to Ch.6
One outro line (reveal-on-enter, `Inference.svelte:757-764`): *the model only emits text; the harness
turns some of it into actions and feeds results back — so the real lever is what you put in front of
it: context engineering* (sets up Ch.6).

### 6. Go deeper expanders (closed; reuse `<details class="deeper">`, `Inference.svelte:1162`)
- **"how the harness actually spots a tool call"** — native tool-use/function-calling: providers
  surface it as a structured `tool_use` block (not literal prose JSON); the model emits special
  tokens the provider parses; stop reasons; parallel tool calls. Adds precision behind the
  simplified on-screen JSON.
- **"MCP beyond tools"** — resources & prompts; transports (stdio / HTTP); the `tools/list` +
  `tools/call` round-trip.

### 7. Accuracy & degradation (CLAUDE.md)
- Disclaimer line (mono `.disclaimer`): JSON shapes and token counts are illustrative; real APIs
  present tool calls as structured `tool_use` blocks; the behaviors (text-only model, the harness
  executes, schemas re-sent every call) are real.
- Verify the tool-use / MCP framing against the **`claude-api` skill** during implementation (its
  trigger covers tool-definition/MCP topics) before finalizing copy.
- Provide `:global(html.no-js)` static fallbacks for every stepped/handoff block.

## Design system reuse (no new tokens)
Palette/idioms already in `app.css` + CLAUDE.md: brand blue = chrome only; **cool = context→model**,
**warm = model→agent** (chips/arrows only); category hues for strata (`--cat-tools` violet for tool
defs); panel idiom (`border-top:2px solid var(--brand)`, `--panel-gradient`, `--panel-shadow`);
`Instrument Serif` titles, `Newsreader` prose ≤62ch, `Spline Sans Mono` for all tokens/labels/JSON;
`.eyebrow`/`.disclaimer`/`.mono`; seam divider (`Inference.svelte:777-783`).

## Files
- **Create:** `src/lib/components/ToolCalling.svelte` (the chapter).
- **Modify:** `src/routes/+page.svelte` (import + render after `ContextWindow`).
- **Modify (1 line):** `src/lib/components/ContextWindow.svelte` (add `id="context"` to the section
  for a stable handoff target).

## Verification
- Reuse the running dev server on **:5173** (start `bun run dev` only if none).
- `bun run check` (svelte-check) clean.
- E2E with **agent-browser CLI** (`agent-browser --help`): load `/`, scroll to Ch.5 and confirm:
  (a) the handoff morphs the Ch.4 warm band into the Ch.5 tool-call blob and the title resolves;
  (b) the six centerpiece beats advance on scroll with chips traveling cool→right / warm→left and
  the `YOUR MACHINE` boundary flaring on the "run" beat; (c) the MCP tank's tool-defs band grows and
  flashes overflow at `max`; (d) `Go deeper` expanders open; (e) chapter readout shows `05/07`.
- No-JS: disable JS (or `html.no-js`) and confirm all prose/visual fallbacks read top-to-bottom.
- Sanity-check at narrow width (≤760px): grids collapse to one column (`ContextWindow.svelte:501`).
- `bun run build` succeeds (adapter-static, no prerender errors).

## Risks / watch-items
- **Cross-component FLIP is the delicate piece** (as in Ch.1→Ch.2). Must handle refresh/resize
  (`invalidateOnRefresh`, re-measure) and a missing source (fallback start). Verify in-browser.
- Keep total scroll modest: short handoff scrub (`+=100%`) + ~6 compact centerpiece beats + ~4 MCP
  beats. If it feels long, merge MCP beats 1–2.
- Don't overload any single view; fade non-active detail to `--faint`/hidden (CLAUDE.md motion).
