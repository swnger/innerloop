# The Inner Loop v2 — "The Page Becomes the Loop" Rewrite

## Context

The current site is a vertically scrolling page of five ~500–2,700-line chapter components that are deeply coupled: Tokenization pins Hero's DOM and pauses its timeline by global id; ToolCalling clones ContextWindow's SVG into a `position:fixed` body overlay with hardcoded progress thresholds; GSAP setup, theme-color literals, and step-observer logic are copy-pasted per file; reduced-motion coverage is near zero. Changes routinely break neighboring chapters (overlapping pins, refresh ordering).

**Goal:** a ground-up rewrite where the page *becomes* the agentic loop — the reader travels with the prompt/tokens through full-viewport **stations** (one per chapter), and the travel itself traces the loop: the camera moves right/down/left/up around a 2D circuit, so scrolling between stations physically follows the loop's geometry. Signature transitions fly real content out of one station into the next. Co-equal goal: maintainability — self-contained chapters, one orchestration layer, shared utilities.

**User decisions (fixed):**
- Navigation: **scroll-scrubbed stations** — native vertical scroll is the input; each station's internal timeline is scrubbed while the camera is parked; between stations the camera travels along the loop circuit (horizontal or vertical in world space, per segment).
- **The layout IS the loop:** stations are laid out in 2D world space along a rectangular circuit; inter-station movement direction reflects the position on the agent loop; the journey ends by returning to the start (the loop closes).
- Chapters 06 (context engineering) / 07 (harness engineering): **stubs** proving the contract; content later.
- **Fresh content pass** per chapter (reuse concepts, `tokenizer.ts`, design tokens); old components move to `src/lib/legacy/` for reference (imported by nothing → tree-shaken out).
- Design system (DESIGN.md, `app.css` OKLCH tokens, `theme.svelte.ts`) stays.
- Naming: descriptive contract names — `StationTransition`, not "SeamSpec".

Station order follows AGENTS.md: **01 agent loop → 02 tokenization → 03 context window → 04 inference → 05 tool calling → 06 context engineering → 07 harness engineering.** (This swaps the current page's inference/context-window order — intentional; it's what makes the transition narrative compose.)

## Core concept

One full-viewport **world viewport** is pinned for the entire journey (the only pin on the page). Inside it, a `world` element holds all seven stations absolutely positioned along a rectangular **loop circuit**. Native vertical scroll scrubs one master timeline that alternates:

- **Station segments** — camera parked on a station while that station's internal timeline plays (beats, plateaus for interactive demos).
- **Transition segments** — the camera tweens to the next station (right / down / left / up per the manifest) while a **traveler** (prompt card, token chips, context band, response card) flies from the outgoing station's **port** to the incoming one's. A traveler is one DOM element for the whole page lifetime — never cloned.

Default circuit (directions live in the manifest, trivially adjustable):

```
01 ──right──▶ 02 ──right──▶ 03
                             │ down
07 ◀──left── 06 ◀──left── 05 ◀─(04)   04 sits on the right edge
 │ up                                  05 below it, then leftward home
 └────────▶ back to 01 (finale — the loop closes)
```

The persistent LoopMap mini-map is a literal scaled-down map of this world with a camera marker — the page and its map share one geometry.

## Architecture

### File structure

```
src/routes/+page.svelte              # thin: <Journey /> only
src/lib/
  motion/
    gsap.ts        # THE single GSAP import/register/config (ScrollTrigger, Flip, MotionPath)
    tokens.ts      # DUR / EASE / STAGGER motion tokens (quart/expo out; no bounce)
    colors.ts      # theme-aware color resolution for tweens
  journey/
    types.ts             # StationMeta, StationHandle, StationTransition, ports, travelers
    Journey.svelte       # shell: header, LoopMap, world viewport, TravelerLayer, bootstrap
    Station.svelte       # generic scene wrapper (world-positioned or in-flow) + a11y landmark
    orchestrator.ts      # ONLY ScrollTrigger/pin owner; master timeline; camera; matchMedia branches
    layout.ts            # circuit geometry: direction vectors → world positions, segment map
    journey.svelte.ts    # $state: activeStation, progress, register()
    stations.manifest.ts # ordered list: meta + component + transition module + direction
    LoopMap.svelte       # persistent loop mini-map = scaled world map + camera marker
    travelers/
      TravelerLayer.svelte, layer.ts   # adopt/deposit/placeFor (world-space)
      PromptCard.svelte, TokenChip.svelte, ContextBand.svelte, ResponseCard.svelte
    transitions/
      index.ts, t12-prompt-to-tokens.ts, t23…, t34…, t45…, t56…, t67…, t71-loop-close.ts
  stations/
    s01-agent-loop/ … s07-harness-engineering/   # one folder per station (+ TokenLab, GuessMachine)
  components/      # StationHead, DiagramPanel, Legend, GoDeeper, TransitionCaption, ThemeToggle
  legacy/          # old 5 chapter components, unreferenced
  tokenizer.ts, theme.svelte.ts       # kept as-is
docs/plans/v2-rewrite.md             # this plan, committed
```

### Station contract (`journey/types.ts`)

```ts
interface StationMeta { id: string; number: 1..7; title: string;
  loopNode: 'user'|'context'|'llm'|'tool'|'harness'; accent: ConceptHue;
  lengthVh: number /* scroll distance of the parked segment, e.g. 350 */ }

interface StationContext { gsap; root: HTMLElement; reduced: boolean;
  mobile: boolean; color: (token: string) => string }

interface StationHandle {
  meta: StationMeta; sceneEl: HTMLElement;
  ports: Partial<Record<PortName, () => Element | null>>;  // lazy dock getters
  build(ctx: StationContext): gsap.core.Timeline;  // paused timeline, nested into master
  applyStatic(ctx): void;   // reduced-motion end-state (default: SSR HTML is it)
  onDock?/onUndock?(traveler, port)
}
```

Rules (the maintainability guarantees):
- Stations query DOM **only under `ctx.root`** — no `document.querySelector` in `src/lib/stations/**`.
- Stations never create ScrollTriggers, never pin, never import gsap, know nothing about the world/camera — they build one paused timeline from `ctx.gsap`.
- Everything shared outward goes through named **ports** (`<div data-port="tokens-out">` dock elements). Order/meta/direction come from `stations.manifest.ts`, not registration timing — an unregistered station degrades to a visible stub, never a broken page.

### Transition contract (`journey/transitions/*.ts`)

```ts
interface StationTransition {
  id: string;                    // 't12' … 't71'
  from: string; to: string;      // station ids
  direction: 'right'|'down'|'left'|'up';   // loop-circuit segment (consumed by layout.ts + camera)
  lengthVh: number;              // scroll distance of the camera travel (default 100)
  travelers: { id: TravelerId; fromPort: PortName; toPort: PortName }[];
  build(ctx: TransitionContext): gsap.core.Timeline;  // flight choreography, runs parallel to camera tween
  caption: string;               // one plain sentence — the reduced-motion/mobile connective text
}
```

Transitions are the only code that knows about two stations at once — and only via ports and travelers. Deleting a station = deleting its two transition files; nothing else references it. `t71-loop-close` is the finale: camera returns to station 01, the answer card lands in the opening chat panel.

### Orchestrator (`journey/orchestrator.ts`) + world/camera

Sole owner of ScrollTrigger. `gsap.matchMedia()` with three branches: `full`, `compact` (≤760px), `reduced`. Full branch:

```ts
const positions = layoutCircuit(manifest);        // layout.ts: accumulate direction vectors × viewport
stations.forEach(s => placeInWorld(s.sceneEl, positions[s.meta.id]));   // absolute, 100svw × 100svh

const master = gsap.timeline({ paused: true });
for (const s of stations) {
  master.add(s.build(ctx(s)));                                   // camera parked
  master.addLabel(s.meta.id);                                    // segment map for deep links
  const t = transitionAfter(s);
  if (t) master.add(cameraTo(positions[t.to], t), '>')           // world x/y tween, EASE.travel
         .add(t.build(transitionCtx(t)), '<');                   // traveler flight in parallel
}
// durations weighted by lengthVh → segment map: [startProgress, endProgress] per station/transition

ScrollTrigger.create({
  trigger: viewportEl, start: 'top top',
  end: () => `+=${totalLengthVh}%`,                              // sum of all segments
  pin: true, scrub: 0.6, animation: master,
  invalidateOnRefresh: true, anticipatePin: 1,
  onUpdate: st => { journey.setFromProgress(st.progress); cull(st.progress); },
});
```

- **One pin on the entire page.** No pin stacking, no `pinSpacing` decisions, no refresh-priority juggling — the whole class of current bugs is gone structurally.
- **Camera** = tween of `world`'s `x/y` (function-based values off `positions`, re-measured via `invalidateOnRefresh`).
- **Culling:** `cull(progress)` keeps only the active station ± 1 visible (`visibility: hidden` on the rest) so ~2 stations composite at once.
- Refresh policy: one central `ScrollTrigger.refresh()` after `document.fonts.ready`; debounced resize refresh; theme flip → `invalidateAll()`. No station/transition ever calls refresh.
- Viewport sized `100svw/100svh` (stable under iOS address-bar collapse) + `ScrollTrigger.config({ ignoreMobileResize: true })`.

### Traveler mechanism (real handoff, zero clones)

Travelers are real elements created once by `TravelerLayer.svelte`, which is a **child of `world`** — flights happen in world coordinates, so camera movement and flight compose naturally (the traveler visibly crosses the space between stations while the camera pans with it). At rest a traveler is **deposited into a station's port** (a normal child — chapter CSS styles it, native clipping/stacking). At a transition's boundaries the layer **adopts** it: measure (Flip.fit handles the transform math), reparent into the layer, `gsap.set` to the measured world position. The flight tween uses **function-based end values** (`x: () => worldRect(toPort).x`) so `invalidate()` re-measures. Reparenting happens **only at segment boundaries** (flight at progress 0/1) — never mid-scrub. `layer.placeFor(masterProgress)` is a pure, idempotent sync used for deep links, reloads mid-journey, and post-refresh.

Travelers v1: `prompt-card` (teal), `token-stream` (~6 TokenChips from `tokenizer.ts`), `context-band` (blue strata packet), `response-card` (one element, violet tool-call face / ochre answer face).

### Interactive demos inside the pinned world

Token Lab (02) and Guess Machine (04) must not be scroll-driven: the station timeline scrubs them into place, then hits a **plateau** (empty tween `.to({}, {duration})` = scrub-dead scroll distance) where the demo is fully interactive. Demo state lives in Svelte `$state`; demo micro-tweens are unscrubbed and scoped to `ctx.root`; the scrub timeline never touches demo state. "Keep scrolling" affordance at plateau end.

## Shared utilities

- **`motion/gsap.ts`** — one memoized `loadGsap()` dynamic import; registers plugins, sets `gsap.defaults`, ScrollTrigger config. Stations receive gsap via `StationContext`.
- **`motion/tokens.ts`** — `DUR { micro .2, beat .6, travel 1.2, settle .9 }`, `EASE { out: 'power4.out', travel: 'power2.inOut', draw: 'power1.inOut' }`, `STAGGER`.
- **`motion/colors.ts`** — prefer NOT tweening color (CSS custom props + class/attr toggles survive theme flips free). Where GSAP must own color: `color('concept-response')` reads the CSS var at call time, always passed as function values; theme flip triggers one `invalidateAll()` so scrubbed timelines re-resolve at current progress. Kills the duplicated per-file hex tables.
- **Shared UI** — `StationHead`, `DiagramPanel`, `Legend`, `GoDeeper` (`<details>`-based), `TransitionCaption` (renders `transition.caption` — the static connective fallback).

## Journey layer

- **LoopMap.svelte** — persistent mini-map that is a scaled rendering of the actual circuit geometry from `layout.ts` (M-tricolor spine, Isotype nodes), fixed corner on desktop / slim strip under header on compact. Shows the camera marker + current node; nodes are labeled `<button>`s that scroll to the station's segment start. **Birth moment:** station 01's finale shrinks its big loop diagram toward the corner; LoopMap crossfades in at matched geometry (`Flip.fit`).
- **Deep links:** on station activation, `history.replaceState('#'+id)` (from the segment map). On load with hash: build → refresh → `scrollTo(triggerStart + segmentOffset)` → `layer.placeFor()`. On compact/reduced branches, sections are in-flow with real ids, so native anchors just work.
- **Header:** wordmark + `Chapter n/07` (from `journey.active`) + ThemeToggle (existing patterns).

## Station outlines + transition ledger

**01 · The agent loop** (~350vh): cold open — "Fix the failing test" types into a chat panel (auto-plays); camera-pull-back beat — the chat is one node of a machine; loop diagram draws itself with pseudocode highlighting alongside; one full illustrated turn; diagram shrinks → LoopMap born; prompt card docks at `prompt-out`.
**→ t12 (right)** `prompt-card` — "Your words leave the chat and head for the model. First problem: models don't read words." Card strains at word seams mid-flight.

**02 · Tokenization** (~400vh): prompt card arrives and **shatters into token chips** (leading spaces glued on); IDs stamp on ("just a number in a lookup table", reuse `tokenizer.ts.display()`); edge cases — `strawberry` shatter, digit chunking, why letter-counting fails; **plateau: Token Lab**; chips line up at `tokens-out`.
**→ t23 (right)** `token-stream` — "Numbers now — ready for the model's short-term workspace."

**03 · Context window** (~350vh): chips pour into an empty tank; strata build (system / tool defs / history), Legend appears; capacity beat — overflow crops oldest history; statelessness beat — "every call the model reads all of this and nothing else"; stack compresses into a sealed packet at `context-out`.
**→ t34 (down)** `context-band` — "The entire window is shipped into the model. Every single time." The packet *drops* into the intake — direction reinforces gravity/feeding.

**04 · Next-token prediction** (~450vh): packet feeds the model (a calm instrument, not a brain); probability bars fan out, top guess appends, machine re-reads — autoregressive cycle ×3–4; **plateau: Guess Machine** (pick/re-roll candidates; Go-deeper: temperature, attention); streaming beat — output assembles token-by-token; response docks at `response-out` — and it's not prose, it names a tool (violet tint spreads).
**→ t45 (left)** `response-card` — "The model didn't answer — it asked to *do* something." Leftward = the loop's return path begins.

**05 · Tool calling — the inner loop** (~450vh): card unfolds into a labeled tool call ("just text in a shape the harness can parse"); harness executes, red tool-output appended — on-stage mini context tank grows; inner loop cycles (station-01 pseudocode returns, now earned); exit condition — no tool call → loop breaks → ochre answer; overstuffed band + answer dock.
**→ t56 (left)** `context-band` (meter near red) — "Every loop made the window fatter. Someone has to decide what's worth keeping."

**06 · Context engineering** (stub, ~150vh): bloated band arrives; problem stated (cost, noise, overflow); static placeholder diagram — trim / summarize / retrieve *per call*; band exits slimmer.
**→ t67 (up)** — "A well-packed call. Now zoom out: who runs all of this?" Upward = climbing back toward the start of the loop.

**07 · Harness engineering** (stub, ~200vh): the call shrinks to a capsule inside a larger ring — retries, guardrails, orchestration, the outer loop; static diagram keeping the two terms distinct (AGENTS.md definitions verbatim).
**→ t71 (up/right, loop-close finale)** camera returns to station 01; the `answer-card` lands in the very first chat panel — **the loop closes**. Footer + "start again".

Stubs = StationHead + one DiagramPanel + live ports (prove the contract from M0).

## Responsive + fallbacks

- **Compact (≤760px):** no world, no pin, no travelers. Stations render as in-flow stacked sections at natural height; beats fire as in-view sequences (`toggleActions`, not scrub). Transitions render as `TransitionCaption` rows (directional arrow + caption sentence + the traveler drawn statically). LoopMap = header strip. Demos = ordinary panels.
- **Reduced motion:** same unpinned in-flow layout at any width; scenes show end-states (= the SSR HTML); motion-taught beats get steppable/static equivalents (autoregressive loop as numbered filmstrip; tank pre-filled). Captions + LoopMap carry the connective story (DESIGN.md sanctions this).
- **No-JS rule enforced by architecture:** **SSR HTML is the finished state**, rendered in-flow (world positioning is applied only by the full-branch orchestrator at runtime). Stations author markup fully visible; `build()` applies `autoAlpha: 0` sets right before wiring. GitHub Pages serves a complete readable document with JS off.

## Implementation order (each milestone: `bun run dev` on existing 5173 server, `bun run check`, `bun run build` green)

- **M0 — Scaffold:** create `motion/*`, `journey/*` (incl. `layout.ts` circuit + camera + culling), move old components → `legacy/`, `+page.svelte` = `<Journey />` with 7 titled stubs positioned on the circuit. Verify: scroll drives the camera around the full circuit through 7 stubs; hash + header counter + LoopMap camera marker work; reduced/compact branches show stacked in-flow stubs (agent-browser: emulate reduced-motion + 390px).
- **M1 — Prove the architecture:** stations 01 + 02 (fresh content; legacy as reference) + **transition t12 with the real prompt-card traveler** + LoopMap birth. Exercises every contract surface. Verify via agent-browser: slow scroll forward/back across t12 — `querySelectorAll('[data-traveler=prompt-card]').length === 1` throughout, no visual duplication; deep link into 02; theme flip mid-transition.
- **M2 — Station 03 + t23** (multi-element `token-stream`; validates stagger-in-flight and `placeFor` on mid-journey reload).
- **M3 — Station 04 + t34** (first vertical camera segment; Guess Machine plateau; `context-band`; Go-deeper expanders).
- **M4 — Station 05 + t45**; t56/t67/t71 flights against live stub ports (incl. the loop-close finale).
- **M5 — Stub polish (06/07 diagrams), a11y pass** (AA re-check, focus order through plateaus, `aria-hidden` decorative SVGs, LoopMap labels), full compact/reduced pass, then delete `src/lib/legacy/` (git history keeps it).

**Per-milestone verification recipe:** `bun run check && bun run build`; agent-browser: (1) scroll end-to-end at 3 speeds, screenshot each station midpoint + each camera segment midpoint; (2) reload at each `#hash`; (3) theme toggle at 50% scroll; (4) reduced-motion + 390px snapshots.

## Risks → mitigations (baked in)

| Risk | Mitigation |
|---|---|
| Pin/pin-spacing bugs (today's chief breakage) | Exactly **one** pin on the page; single `ScrollTrigger.create` call site |
| Giant pinned world performance | Culling to active station ± 1; timelines built once; `will-change` only on travelers/world; GSAP in one deferred chunk |
| Refresh / measurement drift | Function-based positions from `layout.ts`; `invalidateOnRefresh`; one central refresh after `fonts.ready` |
| Reparenting mid-scrub | Adopt/deposit only at segment boundaries (flight at progress 0/1); Flip.fit for transform-aware measurement; flights in world space |
| Deep links skipping callbacks | Segment map from master-timeline labels; `layer.placeFor(progress)` — pure, idempotent |
| Scrub vs. interactive demos | Plateaus (empty tweens); demo state in `$state`, unscrubbed tweens; contract forbids scroll-driven demo state |
| iOS viewport churn | `100svw/100svh`, `ignoreMobileResize`; compact branch has no world/pin at all |
| Theme flip mid-tween | CSS vars where possible; function-value colors + one `invalidateAll()` |
| Coupling regressions | Stations can't reach outside `ctx.root` and know nothing of the world; transitions see only ports; a broken station degrades to its SSR end-state, never breaks a neighbor |
| Camera motion + reading comfort | Camera moves only in transitions (content is ambient there, captions short); `EASE.travel` is gentle; reduced-motion branch never moves a camera |
