# The Inner Loop v2 — Motion Polish Pass

> Follow-up to [v2-rewrite.md](./v2-rewrite.md). The rewrite shipped with correct but conservative motion: flights are straight-line world tweens with one small character beat each, station timelines favor fade/rise reveals, and the LoopMap birth is a shrink-plus-crossfade rather than a matched-geometry handoff. This pass makes the motion *teach harder* without touching the architecture.

## Context — what exists today

- **Flights** (`journey/transitions/*.ts`): `flightTween` lerps traveler `x/y` between port world-points with `ease: 'none'` (scrub carries pacing). Each transition adds one `!ctx.reduced` beat (t12 seam strains, t34/t45 drop settles, t56 meter pulse, t67 slim-down, t71 x-sway climb).
- **Camera**: single `x/y` tween per transition, `EASE.travel` (`power2.inOut`), no anticipation or settle.
- **Stations**: beats are largely `autoAlpha/y` reveals plus SVG dash draws (01) and stagger rains (03). Plateaus and scrub-fill affordances work.
- **Registered plugins**: ScrollTrigger + Flip only. MotionPath is *not* registered (the v2 plan reserved it; nothing uses it yet).
- **Invariants that hold and MUST keep holding**: one pin; master is the only paused timeline; stations query only `ctx.root` and never import gsap; transitions see two stations only via ports/travelers; reparenting only at segment boundaries / `placeFor`; SSR = readable end state; every beat has a reduced-motion equivalent that still teaches.

## Principles (from DESIGN.md — binding)

- Ease-out (quart/expo) for reveals, `EASE.travel` for camera; **no bounce, no elastic**.
- Motion reveals already-visible default states; it never gates content.
- Character beats are physical cues, not decoration: strain, weight, compression, release. If a beat doesn't carry meaning, cut it.
- Scrubbed motion must read at *any* scroll speed and in reverse — no beat may depend on time-based completion.
- Reduced motion is a first-class rendering of the same story (captions + LoopMap + static states), not an absence of the full one.

## Workstreams

### W1 — Flight choreography (`journey/transitions/`)

Give each flight a distinct physical identity. All changes stay inside the transition modules; `flightTween` gains optional curvature.

- **`flight.ts`**: register `MotionPathPlugin` in `motion/gsap.ts`; extend `flightTween(ctx, id, from, to, vars?)` with an optional `arc` option — a normalized perpendicular bow (e.g. `arc: 0.12` = 12% of flight distance). Implement with function-based `motionPath` (two-point path + control offset) so `invalidate()` re-measures; keep `ease: 'none'`. Straight remains the default; no call-site churn.
- **t12** (right): keep seam strains; add a slight forward lean (`rotation: 2 → 0`) so the card reads as *pulled* toward the tokenizer. Arc ≈ 0.
- **t23** (right): the chip ripple becomes a **wave that travels back-to-front** (stagger from the trailing chip), selling "a stream, in order". Wrapper stays one element.
- **t34** (down): arc 0; add pre-drop **hesitation** — the band compresses 4% at flight start (the window "seals"), then drops. Keep the squash-settle.
- **t45** (down): the card is *handed down*, not dropped: brief counter-rotation then settle, slightly late peak (`motionPath` progress remap is overkill — use two chained rotation tweens on the timeline).
- **t56/t67** (left): the return path should feel like **carrying weight home** — band rides 3–4px lower than the port-to-port line (negative arc), meter pulse kept in t56, slim release in t67 (band eases *up* to the line as it lightens).
- **t71** (up ×2, the finale): the emotional peak. Arc the climb (`arc: 0.15`), answer-face glow via a brief `box-shadow`/outline tween on a child (CSS-var-driven color), and a 2-beat landing: decelerate above the chat panel, then settle in. Keep the set/restore of `data-face`.

### W2 — Camera feel (`journey/orchestrator.ts` only)

- **Anticipation + settle**: replace each single camera tween with a 3-part sequence inside the same transition window — 4% counter-nudge (2vh against travel direction), main travel, 6% overshoot-free settle. Total duration unchanged; label positions and the segment table are untouched.
- **Directional easing stays `EASE.travel`**; the nudge/settle use `EASE.out`. No zoom/scale — the plan's "camera moves only in transitions" and reading-comfort constraints stand.
- Verify `invalidateOnRefresh` still re-derives all three parts from `positions` (function-based values on each part).

### W3 — Station beat upgrades (per-station, parallelizable)

Each item stays inside its scene folder and its existing `build()` contract.

- **01 agent loop**: pseudocode highlight should *chase* the diagram pulse (one shared timeline position offset, ~0.1s), not co-fire; finale shrink gains a subtle blur-out (`filter` on the diagram wrapper — cheap, one element).
- **02 tokenization**: the shatter is the station's signature — split via per-chip `x/y/rotation` from a common origin (chips already exist in SSR; the beat only *disperses then aligns* them). ID stamps land with a 1-frame scale pop (1.06 → 1, `DUR.micro`).
- **03 context window**: chip rain gets terminal-velocity feel — stagger with `from: 'random'` and per-chip duration jitter ±15%; strata *compress* as each new layer lands (tank contents scaleY 0.985 pulse). Statelessness beat: letter-space widening on the key sentence (calm, typographic).
- **04 inference**: probability bars re-fan with a shared origin sweep (stagger 0.03 from selected bar outward); the re-read arrow draws with `EASE.draw` each cycle; streaming beat gets per-token `autoAlpha` + 2px rise (no cursor blink — scrub-unsafe).
- **05 tool calling**: validation checkmarks draw sequentially against the schema panel; the mini-tank growth must visibly *push* the meter (height tween + meter color step at thresholds via class toggles, not color tweens).
- **06/07 stubs**: no new beats (content later); only ensure their existing draws use `EASE.draw`.

### W4 — LoopMap birth, matched geometry (contract-safe)

The plan's `Flip.fit` birth without letting station 01 reach outside `ctx.root`:

- Station 01 exposes its final diagram bounds as a **port** (`data-port="loop-diagram"` getter on the handle — ports are exactly the sanctioned "share outward" channel).
- The **orchestrator** (which already owns both LoopMap reveal state and the master timeline) adds a short tween at station 01's finale label: `Flip.fit(loopMapEl, diagramPort, …)` inverted — LoopMap starts fitted over the diagram's end-rect and travels to its fixed corner while fading in; `journey.loopMapBorn` flips at the same label. Scrub-safe because both endpoints are function-measured and the tween lives on the master.
- Reduced/compact: unchanged (LoopMap simply appears; the in-flow diagram remains).

### W5 — Reduced-motion parity + performance guardrails

- Audit every new beat for its reduced equivalent (most are `!ctx.reduced`-gated flourishes on states that already render statically — document each exception inline).
- Performance: `will-change` stays confined to world + travelers; no `filter` tweens on elements larger than the 01 diagram wrapper; chip beats tween `transform/opacity` only. Budget check: scripted scroll at 3 speeds with DevTools tracing — no long task > 50ms attributable to scrub updates, ~2 stations compositing (culling unchanged).

## Non-goals

- No new scroll distance (manifest `lengthVh` values are frozen; the 3200vh budget test already guards this).
- No architecture changes: contracts in `journey/types.ts` unchanged except the additive `flightTween` option and the 01 `loop-diagram` port.
- No station 06/07 content (separate milestone), no copy changes, no new travelers.

## Order + parallelization

1. **P0 (serial, small):** W1 `flight.ts` arc option + MotionPath registration — the one shared contract everything else composes with.
2. **P1 (parallel):** seven transition upgrades (W1, one agent per file bundle t12/t23, t34/t45, t56/t67/t71) · W2 camera (orchestrator only) · W4 LoopMap birth (orchestrator + s01 port — same owner as W2, keep in one lane to avoid file overlap).
3. **P2 (parallel):** W3 station beats — five independent lanes (s01…s05), disjoint folders.
4. **P3:** W5 audit + performance pass, run centrally.

## Verification recipe (per phase, orchestrator-run)

`bun run check && bun run test && bun run build`, then agent-browser:
1. Slow/medium/fast scrub across every transition — flights arc smoothly, reverse scrub mirrors cleanly, traveler count stays 1.
2. Jump across each full transition (deep link + `scrollTo`) — `placeFor` convergence unaffected by MotionPath (endpoints, not paths, define docked state).
3. Station 01 finale: LoopMap birth reads as one object at 3 scrub speeds; reload mid-finale converges.
4. Reduced-motion + 390px: zero new motion leaks (assert no transform deltas on scroll in reduced branch).
5. Resize + theme flip mid-transition: function-based path values re-measure (no stale arcs).
6. Trace pass per W5; screenshot set at each transition midpoint for before/after review.

## Risks → mitigations

| Risk | Mitigation |
|---|---|
| MotionPath breaks `invalidate()` re-measure | Function-based path factory; verified by resize-mid-flight scenario (6 above) |
| Camera nudge fights scrub reversal | All three parts live on the master inside the same window; pure timeline math, no callbacks |
| Flip.fit birth desyncs from `loopMapBorn` | Both keyed to the same master label; state flip in an `onStart/onReverseComplete` pair |
| Beat inflation → busy pages | Every beat must name the physical cue it carries in a code comment; reviewer deletes any that can't |
| `filter`/shadow tweens jank | Confined to 01 finale + t71 landing, both on single small elements; trace gate in W5 |
