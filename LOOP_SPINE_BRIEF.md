# Design Brief — Loop-spine navigation (handoff)

> Planning artifact from an `/impeccable shape` session. **Not implemented —**
> this is intent of record for a future build session. Depends on the visual
> re-skin in `DESIGN_BRIEF.md` (shipped) and completes two items that brief's
> §10 flagged as deferred: the persistent loop mini-map and the generalized
> GSAP `Flip` hand-off / `ScrollTrigger` orchestration layer.
> Stack constraints live in `CLAUDE.md` (SvelteKit + TS + adapter-static, **GSAP
> only**, bun, build via Vite, GitHub Pages static). Reuse the dev server on
> 5173. Read `DESIGN.md`'s Motion section before starting — this brief is that
> section's "connective through-line" spec, finally being built.

## 1. Summary

Replace the site's five independent vertical chapters with one continuous
**loop-spine**: scrolling becomes the literal path data takes through the agent
loop — right, right, right, down, left, left, left, down, repeating — instead
of a simple top-to-bottom stack. Each station teaches exactly one concept,
fully and self-contained; the connective narrative and object hand-offs live
in the *transition* between stations, so understanding builds progressively.
The full assembled loop is only revealed at the very end, as a synthesized
recap — the "oh, that's all it is" payoff `PRODUCT.md` defines as success.
Scoped to the 5 chapters that exist today; chapters 6–7 (context engineering,
harness engineering) stay deferred, as in `DESIGN_BRIEF.md` §5/§10.

## 2. Primary user action

Scroll — ordinary vertical wheel/trackpad/touch, **never** sideways-only input
— to travel the loop. Within a station, keep scrolling to read its
self-contained explanation. At each boundary, a short transition beat carries
a shared object and a bridging caption toward the next station before it
begins.

## 3. Decisions locked in this session

| Topic | Decision |
|---|---|
| Register / identity | brand, unchanged — inherits `DESIGN.md` fully (BMW daylight/night, Hanken Grotesk, concept hues, M-tricolor). No re-skin work here. |
| Mechanism | Pinned-camera path: GSAP `ScrollTrigger` pin + `Flip`. Vertical scroll input only — never horizontal-scroll-jacking (fights trackpad/touch conventions, especially on mobile). |
| Station structure | **Self-contained.** Each station explains exactly one concept fully. No unexplained preview/placeholder content sits in view while another concept is being taught. |
| Connective tissue | Lives **at transitions only** — a shared object (token/chip/code line) travels or Flip-morphs toward the next station's position, paired with a short caption that hints or names what's coming. |
| Node depth | Existing long-form internal scroll narratives are kept as-is. Tokenization, Inference, and Tool Calling keep their current depth (~8,000 lines of built content/motion combined) — the loop is macro-navigation *between* stations, not a rewrite of what's inside them. |
| Visible route | The M-tricolor path is drawn **literally** — reuse and extend Hero's existing flow-path beziers (`input-path`, `send-path`, `tool-path`, `return-path-1`, `return-path-2`) to reach the new station positions, rather than building a new overlay. |
| Opener adaptation | Tokenization / Inference / Tool Calling's current scroll-into-view fade-in openers get adapted so arriving via camera-pan reads as an arrival, not a re-triggered reveal. |
| Lap close | The lap reassembles into Hero's current fully-detailed diagram — relocated from opener to finale — which resumes its auto-loop as a recap, then hands off to the footer. |
| Build scope | The spine across the 5 existing chapters only. Ch.6–7 stay deferred per `DESIGN_BRIEF.md` §5/§10. |
| Fidelity | Production-ready. This is a live shipped page, not a spike. |

## 4. The mechanism

**Two nested scroll grammars.** *Macro* travel between stations is a pinned,
`ScrollTrigger`-scrubbed camera pan (or `Flip` zoom, see below) along the
visible route. *Micro* reading within a station is that chapter's existing
normal in-flow scroll narrative. Arriving at a station's coordinates un-pins
the macro camera and hands off to normal document flow; reaching the end of
the station's content re-pins and resumes macro travel to the next stop.

**Pans vs. zooms.** Lateral moves at the same "zoom level" (Agent → Context
Window, Context Window → Tool Calling) are camera **pans**. Moves that reveal
internal detail — the user's "down" beats (LLM → Inference) — are **zoom /
`Flip` morphs**: a compact element from the parent station literally becomes
the child station's opening composition. This is `DESIGN.md`'s own line,
previously unbuilt: *"shared objects persist and morph across each boundary."*

**Station sequence (confirmed lap):**

1. **Agent / cold open** (`Hero.svelte`) — self-contained hook. Keeps its code
   panel (`turn()` loop) essentially as-is; the concepts it names ("context,"
   "the model") stay black-boxed here, not detailed.
2. **Context Window** — first visit, full `ContextWindow.svelte` depth. The
   strata concept is taught once, here.
3. **Tokenization** — self-contained: text becomes tokens entering the model.
4. **Inference** — self-contained: reads → weighs → predicts. This station
   *is* "the LLM in action" — there is no separate LLM component, so the
   user's "arrive at the LLM, then down to inference" beat is one continuous
   station, introduced by the transition out of Tokenization, not a 4th
   distinct content stop. (Asserted judgment call — see §7.)
5. **Context Window, revisit** — compact beat only. Reuses Hero's existing
   `STRATA` band-fill animation (`scaleY 0→1` on `.band-toolcall` /
   `.band-toolout` / `.band-answer`) to show the response/tool-call appended.
   Not a replay of station 2's full narrative.
6. **Tool Calling** — self-contained: the agent runs the tool, loops back.
7. **Repeat once** — right to Inference again (the model is re-called with the
   updated context), left to Context Window for the final answer — mirroring
   Hero's existing two-`forwardPass` timeline (`"read"` then `"Fixed"`).
8. **Lap close / recap** — everything reassembles into Hero's current
   fully-detailed diagram (relocated here from the opener), which resumes its
   auto-loop as the synthesizing "here's the whole cycle" payoff, then hands
   off to the footer.

**Requirements carried through every station:**

- **Reduced motion** — full fallback to today's vertical stacked reading
  order; the mini-map renders as a static path summary. No pinned-camera work
  runs under `prefers-reduced-motion: reduce`.
- **Small viewport / coarse pointer** — same fallback as reduced motion:
  vertical stack, no pinned 2D camera. Consistent with `DESIGN.md`'s existing
  "reflow to vertical stack on mobile" policy, generalized from diagrams to
  the whole nav.
- **Keyboard / screen reader** — DOM order must match a sane linear reading
  order regardless of visual camera path.
- **Deep links** (`#inference`, etc.) — must snap the camera to that station's
  position, not just scroll to a Y offset.
- **Chunked pins** — avoid one page-spanning pin; pin per station so
  `ScrollTrigger` start/end math stays sane against each chapter's own
  variable content height.
- **Header** — the "Chapter n/07" kicker in `+page.svelte` is replaced by the
  loop mini-map (see `DESIGN_BRIEF.md` §10 — previously deferred, this brief
  is where it finally gets built). A static counter would misrepresent a path
  that revisits nodes.

## 5. Station mapping (existing → loop position)

| Order | Component | Role on the path |
|---|---|---|
| 1 (start) | `Hero.svelte` | Cold open, self-contained. Its current fully-detailed diagram is extracted to become the finale/recap — station 1 needs new, leaner content that keeps the code panel but drops the detailed context/LLM internals. |
| 2 | `ContextWindow.svelte` | First full station — strata, taught once. |
| 3 | `Tokenization.svelte` | Text → tokens, entering the model. |
| 4 | `Inference.svelte` | Reads / weighs / predicts — "the LLM," self-contained. |
| 5 (revisit) | `ContextWindow.svelte` (compact beat) | Response/tool-call appended — existing band-fill animation, not a full replay. |
| 6 | `ToolCalling.svelte` | Runs the tool, loops back. |
| repeat | `Inference.svelte` → `ContextWindow.svelte` | Second forward pass, final answer appended — mirrors Hero's existing timeline. |
| close | Hero's diagram, relocated | Full lap reassembles into the fully-detailed auto-looping diagram, then footer. |
| deferred | — | Ch.6–7 (context engineering, harness engineering) — not built, out of scope here. |

## 6. Build sequence (recommended)

1. **Shared layer first:** persistent loop mini-map component; generalized
   GSAP `Flip` hand-off + `ScrollTrigger` orchestration util; reduced-motion
   guard. (Both flagged "not built" in `DESIGN_BRIEF.md` §10 — this is where
   they get built for real.)
2. **Split Hero:** extract its current fully-detailed diagram to become the
   lap-close recap; build new, leaner station-1 content (code panel kept,
   context/LLM internals dropped).
3. **Wire the pinned-camera macro path** across the stations in §5, chunked
   per-station.
4. **Build the transition/handoff beats** at each boundary (~7–8 total):
   shared object travel/`Flip` + one bridging caption per transition.
5. **Adapt existing openers** (Tokenization, Inference, Tool Calling) to read
   as arrivals rather than scroll-into-view reveals.
6. **Build the lap-close/recap sequence** reusing Hero's relocated diagram;
   wire the auto-loop resume and hand-off to the footer.
7. **Reduced-motion + mobile/touch fallback:** verify the vertical-stack
   fallback (today's current experience) still teaches completely on its own.
8. **Rearchitect `+page.svelte`:** replace the `IntersectionObserver`/hash
   "Chapter n/07" logic with the mini-map; verify `#hash` deep-links snap to
   pinned positions correctly.
9. **Verify with `agent-browser`:** desktop + mobile, reduced-motion, keyboard
   nav, hash deep-links, AA contrast on new transition captions,
   `svelte-check` clean, `vite build` → static `build/` OK.

## 7. Open questions (asserted defaults — override if needed)

- **LLM has no dedicated component** — its "arrival" is folded into
  `Inference.svelte`'s opening beat rather than a separate content station.
  Override if you want the LLM to get its own distinct pause before Inference.
- **Lap close hands off to the existing quiet footer**, no forward-reference
  to ch.6–7. Nothing in `PRODUCT.md` asks to tease unbuilt chapters. Override
  if you want a "coming soon" cue.
- **Hero's relocated recap diagram** defaults to a second instance visually
  matched to station 1 and connected via `Flip` only at the two journey
  boundaries (start, close) — not one literal DOM node kept mounted across the
  entire scroll distance. Revisit if performance testing says otherwise.
- **Mobile/touch fallback threshold** defaults to any touch-primary pointer OR
  viewport `<768px`, matching `DESIGN.md`'s existing diagram-reflow policy
  generalized to the whole nav.

## 8. Useful impeccable references during build

`animate.md` (core — this is a choreography build) · `layout.md` (2D map
composition) · `interaction-design.md` (scroll-driven interaction patterns) ·
`adapt.md` (mobile/reduced-motion fallback).
