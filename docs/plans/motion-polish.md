# The Inner Loop v2 — Motion Polish Pass

> Follow-up to [v2-rewrite.md](./v2-rewrite.md), revised after a code-level review of the first draft. The rewrite shipped with correct but conservative motion: flights are straight-line world tweens with one small character beat each, station timelines favor fade/rise reveals, and the LoopMap birth is a threshold-triggered `display` flip. This pass makes the motion *teach harder* — and fixes two latent defects the review surfaced (dual position writers on travelers; a monotonic, mode-dependent LoopMap state).

## Context — what exists today

- **Flights** (`journey/transitions/*.ts`): `flightTween` lerps traveler `x/y` between port world-points with `ease: 'none'`. **But it is not the only writer**: every ScrollTrigger update calls `travelerLayer.placeFor(progress)` (`orchestrator.ts:148-151, 250`), and during a transition `placeFlight` writes a straight lerp to the same `x/y` (`travelers/layer.ts:104-126`). With `scrub: 0.6` the master renders at smoothed progress while `placeFor` receives raw progress — two writers on two clocks. Today they agree only because both paths are straight; the decorative `y` offsets in t34/t45/t56/t67 already compete with `placeFor`.
- **Camera**: single `x/y` tween per transition, `EASE.travel`, no anticipation or settle.
- **Stations**: beats are largely `autoAlpha/y` reveals plus SVG dash draws (01) and stagger rains (03). Plateaus and scrub-fill affordances work.
- **LoopMap**: `display: none` until `.born` (`LoopMap.svelte:78, 88-90`); `journey.loopMapBorn` is getter-only and flips `true` monotonically at 95% of station 01 (`journey.svelte.ts:31-34`). The reduced/compact branch never calls `setFromProgress` (`orchestrator.ts:82-105`), so those modes never show the map at all.
- **Registered plugins**: ScrollTrigger + Flip. Neither MotionPath nor Flip.fit is needed by this plan (see W1/W4 — we use a shared pure trajectory function and a plain transform handoff instead).
- **Invariants that hold and MUST keep holding**: one pin; master is the only paused timeline; stations query only `ctx.root` and never import gsap; transitions see two stations only via ports/travelers; reparenting only at segment boundaries / `placeFor`; SSR = readable end state; every beat has a reduced-motion equivalent that still teaches.

## Principles (from DESIGN.md — binding)

- Ease-out (quart/expo) for reveals, `EASE.travel` for camera; **no bounce, no elastic**.
- Motion reveals already-visible default states; it never gates content.
- Character beats are physical cues, not decoration: strain, weight, compression, release. If a beat doesn't carry meaning, cut it.
- Scrubbed motion must read at *any* scroll speed and in reverse — no beat may depend on wall-clock completion. **This includes CSS transitions triggered by attribute changes** (the current `data-face` mechanism violates it; W1 fixes it).
- Reduced motion is a first-class rendering of the same story (captions + LoopMap + static states), not an absence of the full one.

## Contract changes (the review's P0 — everything else composes with these)

The original "types unchanged" non-goal is revised. The full list of contract changes:

1. **`TravelerRoute` gains `arc?: number`** (`journey/types.ts`) — a normalized perpendicular bow, fraction of flight distance. Curvature is part of the deterministic route contract, declared once per route, never a call-local GSAP option. `0`/absent = straight.
2. **One pure trajectory function**, new module `journey/travelers/trajectory.ts`:

   ```ts
   flightPoint(from: Point2D, to: Point2D, progress: number, arc = 0): Point2D
   ```

   Quadratic Bézier: control point = midpoint + `arc * distance * normal`, where `normal = normalize({ x: -dy, y: dx })` (this defines the sign: positive arc bows to the left of travel direction; negative to the right). Pure, no DOM, unit-tested.
3. **Single-writer rule for traveler `x/y`**: both `flightTween` and `placeFlight` compute positions via `flightPoint` with the route's `arc`, so the two writers always agree — including deep links, reloads, and jumps into mid-flight. `placeFor` remains the convergence authority. Transitions must **not** tween traveler `x/y` directly; character beats live on composing properties (`xPercent`/`yPercent`/`rotation`/`scale`) that are **zero at both segment boundaries**. (t34/t45's current `y`-offset settles migrate to `yPercent`.)
4. **Core trajectory progress stays linear** (`ease: 'none'`). Any felt acceleration (t71's 2-beat landing) is expressed through composing decorative properties, never by remapping flight progress — otherwise `placeFor` and the tween diverge mid-flight.
5. **`flightTween(ctx, route, vars?)`** takes the declared route object instead of loose `id/fromPort/toPort` args (transitions already declare routes in `travelers`; passing the same object keeps `arc` single-sourced). Implementation: tween a normalized progress proxy; resolve both port world-points at tween init (re-resolved on `invalidate()`); set `x/y` via `flightPoint` each update. Measure **both** ports — never infer the source from the traveler's current transform.
6. **`journey.setLoopMapBorn(next: boolean)`** — explicit reversible setter. The 95% threshold mutation in `setFromProgress` is removed; the orchestrator's `update()` becomes the sole owner: `journey.setLoopMapBorn(progress >= birthMasterProgress)` — direction-agnostic, seek-safe, no callbacks (see W4 for how `birthMasterProgress` is derived).
7. **Station 01 exposes a local timeline label `loop-map-birth`** immediately before its finale shrink, and a `loop-diagram` port (diagram wrapper element). Labels are a new (tiny) part of the station contract: the orchestrator may read `timeline.labels` before rescaling.
8. **Enhanced-branch CSS-transition kill switch**: `.journey[data-journey='enhanced'] .response-face { transition: none; }` (the orchestrator already sets `data-journey="enhanced"`). Face turnover becomes timeline-owned (W1 t71, W3 s05); `data-face` remains as semantic end-state, written via reversible `timeline.set(...)`, never `timeline.call(...)`.

## Workstreams

### W1 — Flight choreography (`journey/transitions/`, `journey/travelers/`)

Give each flight a distinct physical identity on top of the shared trajectory contract above.

- **t12** (right): keep seam strains; add a slight forward lean (`rotation: 2 → 0`) so the card reads as *pulled* toward the tokenizer. `arc: 0`.
- **t23** (right): the chip ripple becomes a **wave that travels back-to-front** (stagger from the trailing chip), selling "a stream, in order". Wrapper stays one element.
- **t34** (down): `arc: 0`; pre-drop **hesitation** — the band compresses 4% (`scaleY`) at flight start (the window "seals"), then drops. Squash-settle migrates from `y` to `yPercent` (rule 3).
- **t45** (down): the card is *handed down*, not dropped: brief counter-rotation then settle via two chained rotation tweens, both zero at boundaries.
- **t56/t67** (left): the return path feels like **carrying weight home** — `arc: -0.06` (bows below the port-to-port line; normalized, so it scales with viewport — accepted, no pixel spec). Meter pulse kept in t56; slim release in t67 (band eases up to the line as it lightens, via `yPercent → 0`).
- **t71** (up ×2, the finale): the emotional peak.
  - `arc: 0.15` on the climb.
  - Answer-face glow: brief `box-shadow`/outline tween on a small child element, CSS-var-driven color.
  - 2-beat landing: decelerate above the chat panel then settle — expressed as a `yPercent` hump that returns to 0 at the endpoint (rule 4), not a progress remap.
  - **Face turnover is rebuilt scrub-safe**: delete the `timeline.call` + `onReverseComplete` attribute juggling. Animate `.tool-face` and `.answer-face` `autoAlpha`/`rotationX` directly on the transition timeline; write `data-face` with `timeline.set` at the turnover position for semantics/styling. The CSS transition is disabled in the enhanced branch (contract 8). A fast seek, reverse scrub, or direct mid-t71 seek must render the exact face for that progress with no wall-clock tail.

### W2 — Camera feel (`journey/orchestrator.ts` only)

Replace each single camera tween with a **3-part sequence inside the same transition window** — sub-durations `0.04 / 0.90 / 0.06` of the existing window; total duration, labels, and the segment table untouched.

Absolute geometry contract (no `'+='`/`'-='` anywhere — relative values drift after invalidation):

- All world targets are function-valued, derived from `positions` and viewport at init. Sign convention: world translation is the negative of camera position (`x: () => -pos.x * innerWidth`), so a camera move *right* is a world move *left*; "against travel direction" means the world nudges *with* the world-space sign of travel.
- **Part 1 — anticipation** (`4%`, `EASE.out`): from source transform to source ± 2vh against travel direction (absolute: `sourceWorld + 0.02 * viewport * travelSignWorld`).
- **Part 2 — main travel** (`90%`, `EASE.travel`): from the nudge point to a point **1.5% of travel distance short of** the destination (absolute, computed from both endpoints).
- **Part 3 — settle** (`6%`, `EASE.out`): from the short point to the exact destination. Approaches from short — never passes the destination and returns, so "overshoot-free" is literal.
- Part boundaries must chain exactly: part N's function-valued start equals part N−1's function-valued end, and `invalidateOnRefresh` re-derives all three (verified by the camera test contract below).

### W3 — Station beat upgrades (per-station, parallelizable after DOM specs below)

Each item stays inside its scene folder and its existing `build()` contract. Exact selectors and markup changes are specified here so parallel lanes can't diverge.

- **01 agent loop** (`s01-agent-loop/Scene.svelte`):
  - Pseudocode highlight *chases* the diagram pulse: the `[data-code-line]` tween moves from sequential-after to `'<0.1'` relative to its `[data-node]` pulse, for all seven beats.
  - Add `timeline.addLabel('loop-map-birth')` immediately before the finale `loopStage` shrink; add the `loop-diagram` port returning the `[data-loop-stage]` element.
  - The finale shrink itself is **kept as-is** (it is the diagram's exit half of the W4 handoff). The previously planned blur-out is **cut**: `[data-loop-stage]` spans the whole diagram panel + pseudocode column — a scrubbed `filter` there is a large repaint surface, and the blur carries no physical meaning the shrink doesn't already carry.
- **02 tokenization** (`s02-tokenization/Scene.svelte`):
  - Common-origin shatter: per-chip `x/y/rotation` **function-measured** as the delta from each chip's natural position to the `[data-prompt-copy]` rect center at tween init, so resize invalidation re-measures. Chips disperse from the copy's origin then align — SSR still renders the finished chip row.
  - ID stamps (`[data-chip-id]`): the current build hides them (`autoAlpha: 0, rotationX: -90`) and **never restores them** — that's an existing bug this beat fixes. New beat: stamp in with `autoAlpha: 1, rotationX: 0, scale: 1.06 → 1` over `DUR.micro` with `STAGGER.tight` — a short **scrubbed** stamp (the original "1-frame pop" spec was contradictory: `DUR.micro` is 0.2s ≈ 12 frames, and nothing scrubbed is frame-countable).
- **03 context window** (`s03-context-window/Scene.svelte`):
  - Chip rain gets terminal-velocity feel with **deterministic** irregularity: derive order and duration from chip index via a small hash, e.g. `const jitter = (i: number) => 0.85 + 0.3 * (((i * 2654435761) >>> 0) % 1000) / 1000;` for duration factor, and a hash-ranked permutation for stagger order. Looks random; identical across builds, refreshes, reverse scrubs, and screenshots. No `from: 'random'`, no `Math.random()`.
  - Strata compress as each layer lands: `scaleY: 0.985` pulse on the tank contents (transform-only) — kept.
  - Statelessness beat: the letter-spacing widening is **cut** (it triggers layout+paint per scrub frame, can rewrap the line, and can fire the station `ResizeObserver` → central refresh loop; it also doesn't explain statelessness). Replacement: an absolutely-positioned underline element inside `.stateless__line` revealed via `scaleX: 0 → 1` (`transformOrigin: left`, `EASE.draw`) under "all of this and nothing else" — transform-only, cannot reflow, and points at the actual claim.
- **04 inference** (`s04-inference/Scene.svelte`):
  - Probability bars re-fan with a shared-origin sweep: `stagger: { each: 0.03, from: <selected bar index> }`.
  - The re-read arrows (`.cycle-frame__arrow`, currently Unicode `→`/`↺` text) are **replaced with inline SVG paths** (`pathLength="1"`, dash draw with `EASE.draw`) — markup change required; text arrows cannot draw. Keep the characters in `aria-label`s.
  - Streaming beat: the per-token rise **already exists at 8px** (`timeline.set(streamedTokens, { autoAlpha: 0, y: 8 })`); this item is an adjustment to `y: 2`, not a new beat. No cursor blink (scrub-unsafe).
- **05 tool calling** (`s05-tool-calling/Scene.svelte`):
  - Validation checkmarks (currently Unicode `✓` spans) are **replaced with inline SVG check paths**, drawn sequentially against the schema panel with `EASE.draw`. Keep `aria-hidden` semantics as today.
  - Mini-tank push: new meter contract — the tank keeps `[data-tank-fill]` and its two `.tank-line` thresholds; add a `data-threshold="none|one|two"` attribute on the tank, with CSS color states keyed on it. The fill height tween crosses the lines and the attribute steps via **reversible `timeline.set`** at the crossing positions (never direction-sensitive callbacks — a direct seek to any progress must render the right threshold state).
  - The station's `data-face` change gets the same scrub-safe treatment as t71 (contract 8): timeline-owned face opacity, attribute via `timeline.set`.
- **06/07 stubs**: **no changes.** (They contain fade/rise/scale reveals only — there are no draws to retune; content comes in a later milestone.)

### W4 — LoopMap birth: an honest spatial handoff (not matched geometry)

**Decision (review finding 3):** the station diagram (four conceptual nodes: user/harness/model/tool) and the LoopMap (seven chapter stations) are semantically different objects. We do **not** pretend they are one object — no `Flip.fit`, no geometry matching. The choreography is a *baton pass*: the conceptual loop leaves the stage toward the top-right corner (station 01's existing shrink), and the journey map arrives at that corner as it goes. Related scale, same corner, overlapping windows — spatially connected, semantically honest. This also deletes the entire Flip measurement/refresh problem class. (A future milestone may render the true seven-station circuit inside station 01 for a real shared-object handoff; out of scope here.)

**Timing contract** (station 01 has no addressable finale position today — the orchestrator only labels station starts and exit transitions):

1. Station 01 adds the local label `loop-map-birth` (W3 above).
2. Before rescaling the station timeline, the orchestrator records `birthFraction = timeline.labels['loop-map-birth'] / timeline.duration()`.
3. After building the master, `birthMasterProgress = stationStartProgress + birthFraction * stationSpanProgress`. No fraction is hardcoded in the orchestrator; the label is the single source of truth.
4. The orchestrator adds a master-owned entrance tween for the LoopMap at that position: from a function-measured start transform (translated toward the `loop-diagram` port's end-rect center, `scale: 0.92`, `autoAlpha: 0`) to identity at its fixed corner (`autoAlpha: 1`). All values function-valued so `invalidate()` re-measures — plain transforms, no Flip, nothing to "re-fit".

**State contract:** the orchestrator's `update()` sets `journey.setLoopMapBorn(progress >= birthMasterProgress)` — reversible on reverse scroll, correct on any direct seek, no `onStart/onReverseComplete` pair. `loopMapBorn` governs pointer-events and `aria-hidden`, not layout.

**Lifecycle across entry modes** (replaces the false "reduced/compact unchanged" claim — the map must be laid out to be animatable, and visible wherever it carries the connective story):

| Mode | Initial map state |
|---|---|
| SSR / no JS | visible static navigation (the CSS default) |
| Reduced motion | visible immediately |
| Compact | visible immediately |
| Full motion, before birth | laid out, `autoAlpha: 0`, `pointer-events: none` |
| Full motion, after birth | visible and interactive |
| Full motion, reverse before birth | hidden again (scrubbed) |

Implementation: `.loop-map` default CSS becomes `display: block; visibility: visible` — SSR/no-JS/reduced/compact all see it with zero branch logic. Only the **full-motion branch** hides it pre-birth, via `gsap.set(loopMapEl, { autoAlpha: 0 })` inside the branch's gsap context, so a branch switch (viewport resize, motion-preference change) auto-reverts to visible. The `.born` class + `display: none` mechanism is deleted. Progressive enhancement in the correct direction: default visible, enhancement hides.

### W5 — Reduced-motion parity + performance guardrails

- Audit every new beat for its reduced equivalent (most are `!ctx.reduced`-gated flourishes on states that already render statically — document each exception inline). Reduced motion must apply the correct static **face** and **threshold** states directly, with CSS transitions inert.
- The reduced-motion verification asserts the LoopMap is *visible and navigable*, not merely that transforms don't change.
- Performance: `will-change` stays confined to world + travelers; no `filter` tweens anywhere (the only planned one is cut in W3); shadow/glow tweens confined to t71's small child element; chip beats tween `transform/opacity` only.
- Budget: scripted scroll at 3 speeds with DevTools tracing (agent-browser supports this), at a **fixed viewport (1440×900) and 4× CPU throttle**, recording:
  - dropped-frame percentage (target: < 5% at medium speed),
  - p95 frame time (target: < 12ms — a 60Hz frame is ~16.7ms; the scrub update needs headroom, not merely "no 50ms long task"),
  - max scripting time attributable to ScrollTrigger updates,
  - layer/compositing count (~2 stations compositing; culling unchanged).

## Non-goals

- No new scroll distance (manifest `lengthVh` values are frozen; the 3200vh budget test already guards this).
- Contract changes are **exactly** the eight items in "Contract changes" above — nothing else in `journey/types.ts` moves.
- No Flip.fit / matched-geometry handoff (decided against, W4); no MotionPathPlugin (superseded by `flightPoint`).
- No station 06/07 content (separate milestone), no copy changes, no new travelers.

## Order + parallelization

1. **P0 — baselines + contracts (serial):**
   - **First action, before any code change:** capture the before-screenshots at every transition midpoint and the three-speed traces — this is the only moment a true baseline exists.
   - `flightPoint` + `TravelerRoute.arc` + `flightTween` rework + `placeFlight` convergence (contracts 1–5), with the trajectory/convergence tests below.
   - `setLoopMapBorn` + threshold removal + label plumbing + LoopMap CSS lifecycle (contracts 6–8), with the lifecycle tests below.
2. **P1 (parallel):** seven transition upgrades (W1, bundled t12/t23 · t34/t45 · t56/t67/t71) · W2 camera + W4 LoopMap entrance (both orchestrator-owned — **one lane**, same files).
3. **P2 (parallel):** W3 station beats — five independent lanes (s01…s05), disjoint folders, DOM specs already fixed above.
4. **P3:** W5 audit + performance pass + baseline comparison, run centrally.

## Verification recipe

`bun run check && bun run test && bun run build`, plus **focused automated contracts** (the existing suite covers only layout and paused-master basics):

1. **Trajectory math** (`trajectory.ts` unit tests): progress 0 = source; progress 1 = destination; `arc: 0` is exactly linear; positive/negative arc midpoints lie on the documented normal; t71's two-leg distance doesn't alter endpoint correctness.
2. **Traveler convergence**: timeline flight and `placeFor()` produce the same core point at progress 0, 0.25, 0.5, 0.75, 1; a deep seek into an arced flight lands on the arc, not the straight line; resize invalidation preserves normalized progress; decorative offsets are 0 at both boundaries.
3. **LoopMap lifecycle**: full-motion forward and reverse birth crossings; reload/deep seek during birth; initial compact load shows the map; initial reduced-motion load shows the map; full→compact and compact→full branch switches leave the correct visibility.
4. **Response face**: direct seek before/during/after turnover renders the correct face with no wall-clock tail; reverse seek restores the tool face instantly. (Slow scrolling will not expose this defect — the seeks are the test.)
5. **Camera**: each 3-part sequence totals exactly the original transition duration; first/final transforms equal source/destination exactly; invalidation re-derives all absolute endpoints with no drift.

Then agent-browser:

6. Slow/medium/fast scrub across every transition — arcs read smoothly, reverse mirrors, traveler count stays 1.
7. Jump across each full transition (deep link + `scrollTo`) — traveler lands on-arc mid-flight and docked at rest.
8. Station 01 finale at 3 scrub speeds: shrink-out and map-in read as one *handoff* (verification language deliberately says handoff, not "one object"); reload mid-finale converges.
9. Reduced-motion + 390px: map visible and navigable; zero transform deltas on scroll in the reduced branch.
10. Resize + theme flip mid-transition: function-valued endpoints re-measure (no stale arcs, no stale map start transform).
11. W5 trace pass; after-screenshots compared against the P0 baselines.

## Risks → mitigations

| Risk | Mitigation |
|---|---|
| `flightPoint` disagrees between the two writers | Single shared function, convergence tests at 5 progress points + deep-seek case |
| Decorative beats drift the traveler off-path at boundaries | Boundary-zero rule for composing properties, asserted in convergence tests |
| Camera parts desync after refresh | Absolute function-valued endpoints only, chained-boundary test in contract 5 |
| Birth label fraction wrong after station rescale | Fraction recorded pre-rescale from the label, converted once; lifecycle tests seek across the birth point |
| Face/threshold state wrong on direct seek | `timeline.set` only, no callbacks; seek-based tests in contract 4 and the s05 lane |
| Beat inflation → busy pages | Every beat must name the physical cue it carries in a code comment; reviewer deletes any that can't |
| Shadow/glow tween jank | Confined to t71's small child; trace gate in W5 |
