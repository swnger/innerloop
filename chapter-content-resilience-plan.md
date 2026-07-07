## Context

The ask is to make chapter content and chapter-to-chapter transitions resilient so ordinary content edits do not break, overlap, or require coordinated animation rewrites. Current code already has one important resilience measure: `src/routes/+page.svelte` measures station heights and rebuilds the GSAP world camera on resize, and `src/lib/loop.svelte.ts` exposes `registerWorldTriggers()` for station-local ScrollTriggers. The brittle parts are the duplicated path metadata, index-coupled transition arrays, hard-coded world topology, component-local chapter labels, global selectors, and static prose/demo data mixed into large GSAP-heavy Svelte files. Advisor input is folded into this plan: do **not** build a generic chapter engine; use a typed content/contract split while preserving the current rendered route and bespoke chapter choreography.

## Approach

### 1. Create a canonical loop path registry

Create `src/lib/content/loopPath.ts` as the single source of truth for the ordered route, station ids, transition legs, fallback transition copy, minimap topology, and named cross-chapter handoff selectors. This module must stay pure: no component imports, no DOM, no GSAP, no Svelte runtime.

Define these exact exported types in `loopPath.ts`:

```ts
export type StationId =
	| "agent-loop"
	| "context"
	| "tokenization"
	| "inference"
	| "context-revisit"
	| "tools"
	| "recap";

export type InterstitialId = "repeat-pass";
export type WorldStopId = StationId | InterstitialId;
export type LoopNodeId = "agent" | "window" | "tokens" | "model" | "tools";
export type LoopGlyph = LoopNodeId | "loop";
export type LoopHue = "blue" | "violet" | "red";
export type LoopDirection = "right" | "left" | "down";

export type Station = {
	id: StationId;
	label: string;
	node: LoopNodeId;
};

export type LoopStop =
	| {
			kind: "station";
			id: StationId;
			label: string;
			node: LoopNodeId;
			column: 0 | 1 | 2 | 3;
			row: 0 | 1;
			chapterNumber?: "01" | "02" | "03" | "04" | "05";
			dwellMs?: number;
			mapLabel?: string;
		}
	| {
			kind: "interstitial";
			id: InterstitialId;
			label: string;
			column: 0 | 1 | 2 | 3;
			row: 0 | 1;
			dwellMs?: number;
		};

export type FallbackTransition = {
	from: LoopGlyph;
	to: LoopGlyph;
	fromLabel: string;
	toLabel: string;
	direction: LoopDirection;
	hue: LoopHue;
	chip: string;
	kicker: string;
	caption: string;
};

export type HandoffContract = {
	id: "context-tools-band-to-tool-schema";
	sourceStop: "context-revisit";
	sourcePanelSelector: "[data-handoff=\"revisit-panel\"]";
	sourceSelector: "[data-handoff=\"tool-definitions-band\"]";
	targetStop: "tools";
	targetSelector: "[data-handoff-target=\"tool-schema-body\"]";
};

export type LoopLeg = {
	id: `${WorldStopId}->${WorldStopId}`;
	from: WorldStopId;
	to: WorldStopId;
	hue: LoopHue;
	carrier: string;
	kicker: string;
	enhancedText: string;
	fallback: FallbackTransition | null;
	handoff?: HandoffContract;
	carrierScale?: number;
	captionOut?: number;
};

export type MinimapNode = {
	id: StationId;
	node: LoopNodeId;
	cx: number;
	cy: number;
	r: number;
	name: string;
};

export type MinimapEdge = {
	from: WorldStopId;
	to: WorldStopId;
	d: string;
	hue: LoopHue;
};
```

Define `LOOP_STOPS` with the current rendered order and labels from `src/routes/+page.svelte` lines 73-82. Preserve behavior; do not reorder chapters in this refactor:

```ts
export const LOOP_STOPS = [
	{ kind: "station", id: "agent-loop", label: "the agent", node: "agent", column: 0, row: 0, chapterNumber: "01" },
	{ kind: "station", id: "context", label: "context window", node: "window", column: 1, row: 0, chapterNumber: "02" },
	{ kind: "station", id: "tokenization", label: "tokenization", node: "tokens", column: 2, row: 0, chapterNumber: "03" },
	{ kind: "station", id: "inference", label: "inference", node: "model", column: 3, row: 0, chapterNumber: "04" },
	{ kind: "station", id: "context-revisit", label: "context again", mapLabel: "context window · again", node: "window", column: 3, row: 1 },
	{ kind: "station", id: "tools", label: "tool calling", node: "tools", column: 2, row: 1, chapterNumber: "05" },
	{ kind: "interstitial", id: "repeat-pass", label: "model called again", column: 1, row: 1, dwellMs: 560 },
	{ kind: "station", id: "recap", label: "the whole loop", node: "agent", column: 0, row: 1 }
] as const satisfies readonly LoopStop[];
```

Define `LOOP_LEGS` with one record per adjacent stop. Copy the exact current enhanced captions from `CAPTION_COPY` in `src/routes/+page.svelte` lines 84-120, exact carrier strings from `CARRIER_CHIPS` lines 122-130, and exact fallback transition objects from `FALLBACK_TRANSITIONS` lines 149-221. Encode the current intentional asymmetry explicitly:

- `agent-loop->context`: fallback from `agent` to `window` using current `FALLBACK_TRANSITIONS[0]`.
- `context->tokenization`: fallback from `window` to `tokens` using current `FALLBACK_TRANSITIONS[1]`.
- `tokenization->inference`: fallback from `tokens` to `model` using current `FALLBACK_TRANSITIONS[2]`, plus `carrierScale: 1.14` (the token-ids chip grows on arrival; currently the inline `i === 3` special case in the carrier tween).
- `inference->context-revisit`: fallback from `model` to `window` using current `FALLBACK_TRANSITIONS[3]`.
- `context-revisit->tools`: fallback from `window` to `tools` using current `FALLBACK_TRANSITIONS[4]`, plus `handoff: HANDOFFS.contextToolsBandToToolSchema`.
- `tools->repeat-pass`: enhanced leg only; `fallback: null`. This keeps the fallback stack from inserting a blank transition before the repeat-pass beat.
- `repeat-pass->recap`: enhanced `enhancedText` from current `CAPTION_COPY[6]` / carrier `final answer`; fallback uses current `FALLBACK_TRANSITIONS[5]` (from `tools` to `loop`) because the fallback copy intentionally collapses the repeat-pass and recap into one explanatory handoff; plus `captionOut: 0.92` (the final caption holds longer before fading; currently the `i === geometry.stops.length - 1 ? 0.92 : 0.8` ternary).

Also export the shared leg-phase fractions and the zero-travel stop dwell, lifted verbatim from the inline camera-build numbers in `src/routes/+page.svelte` (carrier tween at lines 550-585, caption tweens at lines 599-619, dwell at line 631). Within-leg choreography is expressed as fractions of the leg duration, so copy-length or station-height changes rescale it automatically and never require retuning:

```ts
export const LEG_PHASES = {
	carrierIn: 0.16,
	carrierTravel: 0.68,
	carrierOut: 0.82,
	captionIn: 0.18,
	captionOut: 0.8
} as const;

export const STOP_DWELL_MS = 420;
```

Per-leg deviations are optional `LoopLeg` fields instead of index checks in the camera build: `carrierScale: 1.14` only on `tokenization->inference`, `captionOut: 0.92` only on `repeat-pass->recap`. The interstitial stop carries `dwellMs: 560` (currently `stop.id === "repeat-pass" ? 560 : 420`). The millisecond fade clamps (`Math.min(180, ...)`, `Math.min(200, ...)`) stay inline in the camera build — uniform implementation detail, not per-leg contract.

Also export:

```ts
export const HANDOFFS = {
	contextToolsBandToToolSchema: {
		id: "context-tools-band-to-tool-schema",
		sourceStop: "context-revisit",
		sourcePanelSelector: "[data-handoff=\"revisit-panel\"]",
		sourceSelector: "[data-handoff=\"tool-definitions-band\"]",
		targetStop: "tools",
		targetSelector: "[data-handoff-target=\"tool-schema-body\"]"
	}
} as const satisfies Record<string, HandoffContract>;

export const STATIONS = LOOP_STOPS.filter((stop): stop is Extract<LoopStop, { kind: "station" }> => stop.kind === "station")
	.map((stop) => ({ id: stop.id, label: stop.mapLabel ?? stop.label, node: stop.node })) satisfies readonly Station[];

export const stationIds = new Set<StationId>(STATIONS.map((station) => station.id));
export const stopIds = new Set<WorldStopId>(LOOP_STOPS.map((stop) => stop.id));
export const legAfter = (id: WorldStopId) => LOOP_LEGS.find((leg) => leg.from === id);
```

`Station.label` is the wayfinding label rendered in the masthead by `LoopMinimap`'s `.mm-label`; `LoopStop.label` is the world-map label drawn under the route dot. They intentionally differ for `context-revisit` — `context window · again` (current `loop.svelte.ts` line 36) vs `context again` (current `BASE_WORLD_STOPS`) — which is why the station variant carries `mapLabel` and the `STATIONS` derivation reads `stop.mapLabel ?? stop.label`. Deriving `STATIONS` from `LoopStop.label` alone would silently rewrite the masthead label, a reader-facing copy change this refactor must not make.

Add `assertLoopPath()` in the same file and call it once at module load. It must throw during development/build if future path edits desynchronize the model. Validate all of these conditions:

- no duplicate stop ids;
- every leg endpoint exists in `LOOP_STOPS`;
- `LOOP_LEGS.length === LOOP_STOPS.length - 1`;
- each `LOOP_LEGS[index]` connects `LOOP_STOPS[index].id` to `LOOP_STOPS[index + 1].id`;
- every station stop appears once in `STATIONS`;
- every fallback `from`/`to` is one of `agent`, `window`, `tokens`, `model`, `tools`, `loop`;
- every handoff `sourceStop`/`targetStop` exists;
- every leg `carrierScale`/`captionOut` override and stop `dwellMs`, when present, is a finite positive number, with `captionOut` strictly between 0 and 1;
- exactly one `MINIMAP_NODES` entry per station stop, and none for interstitials;
- every `MINIMAP_EDGES` endpoint exists in `LOOP_STOPS`;
- `MINIMAP_EDGES.length === LOOP_LEGS.length`, and `MINIMAP_EDGES[index]` matches `LOOP_LEGS[index]` on `from`, `to`, and `hue` — the two red edges reference the implicit `repeat-pass` waypoint, which has no node.

Use these exact error prefixes so failures are grep-readable:

- `loopPath: duplicate stop id`
- `loopPath: invalid leg endpoint`
- `loopPath: leg order mismatch`
- `loopPath: invalid fallback glyph`
- `loopPath: invalid handoff stop`
- `loopPath: invalid leg choreography`
- `loopPath: minimap node mismatch`
- `loopPath: minimap edge mismatch`

Keep the assertion an unconditional throw; do not gate it on `import.meta.env.DEV`. Every route is prerendered (`src/routes/+layout.ts` sets `prerender = true`, adapter-static), so this module loads during `bun run build` and a desynchronized registry fails the build before it can deploy. Gating on `DEV` would disable the check during `vite build` — exactly when it acts as the shipping gate. The registry is pure and deterministic, so a bundle that passed prerender cannot throw differently at client hydration.

### 2. Turn `loop.svelte.ts` into a runtime facade over the registry

Update `src/lib/loop.svelte.ts` so it imports and re-exports `STATIONS`, `StationId`, `LoopNodeId as NodeId`, and `Station` from `src/lib/content/loopPath.ts`. Delete the local `StationId`, `NodeId`, `Station`, and `STATIONS` definitions currently at lines 12-39.

Keep the public runtime API unchanged:

- `stationIndex(id: StationId)`;
- `loop.current`, `loop.index`, `loop.progress`;
- `loop.set(id)`, `loop.setProgress(value)`;
- `loop.containerAnimation`, `loop.setContainerAnimation(tl)`;
- `loop.registerWorldTriggers(factory)`;
- `macroCapable()`.

This preserves imports in `LoopMinimap.svelte`, `Tokenization.svelte`, and other components while removing the duplicate station list.

Also export a station lookup from `loopPath.ts` so visible chapter numbers can come from the registry:

```ts
export const stationById = Object.fromEntries(
	STATIONS.map((station) => [station.id, LOOP_STOPS.find((stop) => stop.kind === "station" && stop.id === station.id)])
) as Record<StationId, Extract<LoopStop, { kind: "station" }>>;

export function chapterNumberFor(id: StationId): NonNullable<Extract<LoopStop, { kind: "station" }>["chapterNumber"]> {
	const chapterNumber = stationById[id].chapterNumber;
	if (!chapterNumber) throw new Error(`loopPath: missing chapter number for ${id}`);
	return chapterNumber;
}
```

Use `chapterNumberFor()` in the numbered chapter components so `data-chapter` and visible `Chapter NN` labels stop drifting from route metadata:

- `Hero.svelte`: `const CHAPTER_NUMBER = chapterNumberFor("agent-loop")`; set `data-chapter={CHAPTER_NUMBER}` and `Chapter {CHAPTER_NUMBER} · the cold open`.
- `ContextWindow.svelte`: `chapterNumberFor("context")`; set `data-chapter={CHAPTER_NUMBER}` and `Chapter {CHAPTER_NUMBER} · the mediator`.
- `Tokenization.svelte`: `chapterNumberFor("tokenization")`; set `data-chapter={CHAPTER_NUMBER}` and `Chapter {CHAPTER_NUMBER} · the alphabet of the machine`.
- `Inference.svelte`: `chapterNumberFor("inference")`; set `data-chapter={CHAPTER_NUMBER}` and `Chapter {CHAPTER_NUMBER} · the machine’s only trick`.
- `ToolCalling.svelte`: `chapterNumberFor("tools")`; set `data-chapter={CHAPTER_NUMBER}` and `Chapter {CHAPTER_NUMBER} · the hands`.

Do not apply `chapterNumberFor()` to `ContextRevisit.svelte` or `LoopRecap.svelte`; neither renders a visible chapter number (the revisit eyebrow reads `The window, again · a quick look`). `ContextRevisit.svelte` line 144 does still carry a leftover hard-coded `data-chapter="05"` that duplicates ToolCalling's number; nothing consumes `data-chapter` (no CSS or JS selector reads it anywhere in `src`), so delete that attribute from `ContextRevisit.svelte` instead of numbering the beat.

### 3. Extract deterministic world geometry

Create `src/lib/loopWorldGeometry.ts`. Move the pure parts of `measureWorldGeometry()` out of `src/routes/+page.svelte` lines 263-307 and remove index-based assumptions.

Export this exact config shape and defaults:

```ts
export type WorldLayoutConfig = {
	stationWidthPx: number;
	minTransitClearancePx: number;
	rowGutterPx: number;
	worldPaddingPx: number;
	routeYOffsetPx: number;
	captionWidthPx: number;
	captionEdgePx: number;
	captionViewportYPx: number;
	minViewportHeightPx: number;
};

export const WORLD_LAYOUT = {
	stationWidthPx: 1120,
	minTransitClearancePx: 120,
	rowGutterPx: 620,
	worldPaddingPx: 420,
	routeYOffsetPx: 360,
	captionWidthPx: 496,
	captionEdgePx: 96,
	captionViewportYPx: 150,
	minViewportHeightPx: 420
} as const satisfies WorldLayoutConfig;
```

Export `buildWorldGeometry({ stops, legs, heights, viewportWidth, viewportHeight, config })`. Inputs:

```ts
export type StopHeights = Partial<Record<WorldStopId, number>>;
```

Output:

```ts
export type MeasuredStop = LoopStop & {
	x: number;
	y: number;
	height: number;
	travel: number;
};

export type WorldGeometry = {
	stops: MeasuredStop[];
	width: number;
	height: number;
	fullRouteD: string;
	routeByHue: Record<LoopHue, string>;
};
```

Implementation decisions:

- `viewportHeight` passed to geometry must already subtract header height and be clamped with `WORLD_LAYOUT.minViewportHeightPx`.
- A missing `heights[stop.id]` means `height = viewportHeight`; this keeps initial SSR/client state valid before DOM measurement.
- `columnPitch = Math.ceil(viewportWidth + config.stationWidthPx + config.minTransitClearancePx * 2)`.
- `dropGap = Math.max(config.rowGutterPx, viewportHeight * 2 + config.minTransitClearancePx * 2)`.
- For each stop after the first: `x = stop.column * columnPitch`; `y = previous.y + previous.travel + (stop.row !== previous.row ? dropGap : 0)`.
- `routePoint(stop) = { x: stop.x + config.stationWidthPx / 2, y: stop.y + config.routeYOffsetPx }`.
- `departPoint(stop) = { x: stop.x + config.stationWidthPx / 2, y: stop.y + stop.travel + config.routeYOffsetPx }`.
- Full route is generated from every leg as `routePoint(from) -> departPoint(from) -> routePoint(to)`, collapsing consecutive identical points before serializing to SVG path syntax.
- `routeByHue` is generated by grouping leg segments by `leg.hue`, not by manually slicing `enter[]`/`depart[]` arrays.
- Red-route equivalence note: the current hand-sliced `routeRedD` omits the repeat-pass depart vertex (`enter[6] -> enter[7]` directly, `+page.svelte` line 305). Per-leg generation includes that vertex; with consecutive-point collapse the output is byte-identical while the repeat-pass aside is shorter than the viewport (`travel === 0`, true today). Should the aside ever grow past viewport height, the generated red route gains a vertical segment that correctly follows the camera — an accepted, intentional divergence from today's slicing.
- `width` is computed from max measured stop right edge and route point x plus `worldPaddingPx`; do not keep `3 * columnPitch + STATION_WIDTH + WORLD_PADDING`.
- `height` is computed from max measured stop bottom edge and route point y plus `worldPaddingPx`; do not keep `measured[7]`.

### 4. Thin `src/routes/+page.svelte` to orchestration and rendering

Update `src/routes/+page.svelte` to import `LOOP_STOPS`, `LOOP_LEGS`, `stationIds`, `legAfter`, `WorldStopId`, `StationId`, `LoopLeg`, `LoopHue`, and `FallbackTransition` from `loopPath.ts`, and `WORLD_LAYOUT`, `buildWorldGeometry`, and `MeasuredStop` from `loopWorldGeometry.ts`.

Delete these local route-only definitions after the imports are wired:

- `WorldId`, `WorldStop`, `WorldCaption`, `WorldCarrier`, and local `FallbackTransition` type declarations at lines 17-52;
- `STATION_WIDTH`, `DEFAULT_WORLD_WIDTH`, `DEFAULT_WORLD_HEIGHT`, `DEFAULT_TOP_ROW`, `DEFAULT_BOTTOM_ROW`, `COL_0` through `COL_3`, `TRANSIT_CLEARANCE`, `STOP_COLUMNS`, `ROW_GUTTER`, `WORLD_PADDING`, `ROUTE_X_OFFSET`, `ROUTE_Y_OFFSET` at lines 54-71;
- `BASE_WORLD_STOPS`, `CAPTION_COPY`, `CARRIER_CHIPS`, and `FALLBACK_TRANSITIONS` at lines 73-222;
- `cloneStops()` and the in-file `measureWorldGeometry()`.

Keep these responsibilities in `+page.svelte`:

- component imports;
- GSAP/ScrollTrigger dynamic imports;
- enhanced-mode `gsap.matchMedia()`;
- hash routing and `IntersectionObserver` station observer;
- `stationEls` DOM registration;
- `ResizeObserver` rebuild scheduling;
- timeline construction, scroll binding, and `loop.setContainerAnimation(timeline)`;
- Svelte rendering of stations, fallback transitions, captions, carriers, and world SVG.

Create a component map in `+page.svelte` instead of importing components from the registry:

```ts
import type { Component } from "svelte";

const STOP_COMPONENTS = {
	"agent-loop": Hero,
	context: ContextWindow,
	tokenization: Tokenization,
	inference: Inference,
	"context-revisit": ContextRevisit,
	tools: ToolCalling,
	recap: LoopRecap
} satisfies Record<StationId, Component>;
```

Replace the deleted route-local state types with these narrower route-local aliases; they are render state, not source-of-truth metadata:

```ts
type WorldCaption = {
	id: LoopLeg["id"];
	x: number;
	y: number;
	hue: LoopHue;
	kicker: string;
	text: string;
};

type WorldCarrier = {
	id: LoopLeg["id"];
	hue: LoopHue;
	chip: string;
};
```

Initialize world state from the pure geometry helper instead of keeping `DEFAULT_WORLD_WIDTH` / `DEFAULT_WORLD_HEIGHT`:

```ts
const initialGeometry = buildWorldGeometry({
	stops: LOOP_STOPS,
	legs: LOOP_LEGS,
	heights: {},
	viewportWidth: 1024,
	viewportHeight: 768,
	config: WORLD_LAYOUT
});

let worldWidth = $state(initialGeometry.width);
let worldHeight = $state(initialGeometry.height);
let worldStops = $state<MeasuredStop[]>(initialGeometry.stops);
let worldCaptions = $state<WorldCaption[]>([]);
let worldCarriers = $state<WorldCarrier[]>([]);
```

Create `src/lib/components/RepeatPass.svelte` and move only the repeat-pass inner markup from `+page.svelte` lines 1033-1043 into it. Keep the positioned wrapper `<aside class="world-repeat" ...>` in `+page.svelte` so the existing `.world-repeat` layout CSS (base at lines 1160-1166, enhanced at lines 1401-1418) remains the route’s responsibility.

Move the inner-markup styles with the markup — Svelte scopes styles per component, so once the markup lives in `RepeatPass.svelte`, the `.repeat-rail`, `.repeat-copy`, `.repeat-dot`, `.repeat-dot--tools`, `.repeat-dot--model`, and `.repeat-line` rules in `+page.svelte`'s stylesheet stop matching and the beat ships unstyled. Copy the base rules (lines 1168-1193) and the enhanced variants (lines 1420-1468) into `RepeatPass.svelte`'s own `<style>`, keeping the enhanced variants inside the same `@media (min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)` query they sit in today (they are media-scoped, not `.world-enhanced`-scoped), then delete the moved rules from `+page.svelte`.

Replace the hard-coded station/transition markup at `+page.svelte` lines 978-1055 with registry-driven rendering. Use this shape:

```svelte
{#each LOOP_STOPS as stop}
	{#if stop.kind === "interstitial"}
		<aside class="world-repeat" style={stopStyle(stop.id)} use:registerStation={stop.id} aria-label="Second model pass">
			<RepeatPass />
		</aside>
	{:else}
		{@const StopComponent = STOP_COMPONENTS[stop.id]}
		<div class="world-station" style={stopStyle(stop.id)} use:registerStation={stop.id}>
			<StopComponent />
		</div>
	{/if}

	{@const leg = legAfter(stop.id)}
	{#if leg?.fallback}
		<div class="world-transition">
			{#if !worldEnhanced}
				<LoopTransition transition={leg.fallback} />
			{/if}
		</div>
	{/if}
{/each}
```

If the Svelte compiler rejects `<StopComponent />`, use `<svelte:component this={STOP_COMPONENTS[stop.id]} />` in the same branch without changing the data model.

Update the camera build:

- Replace `const stationIds = new Set(STATIONS.map((s) => s.id));` with the imported `stationIds`.
- Produce `const heights = Object.fromEntries(LOOP_STOPS.map((stop) => [stop.id, stationEls.get(stop.id)?.offsetHeight ?? window.innerHeight]))` before calling `buildWorldGeometry()`.
- Replace `measureWorldGeometry(viewportWidth, viewportHeight)` with `buildWorldGeometry({ stops: LOOP_STOPS, legs: LOOP_LEGS, heights, viewportWidth, viewportHeight, config: WORLD_LAYOUT })`.
- Replace `worldCaptions = CAPTION_COPY.map(...)` with `worldCaptions = LOOP_LEGS.map((leg, index) => ({ id: leg.id, hue: leg.hue, kicker: leg.kicker, text: leg.enhancedText, x, y }))`, keeping the current caption placement math but using `WORLD_LAYOUT.captionWidthPx`, `captionEdgePx`, and `captionViewportYPx`.
- Replace `worldCarriers = CAPTION_COPY.map(...)` with `worldCarriers = LOOP_LEGS.map((leg) => ({ id: leg.id, hue: leg.hue, chip: leg.carrier }))`.
- Replace the inline carrier/caption phase fractions (`0.16`, `0.68`, `0.82`, `0.18`, `0.8`) with `LEG_PHASES` from `loopPath.ts`; keep the `Math.min(180, ...)` / `Math.min(200, ...)` fade-duration clamps inline.
- Replace `scale: i === 3 ? 1.14 : 1` on the carrier arrival tween with `scale: leg.carrierScale ?? 1`, where `leg` is the registry leg for this segment.
- Replace the caption fade-out fraction `i === geometry.stops.length - 1 ? 0.92 : 0.8` with `leg.captionOut ?? LEG_PHASES.captionOut`.
- Replace the zero-travel dwell `stop.id === "repeat-pass" ? 560 : 420` with `stop.dwellMs ?? STOP_DWELL_MS`.
- Replace `routeBlueD`, `routeVioletD`, and `routeRedD` assignments with `geometry.routeByHue.blue`, `geometry.routeByHue.violet`, and `geometry.routeByHue.red`.
- Replace every `STATION_WIDTH` use with `WORLD_LAYOUT.stationWidthPx`.
- Replace every hard-coded world station width `1120px` in the route stylesheet with `var(--world-station-w)`, and set `--world-station-w: {WORLD_LAYOUT.stationWidthPx}px` on `.world-camera` or `.loop-world`.

Do not alter timing/easing in this step: `LEG_PHASES`, the per-leg `carrierScale`/`captionOut` overrides, and `STOP_DWELL_MS` must reproduce today's inline values exactly. The goal is identical visuals with keyed data and index-safe geometry.

#### Anchor-preserving rebuilds

`buildWorld()` reruns on every window resize and on every station `ResizeObserver` change — late images, font swaps, opened `Go deeper` expanders. Today each rebuild recreates the scroll→timeline mapping from scratch, so content growth above the reader can shift which station is on screen mid-read. Make rebuilds anchor-preserving:

- Before `killWorld()`, if a previous timeline exists, capture an anchor from the current playhead: `{ kind: "stop", stopId, frac }` where `stopId` is the last stop whose `stopTimes` entry is ≤ the current time and `frac` is progress toward the next stop's entry, clamped to [0, 1]; if the playhead is past `totalBeforeOverview`, capture `{ kind: "overview", frac }` measured across the overview segment instead.
- After the new timeline, `stopTimes`, `scrollStart`, and `scrollRange` exist — the same place the current code runs the initial `handleScroll()` — map the anchor to a time in the new timeline, then `window.scrollTo({ top: scrollStart() + (time / timeline.duration()) * scrollRange, behavior: "auto" })` and call `renderAtProgress()` once.
- Skip the restore when `initialTarget` is set (deep links win), on the first build (no prior timeline), or when the captured `stopId` no longer exists in the new `stopTimes` (fall back to the current default behavior without throwing).
- The restore must not push history; hash updates already flow through `renderAtProgress()` → `setStationAnchor()`, which uses `history.replaceState`.

### 5. Make `LoopTransition.svelte` consume one typed transition object

Update `src/lib/components/LoopTransition.svelte`:

- import `type FallbackTransition, type LoopDirection, type LoopGlyph, type LoopHue` from `$lib/content/loopPath`;
- delete private `Glyph` and `Hue` type definitions at lines 10-11;
- change props from many primitives to one object:

```ts
let { transition }: { transition: FallbackTransition } = $props();
const { from, to, fromLabel, toLabel, direction = "right", hue = "blue", chip, caption, kicker } = transition;
```

Keep the existing glyph snippets and direction-derived `world`, `fromPos`, `toPos`, `routeD`, and `chipPos` maps. Do not extract the SVG art in this pass; centralizing the data contract is enough.

### 6. Move minimap topology to the registry

Move `EDGES`, `NODES`, `viewBox`, dimensions, and aria label from `src/lib/components/LoopMinimap.svelte` lines 12-62 into `loopPath.ts` as:

```ts
export const MINIMAP_VIEWBOX = "0 0 156 66";
export const MINIMAP_WIDTH = 160;
export const MINIMAP_HEIGHT = 68;
export const MINIMAP_ARIA_LABEL = "Loop map: agent, context window, tokenization, inference, context revisit, tool calling, recap";
export const MINIMAP_EDGES = [/* current EDGES, with from/to ids and hue */] as const satisfies readonly MinimapEdge[];
export const MINIMAP_NODES = [/* current NODES */] as const satisfies readonly MinimapNode[];
```

Update `LoopMinimap.svelte` to import `MINIMAP_*` and `STATIONS` from `loopPath.ts` via `loop.svelte.ts` re-exports where appropriate. Keep the visual SVG paths exactly as-is. Compute `traveled` from `MINIMAP_EDGES.length`, not a local `EDGES.length`. This co-locates route edits and minimap edits without forcing a fully derived minimap layout. `MinimapEdge` carries `hue` while the component currently strokes inline color strings (`c: "var(--m-blue)"` at lines 13-19, applied at line 68): add a local `hue -> color` record in `LoopMinimap.svelte` — `{ blue: "var(--m-blue)", violet: "var(--m-violet)", red: "var(--m-red)" }`, the same mapping `LoopTransition.svelte` already uses — and stroke via it.

Because `MINIMAP_EDGES` and `MINIMAP_NODES` now live in `loopPath.ts`, declare them above the module-load `assertLoopPath()` call so the §1 minimap conditions can validate them.

### 7. Name the ContextRevisit → ToolCalling handoff contract

Update `src/lib/components/ContextRevisit.svelte`: where the revisit bands are rendered at lines 228-229, preserve `data-band={band.key}` and add a semantic handoff marker only to the tools band; and add `data-handoff="revisit-panel"` to the `<figure class="rv-panel" bind:this={figureEl}>` at line 163 (the class stays for styling):

```svelte
<g data-band={band.key} data-handoff={band.key === "tools" ? "tool-definitions-band" : undefined}>
```

Update `src/lib/components/ToolCalling.svelte` lines 563-640 (and the schema markup at line 790):

- add `data-handoff-target="tool-schema-body"` to the `.tx-schema-body` `<rect>` at line 790; the class stays for styling and the GSAP reveal selectors — the data attribute is the contract, the class is presentation, and only the contract may be addressed across chapters;
- import `HANDOFFS` from `$lib/content/loopPath`;
- set `const handoff = HANDOFFS.contextToolsBandToToolSchema;` inside the `onMount()` block before selectors are used;
- replace `"#context-revisit .rv-panel"` with `` `#${handoff.sourceStop} ${handoff.sourcePanelSelector}` ``;
- replace `'#context-revisit [data-band="tools"]'` and `'#context-revisit [data-band="tools"] .band-body'` with queries built from `` `#${handoff.sourceStop} ${handoff.sourceSelector}` ``;
- replace the `.tx-schema-body` queries used for the morph target with `handoff.targetSelector`.

Edge handling: if the handoff source is missing, the overlay morph should skip but the ToolCalling transition must still reach its final visible state. Keep the existing `txTl` reveal path. When `buildOverlay()` cannot find the source band/body, emit a development-only warning with prefix `handoff: missing source` and record it machine-readably so the E2E check can assert on it:

```ts
declare global {
	interface Window {
		__handoffErrors?: string[];
	}
}

if (import.meta.env.DEV) {
	console.warn("handoff: missing source", handoff.id);
	window.__handoffErrors = [...(window.__handoffErrors ?? []), `handoff: missing source ${handoff.id}`];
}
```

Production builds stay silent; graceful degradation is still guaranteed by the `txTl` reveal path.

### 8. Extract high-churn chapter content into pure modules

Create these pure content modules. They may import pure helpers such as `$lib/tokenizer`; they must not import Svelte components, GSAP, `window`, or `document`.

#### `src/lib/content/contextWindow.ts`

Move from `src/lib/components/ContextWindow.svelte` lines 23-99:

- `Kind` renamed to `ContextBandKind`;
- `Band` renamed to `ContextBand`;
- concept color records (`SYSTEM`, `TOOLS`, `HISTORY`, `USER`, `TOOLOUT`, `RESPONSE`);
- `B` renamed to `CONTEXT_BANDS`, declared `as const satisfies Record<string, ContextBand>` instead of the current `Record<string, Band>` annotation — the annotation would widen `keyof typeof` to `string` and defeat the key typing below;
- `export type ContextBandKey = keyof typeof CONTEXT_BANDS;` — the band-key union (`"system" | "tools" | ... | "response3"`);
- `Step` renamed to `ContextStep` and hardened from strings to band keys: `bands: readonly ContextBandKey[]`, `highlight: "all" | readonly ContextBandKey[]`, `entered: readonly ContextBandKey[]` — a typo like `toolout` for `toolout1` becomes a compile error instead of `undefined` reaching `layoutFor()` at runtime;
- `STEPS` renamed to `CONTEXT_STEPS`;
- `MAX = 8000` renamed to `CONTEXT_TOKEN_BUDGET`;
- `LEGEND` derivation as `CONTEXT_LEGEND_KEYS = ["system", "tools", "history", "user", "toolout1", "response1"] as const satisfies readonly ContextBandKey[]`; the component derives `const LEGEND = CONTEXT_LEGEND_KEYS.map((key) => CONTEXT_BANDS[key]);`.

Keep `layoutFor()`, `surfaceFor()`, SVG geometry (`VX`, `VW`, `FLOOR`, `MAXY`), `activateStep()`, and markup in `ContextWindow.svelte`.

Also scope step queries in `ContextWindow.svelte`: bind the section root with `let rootEl: HTMLElement;` and `<section bind:this={rootEl} ...>`, then replace `document.querySelectorAll<HTMLElement>('.ctx-step')` at lines 224 and 236 with `rootEl.querySelectorAll<HTMLElement>('.ctx-step')`.

#### `src/lib/content/toolCalling.ts`

Move from `src/lib/components/ToolCalling.svelte` lines 33-260:

- `RUN_SHELL_SCHEMA`;
- `RUN_SHELL_CALL`;
- `Lit`, `Accent`, `Stage` types;
- `STAGES` renamed to `TOOL_STAGES`;
- `CODE` renamed to `TOOL_ROUTINE_CODE`;
- `STAGE_CODE` renamed to `TOOL_STAGE_CODE`;
- `McpStep` type;
- `MCP` renamed to `MCP_STEPS`;
- `SERVERS` renamed to `MCP_SERVERS`;
- `BASE`, `TOOLDEF`, and `MAX` renamed to `MCP_BASE_TOKENS`, `MCP_TOOLDEF_TOKENS`, and `MCP_TOKEN_BUDGET`.

Keep `ACCENT` in the component because it maps to live CSS custom properties. Keep `mcpLayout()`, `goStage()`, `goMcp()`, observer setup, SVG geometry, and GSAP timelines in the component.

Scope ToolCalling queries: bind the section root with `let rootEl: HTMLElement;` and `<section bind:this={rootEl} id="tools" ...>`. Replace document-wide `.tc-step` and `.tc-mcp-step` queries at lines 318, 518-520, and 532-533 with root-scoped queries.

#### `src/lib/content/tokenization.ts`

Move high-churn text/demo data from `src/lib/components/Tokenization.svelte` lines 25-125:

- `TRANSITION_TEXT = "fix the failing test"` and derived `TRANSITION_TOKENS = tokenize(TRANSITION_TEXT)`;
- `LEDE` renamed to `TOKENIZATION_LEDE_WORDS`;
- `PRESETS` renamed to `TOKENIZATION_PRESETS`;
- `TICKER` renamed to `TOKENIZATION_TICKER`;
- `RECOMBINE` renamed to `TOKENIZATION_RECOMBINE`;
- `GIBBERISH` renamed to `TOKENIZATION_GIBBERISH`;
- number-line source tokens currently in `NUMLINE` source array (`' cat'`, `' the'`, `' straw'`, `' dog'`, `'ing'`, `'berry'`) as `TOKENIZATION_NUMBER_LINE_TOKENS`;
- `EMB_WORDS`, `EMB_GHOSTS`, `EMB_AXES` renamed to `TOKENIZATION_EMBEDDING_WORDS`, `TOKENIZATION_EMBEDDING_GHOSTS`, `TOKENIZATION_EMBEDDING_AXES`;
- `STRAWBERRY_TOKENS = tokenize("strawberry")`.

Keep projection math (`embProj`, `embChipW`, `EMB_CX`, `EMB_CY`, `EMB_R`, `EMB_YAW0`, `EMB_ROW`) and drag/timeline code in `Tokenization.svelte` because those are layout/choreography, not editorial content.

#### `src/lib/content/inference.ts`

Move high-churn text/demo data from `src/lib/components/Inference.svelte` lines 22-260:

- `REPLY` renamed to `INFERENCE_REPLY_TOKENS`;
- `LEDE` renamed to `INFERENCE_LEDE_WORDS`;
- `DistRow` and `DISTS` renamed to `InferenceDistRow` and `INFERENCE_DISTRIBUTIONS`;
- `Cand`, `END`, helper `C`, `CAT_TABLE`, `STORY_TABLE`, `FRANCE_TABLE`, `BARD_TABLE`;
- `NTPreset` and `NT_PRESETS` renamed to `InferencePreset` and `INFERENCE_PRESETS`;
- `MAX_GEN` renamed to `INFERENCE_MAX_GEN`.

Keep SVG geometry (`ROW_TOKENS`, slots, bars, paths), animation helpers, sampling functions, and GSAP timelines in `Inference.svelte`.

After each extraction, update imports and keep names local via aliasing where it minimizes churn. Example: `import { CONTEXT_STEPS as STEPS } from "$lib/content/contextWindow";` is acceptable during migration if it keeps the component diff small.

### 9. Add a tiny shared motion contract module only for repeated constants

Create `src/lib/animation/chapterMotion.ts` after at least `ContextWindow` and `ToolCalling` content extraction compile. Keep it small; do not hide timelines behind an abstraction.

Export:

```ts
export const STEP_ROOT_MARGIN = "-45% 0px -45% 0px";
export const LEDE_SCRUB = { start: "top 78%", end: "top 28%" } as const;

export function scopedStepObserver(
	root: HTMLElement,
	selector: string,
	onIndex: (index: number) => void,
	rootMargin = STEP_ROOT_MARGIN
): () => void {
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const index = Number((entry.target as HTMLElement).dataset.i);
				if (!Number.isNaN(index)) onIndex(index);
			}
		},
		{ rootMargin, threshold: 0 }
	);
	root.querySelectorAll<HTMLElement>(selector).forEach((element) => observer.observe(element));
	return () => observer.disconnect();
}
```

Use `STEP_ROOT_MARGIN` in `ContextWindow.svelte` and `ToolCalling.svelte`. Use `LEDE_SCRUB` in `Tokenization.svelte` and `Inference.svelte` where they currently repeat `start: 'top 78%'` / `end: 'top 28%'`. Do not centralize one-off pin durations such as `'+=170%'`, `'+=280%'`, or `'+=340%'` unless a component has a clear named local constant; those are chapter-specific choreography.

### 10. Normalize stale chapter comments after the code is registry-driven

Once the registry is wired and `bun run check` passes, de-number every top-of-file chapter comment. Policy: no component comment encodes a chapter or station number — correct or not — because registry-driven numbering makes any hard-coded number drift-prone:

- `ContextWindow.svelte` lines 4-5 currently say `Chapter 04` (actual: 02); replace with `Station: context window`.
- `Tokenization.svelte` lines 6-7 currently say `Chapter 02` (actual: 03); replace with `Station: tokenization`.
- `Inference.svelte` lines 5-6 currently say `Chapter 03` (actual: 04); replace with `Station: inference`.
- `ToolCalling.svelte` line 6 currently says `Chapter 05` (currently correct, still drift-prone); replace with `Station: tool calling`.
- `Hero.svelte` line 5 currently says `Station 1`; replace with `Station: agent cold open`.

Do not change visible reader-facing chapter order or copy in this refactor unless it is now imported from the registry/content modules exactly as before.

## Critical files & anchors

- `src/routes/+page.svelte` — route metadata at lines 42-222, geometry at lines 263-307, camera lifecycle at lines 400-855, station/fallback markup at lines 938-1055; primary extraction target. Repeat-pass inner styles (`.repeat-*`) at lines 1168-1193 and 1420-1468 move to `RepeatPass.svelte` with the markup.
- `src/lib/loop.svelte.ts` — station types/data at lines 12-39 and runtime facade at lines 77-127; must preserve public API while importing registry data.
- `src/lib/components/LoopMinimap.svelte` — hard-coded minimap edges/nodes at lines 12-47; move topology to registry so route and minimap cannot drift.
- `src/lib/components/LoopTransition.svelte` — duplicate glyph/hue prop types at lines 10-33 and fallback glyph snippets at lines 85-162; convert to a typed presentational component.
- `src/lib/components/ToolCalling.svelte` — hidden cross-chapter morph contract at lines 563-640; replace private `#context-revisit [data-band="tools"]` knowledge with the named handoff contract.

## Verification

Run verification from the repository root `/Users/sebas/code/innerloop`. Do not run project-wide commands until the implementation compiles locally enough to make failures meaningful.

### Static checks

1. Type/Svelte check:

```sh
bun run check
```

Expected: exits 0. This runs `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json` from `package.json`.

2. Static build:

```sh
bun run build
```

Expected: exits 0 and produces a static adapter build under `build/`.

3. Content/search acceptance after migration:

- In `src/routes/+page.svelte`, no remaining local definitions or references to `CAPTION_COPY`, `CARRIER_CHIPS`, `FALLBACK_TRANSITIONS`, `STOP_COLUMNS`, `measured[7]`, `i === 4`, `i === 3`, or `? 560 : 420`.
- In `src/routes/+page.svelte`, carrier/caption phase fractions and the zero-travel dwell come from `LEG_PHASES`, per-leg overrides, and `STOP_DWELL_MS`; no inline `0.16`/`0.68`/`0.82`/`0.18` leg fractions remain in the camera build.
- In `src/routes/+page.svelte`, no hard-coded `width: 1120px`; station width must come from `WORLD_LAYOUT.stationWidthPx` via `--world-station-w`.
- In `src/lib/components/ToolCalling.svelte`, no raw `#context-revisit [data-band="tools"]` selector; it must use `HANDOFFS.contextToolsBandToToolSchema`.
- In `ContextWindow.svelte` and `ToolCalling.svelte`, no document-wide `.ctx-step`, `.tc-step`, or `.tc-mcp-step` queries; they must be scoped to the component root or use `scopedStepObserver()`.
- In `Hero.svelte`, `ContextWindow.svelte`, `Tokenization.svelte`, `Inference.svelte`, and `ToolCalling.svelte`, no hard-coded `data-chapter="0` or visible `Chapter 0` string remains; numbered labels must use `chapterNumberFor()`.
- In `ContextWindow.svelte`, `Tokenization.svelte`, `Inference.svelte`, `ToolCalling.svelte`, and `Hero.svelte`, top-of-file comments must no longer encode chapter or station numbers.
- In `ContextRevisit.svelte`, no `data-chapter` attribute remains.
- In `src/routes/+page.svelte`, no `.repeat-rail`, `.repeat-copy`, `.repeat-dot`, or `.repeat-line` style rules remain; only the `.world-repeat` wrapper rules stay in the route stylesheet.

### Browser / E2E checks with `agent-browser`

Before starting a dev server, check whether one is already listening on port 5173 and reuse it if present:

```sh
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

If no server is running, start one in a separate terminal/job:

```sh
bun run dev -- --host 127.0.0.1
```

Use `http://127.0.0.1:5173/` for the following checks.

1. Desktop enhanced-world overlap smoke:

```sh
agent-browser --session innerloop-resilience set viewport 1440 1000
agent-browser --session innerloop-resilience open http://127.0.0.1:5173/
agent-browser --session innerloop-resilience wait 1200
agent-browser --session innerloop-resilience eval "(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const samples = []; const overlaps = []; const selectors = '.world-station, .world-repeat'; const maxY = Math.max(0, document.documentElement.scrollHeight - innerHeight); for (let y = 0; y <= maxY; y += Math.max(360, Math.floor(innerHeight * 0.45))) { scrollTo(0, y); await sleep(120); const visible = [...document.querySelectorAll(selectors)].map((el) => ({ el, rect: el.getBoundingClientRect(), opacity: Number(getComputedStyle(el).opacity || 1), display: getComputedStyle(el).display, visibility: getComputedStyle(el).visibility })).filter((item) => item.display !== 'none' && item.visibility !== 'hidden' && item.opacity > 0.05 && item.rect.bottom > 0 && item.rect.top < innerHeight && item.rect.right > 0 && item.rect.left < innerWidth); samples.push({ y, visible: visible.length, hash: location.hash }); for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) { const a = visible[i].rect; const b = visible[j].rect; const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)); const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)); if (w * h > 16) overlaps.push({ y, a: visible[i].el.className, b: visible[j].el.className, area: Math.round(w * h) }); } } return { samples: samples.length, overlapCount: overlaps.length, overlaps: overlaps.slice(0, 5) }; })()"
```

Expected: returned object has `overlapCount: 0`. A non-zero overlap means the geometry/rendering migration changed station visibility or camera placement.

2. Deep-link station sync:

```sh
agent-browser --session innerloop-resilience open http://127.0.0.1:5173/#tokenization
agent-browser --session innerloop-resilience wait 1200
agent-browser --session innerloop-resilience eval "({ hash: location.hash, label: document.querySelector('.mm-label')?.textContent?.trim(), current: document.querySelector('[aria-current=location]')?.getAttribute('href') })"

agent-browser --session innerloop-resilience open http://127.0.0.1:5173/#context-revisit
agent-browser --session innerloop-resilience wait 1200
agent-browser --session innerloop-resilience eval "({ hash: location.hash, label: document.querySelector('.mm-label')?.textContent?.trim(), current: document.querySelector('[aria-current=location]')?.getAttribute('href') })"

agent-browser --session innerloop-resilience open http://127.0.0.1:5173/#recap
agent-browser --session innerloop-resilience wait 1200
agent-browser --session innerloop-resilience eval "({ hash: location.hash, label: document.querySelector('.mm-label')?.textContent?.trim(), current: document.querySelector('[aria-current=location]')?.getAttribute('href') })"
```

Expected: each result’s `hash` and `current` match the requested hash; labels are `tokenization`, `context window · again` for `context-revisit` (the wayfinding `mapLabel` — must remain literally this string, unchanged from today's masthead), and `the whole loop` for recap.

3. Reduced-motion/static fallback check:

```sh
agent-browser --session innerloop-resilience-rm set viewport 390 844
agent-browser --session innerloop-resilience-rm set media light reduced-motion
agent-browser --session innerloop-resilience-rm open http://127.0.0.1:5173/
agent-browser --session innerloop-resilience-rm wait 1000
agent-browser --session innerloop-resilience-rm eval "({ enhanced: document.documentElement.dataset.loopWorld, transitionCount: document.querySelectorAll('.lt').length, visibleSections: [...document.querySelectorAll('main section[id]')].map((s) => s.id) })"
```

Expected: `enhanced` is absent/undefined, `transitionCount` is `6`, and `visibleSections` includes `agent-loop`, `context`, `tokenization`, `inference`, `context-revisit`, `tools`, and `recap`. This proves fallback transitions are generated intentionally from the registry and reduced motion still has readable sections.

4. Handoff fallback check:

```sh
agent-browser --session innerloop-resilience-rm open http://127.0.0.1:5173/#tools
agent-browser --session innerloop-resilience-rm wait 1200
agent-browser --session innerloop-resilience-rm eval "({ source: Boolean(document.querySelector('#context-revisit [data-handoff=\"tool-definitions-band\"]')), panel: Boolean(document.querySelector('#context-revisit [data-handoff=\"revisit-panel\"]')), target: Boolean(document.querySelector('#tools [data-handoff-target=\"tool-schema-body\"]')), errors: window.__handoffErrors ?? null })"
```

Expected: `source: true`, `panel: true`, `target: true`, and `errors: null`. The `__handoffErrors` global is real dev-only instrumentation (§7), so `null` against the dev server now proves the overlay found its endpoints — not merely that the global never existed. If `source` or `panel` is false, ContextRevisit lost a semantic handoff marker; if `target` is false, ToolCalling lost `data-handoff-target`.

5. Content-height resilience smoke:

Before final cleanup, temporarily lengthen one paragraph in `src/lib/content/contextWindow.ts` or `src/lib/content/toolCalling.ts` by two sentences, rerun the desktop enhanced-world overlap smoke, then revert the temporary text. Expected: `overlapCount: 0`; later stops shift because geometry reads station heights instead of relying on fixed y positions.

6. Rebuild scroll-anchor smoke:

```sh
agent-browser --session innerloop-resilience open http://127.0.0.1:5173/#inference
agent-browser --session innerloop-resilience wait 1500
agent-browser --session innerloop-resilience eval "(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const host = document.querySelector('[data-loop-anchor-id=\"context\"]') ?? document.querySelector('#context'); const spacer = document.createElement('div'); spacer.style.height = '900px'; host.appendChild(spacer); await sleep(1400); const station = document.querySelector('[data-loop-anchor-id=\"inference\"]') ?? document.querySelector('#inference'); const rect = station.getBoundingClientRect(); const wrapper = station.closest('.world-station') ?? station; const result = { hash: location.hash, stationOnScreen: rect.bottom > 0 && rect.top < innerHeight, wrapperOpacity: Number(getComputedStyle(wrapper).opacity || 1) }; spacer.remove(); await sleep(1400); return result; })()"
```

Expected: `hash` is `#inference`, `stationOnScreen: true`, `wrapperOpacity` ≥ 0.5. Growing an earlier station forces a `ResizeObserver` rebuild while the reader sits mid-route; without anchor preservation the remapped scroll leaves the viewport on a different station and rewrites the hash. The trailing sleep lets the post-cleanup rebuild settle before later checks reuse the session.

7. RepeatPass style ownership smoke:

```sh
agent-browser --session innerloop-resilience eval "getComputedStyle(document.querySelector('.world-repeat .repeat-line')).height"
agent-browser --session innerloop-resilience-rm eval "getComputedStyle(document.querySelector('.world-repeat .repeat-rail')).display"
```

Expected: `4px` from the enhanced session (the media-query variant survived the move into `RepeatPass.svelte`) and `none` from the reduced-motion session (the base variant survived). `auto`/`0px` or `flex` means the style migration dropped a variant to Svelte scoping.

## Assumptions & contingencies

- Preserve the current rendered route order and reader-facing copy. The repo/product context describes a seven-chapter path, but the current implemented route is `agent-loop -> context -> tokenization -> inference -> context-revisit -> tools -> repeat-pass -> recap`; this refactor makes that path safe to change later, but does not reorder or add chapters now.
- No new package dependency is required. Use TypeScript/Svelte checks, module-level assertions, search acceptance, and `agent-browser` smoke checks instead of adding a test runner.
- Keep data modules pure. If an import cycle appears, the mistake is almost certainly a content module importing a Svelte component or `loop.svelte.ts`; move component mapping back to `+page.svelte` and keep `loopPath.ts` component-free.
- If Svelte dynamic component syntax differs under the installed Svelte 5 compiler, use `<svelte:component this={...} />` as the fallback rendering syntax. The registry shape and route behavior do not change.
- If extracting every high-churn chapter content file in one pass makes review too large, complete the route registry/geometry/minimap/handoff work first, then extract content modules in this order without changing the final scope: `contextWindow.ts`, `toolCalling.ts`, `tokenization.ts`, `inference.ts`. Do not yield after a partial extraction; the deliverable is the full content/transition resilience refactor.
- Anchor-preserving restore is best effort. If a captured `stopId` vanishes because of a future path edit, or the rebuild races a deep link, fall back to the existing behavior (default scroll or `initialTarget`) without throwing; the restore must never fight `worldScrollTo`.
- Slide confinement (fixed viewport-cell stations whose content translates inside a clipped frame) was considered and deliberately deferred. Camera-y travel across a tall station is isomorphic to inner-content translation for chapter internals — station triggers key off the master timeline via `containerAnimation`, not world y — so confinement would buy content-independent world coordinates and cheaper rebuilds, but requires a clipping/portal policy for cross-station overlays (the ToolCalling band morph overlay lives on `document.body`) and a second layout mode beside the fallback flow. The registry/geometry split in this plan keeps that evolution possible later without another data-model change.
- This refactor is not seven-chapter readiness. The registry's literal types (`chapterNumber?: "01" | ... | "05"`, `column: 0 | 1 | 2 | 3`, `row: 0 | 1`) deliberately encode the current topology; adding the future context-engineering and harness-engineering chapters will require widening these types — a conscious, compiler-surfaced registry edit, which is the fail-fast design working as intended. Call this out in the implementation PR so reviewers do not mistake the registry for the product's seven-chapter target path.
