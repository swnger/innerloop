# Design Brief — Loop-spine navigation, v2 (shared 2D world)

> Intent of record from an `/impeccable shape` session. **v2 supersedes v1**,
> whose contradiction ("stations at coordinates" + "chunked pins / hand back to
> document flow") produced vertically stacked stations with isolated,
> misaligned transition vignettes. A first build attempt exists on
> `refactor/flow` — mine it, don't preserve it (see §9).
> Stack constraints live in `CLAUDE.md` (SvelteKit + TS + adapter-static,
> **GSAP only**, bun, Vite, GitHub Pages static). Reuse the dev server on 5173.
> Read `DESIGN.md`'s Motion section before starting.

## 1. Summary

One continuous **loop-spine**: all five station stages live at real 2D
coordinates on one shared world canvas, and a single pinned camera travels the
agent loop — right, right, right, down, left, left, left — between and
*through* them. Alignment is solved by construction: route, arrows, stations,
and shared objects share one coordinate space, so there is nothing to
misalign. Each station teaches exactly one concept, self-contained; connective
narrative lives in the transitions. The full assembled loop is revealed only
at the end, by a camera zoom-out — the "oh, that's all it is" payoff. Scoped
to the 5 existing chapters; ch.6–7 stay deferred.

## 2. Primary user action

Scroll — ordinary vertical wheel/trackpad/touch, **never** sideways-only
input. Scroll scrubs the camera along the path; lateral legs *feel* horizontal
because the camera moves sideways, not the input. Within a station the camera
travels vertically down that station's column at 1:1 scroll speed, so reading
feels like normal scrolling.

## 3. Decisions locked

| Topic | Decision |
|---|---|
| Register / identity | brand, unchanged — inherits `DESIGN.md` fully (BMW daylight/night, Hanken Grotesk, concept hues, M-tricolor). No re-skin. |
| World model | **Shared 2D world.** Stations at real coordinates on one canvas; one master pin for the whole journey; camera = transform-only polyline scrub. Supersedes v1's chunked pins + document-flow handoff. |
| Station structure | Self-contained. Each station explains exactly one concept fully. Concepts debut **only** at their own stations — station 1 shows no context/model visuals. Neighbors sit outside the camera frame; route legs are revealed as traveled. |
| Connective tissue | World-space transition beats: the **real departing DOM element** Flip-morphs along the actual route leg and lands pixel-aligned on the arriving station's opener, paired with one bridging caption. No private per-vignette coordinate systems. |
| Station 1 (Hero) | Code panel teaching **both loops** — the outer user-input `while` loop and the inner tool-calling `while` loop — with the live beat being "fix the broken test" **typed into the input**. Nothing else on stage. |
| Node depth | Existing long-form internal narratives kept in substance; their ScrollTriggers convert to `containerAnimation`/timeline segments (see §4). |
| Visible route | One world-level M-tricolor SVG spine connecting real station anchors — extend Hero's existing flow-path beziers to world scale. |
| Lap close | Camera **zooms out** over the traveled world — whole loop visible, all stations lit — settling into the fully-detailed auto-looping diagram, then footer. Supersedes v1's "second Hero instance". |
| Build scope | 5 existing chapters. Ch.6–7 deferred. |
| Fidelity | Production-ready. Live shipped page, not a spike. |

## 4. Mechanism

- **Base DOM stays the vertical stack** (reading order, keyboard, screen
  reader, fallback). An enhancement layer — applied only when motion +
  viewport allow — transforms each station to its world position and pins one
  full-viewport camera wrapper for the entire journey.
- **Master scrub:** scroll → camera polyline: down through station 1 → right
  to station 2 → down through it → … following the loop compass. Vertical
  legs at 1:1 scroll ratio (asserted — reading speed unchanged).
- **Station internals:** existing ScrollTriggers inside Tokenization /
  Inference / ToolCalling convert to `containerAnimation`-driven triggers or
  flat timeline segments. ⚠️ **Biggest risk:** `containerAnimation` does not
  support nested pins — any internal pin becomes a scrubbed-in-place beat.
  Convert one station at a time.
- **Camera scale** constant during travel; only the recap zooms out, plus a
  modest zoom on the Tokenization → Inference "down into the model" beat
  (asserted).
- **Perf:** transform-only camera, `will-change` on the world, off-screen
  stations culled via `autoAlpha`.
- **Deep links** (`#inference`, …): hash → progress value on the master scrub.
- **Mini-map** replaces the "Chapter n/07" kicker; reads camera progress from
  `loop.svelte.ts`.

**Station sequence (confirmed lap):**

1. **Agent / cold open** (`Hero.svelte`) — two-loop code panel, "fix the
   broken test" typed in. No context/model visuals.
2. **Context Window** — first visit, full depth; strata taught once, here.
3. **Tokenization** — text becomes tokens entering the model.
4. **Inference** — reads → weighs → predicts; this station *is* "the LLM"
   (no separate LLM stop; the transition out of Tokenization introduces it).
5. **Context Window, revisit** — compact beat: response/tool-call appended
   via the existing band-fill animation, not a full replay.
6. **Tool Calling** — the agent runs the tool, loops back.
7. **Repeat once** — right to Inference (model re-called with updated
   context), left to Context Window for the final answer.
8. **Lap close / recap** — camera zoom-out, whole lit loop, detailed diagram
   resumes its auto-loop, hand-off to footer.

## 5. Fallbacks (unchanged from v1)

- **Reduced motion** — base vertical stack; mini-map as static path summary;
  static "carried from →" connectors. No pinned-camera work under
  `prefers-reduced-motion: reduce`.
- **Touch-primary pointer OR viewport <768px** — same vertical-stack fallback.
- **Keyboard / screen reader** — DOM order = sane linear reading order
  regardless of camera path (guaranteed by the base-stack architecture).

## 6. Build sequence

1. **World layout:** station coordinates, master pin, camera polyline —
   verified with placeholder blocks before touching content.
2. **Rebuild station-1 Hero** (two-loop code panel + typed input).
3. **Convert station internals** station-by-station: ContextWindow →
   Tokenization → Inference → ToolCalling.
4. **World-space transition beats** + bridging captions.
5. **Context revisit beat + repeat lap.**
6. **Recap zoom-out** + detailed diagram + footer handoff.
7. **Fallbacks, deep links, mini-map.**
8. **Verify with `agent-browser`:** desktop + mobile, reduced-motion,
   keyboard, hash deep-links, AA contrast on transition captions,
   `svelte-check` clean, `vite build` → static `build/` OK.

## 7. Asserted defaults (override if needed)

- Vertical camera legs run at 1:1 scroll ratio.
- Constant camera scale during travel; zoom only at recap + the
  Tokenization→Inference beat.
- Lap close hands off to the existing quiet footer; no ch.6–7 tease.

## 8. Useful impeccable references during build

`animate.md` (core) · `layout.md` (2D world composition) ·
`interaction-design.md` (scroll-driven patterns) · `adapt.md`
(mobile/reduced-motion fallback).

## 9. Salvage from the v1 attempt (`refactor/flow` working tree)

- `loop.svelte.ts` — station state + capability gate: keep as the camera
  progress store.
- `LoopTransition.svelte` — keep the bridging captions and shared-object
  copy; **drop** its private SVG coordinate systems entirely.
- `ContextRevisit.svelte` — beat concept and band-fill reuse are right;
  re-anchor into world space.
- `LoopRecap.svelte` — becomes the zoom-out destination's detailed diagram;
  no longer a second free-standing instance.
- Slimmed `Hero.svelte` — replaced by the two-loop code-panel station (§3).
