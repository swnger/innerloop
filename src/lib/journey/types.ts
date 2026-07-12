/**
 * The Inner Loop v2 — journey contracts.
 *
 * This file is the single source of truth for every cross-module interface
 * in the rewrite (see docs/plans/v2-rewrite.md). Stations, transitions,
 * travelers, layout, and the orchestrator all compile against these types
 * and never against each other's internals.
 *
 * Maintainability guarantees encoded here:
 * - Stations query DOM only under `ctx.root`, never create ScrollTriggers,
 *   never import gsap directly, and know nothing about the world/camera.
 * - Transitions are the only code that sees two stations at once — and only
 *   via ports and travelers.
 * - The master timeline (owned by the orchestrator) is the ONLY paused
 *   timeline; station/transition `build()` returns an ACTIVE (unpaused)
 *   timeline, otherwise it would contribute zero duration to the master.
 */
import type { gsap as gsapStatic } from 'gsap';

export type GsapStatic = typeof gsapStatic;
export type Timeline = gsap.core.Timeline;

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export type StationNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Direction = 'right' | 'down' | 'left' | 'up';

/** World-space position of a station, in whole viewports. */
export interface WorldPosition {
	/** Column, in viewport widths (100svw units). */
	x: number;
	/** Row, in viewport heights (100svh units). */
	y: number;
}

/* ------------------------------------------------------------------ */
/* Ports and travelers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Dock points inside a station scene. The scene marks them with
 * `data-port="<name>"`; the handle exposes lazy getters so a port that
 * only exists after a beat still resolves at flight time.
 */
export type PortName =
	| 'prompt-out'
	| 'prompt-in'
	| 'tokens-out'
	| 'tokens-in'
	| 'context-out'
	| 'context-in'
	| 'response-out'
	| 'response-in'
	| 'answer-in'
	| 'loop-diagram';

/**
 * The four travelers. Each is ONE DOM element for the whole page lifetime
 * (`token-stream` is one wrapper element containing TokenChip children).
 */
export type TravelerId = 'prompt-card' | 'token-stream' | 'context-band' | 'response-card';

/* ------------------------------------------------------------------ */
/* Stations                                                            */
/* ------------------------------------------------------------------ */

/** Node of the agent loop a station belongs to (LoopMap grouping). */
export type LoopNode = 'user' | 'context' | 'llm' | 'tool' | 'harness';

/** Concept hue tokens from app.css (`--concept-*`). */
export type ConceptHue = 'system' | 'history' | 'user' | 'tools' | 'tool-output' | 'response';

export interface StationMeta {
	/** Kebab-case id, also the deep-link hash (e.g. 'agent-loop'). */
	id: string;
	number: StationNumber;
	title: string;
	loopNode: LoopNode;
	accent: ConceptHue;
	/** Scroll distance of the parked (camera-still) segment, in vh. */
	lengthVh: number;
}

/**
 * Everything a station may touch of the outside world. Handed to
 * `build()` / `applyStatic()` by the orchestrator.
 */
export interface StationContext {
	gsap: GsapStatic;
	/** The station's scene element. ALL DOM queries stay under it. */
	root: HTMLElement;
	/** True on the reduced-motion branch. */
	reduced: boolean;
	/** True on the compact (≤760px) branch. */
	mobile: boolean;
	/** Resolve a CSS custom property (e.g. 'concept-response') at call time. */
	color: (token: string) => string;
	/**
	 * The ONLY way stations trigger re-measurement after interactive
	 * reflow (GoDeeper opening, demo output growing). Debounced centrally.
	 */
	requestMeasure: () => void;
}

export interface StationHandle {
	meta: StationMeta;
	sceneEl: HTMLElement;
	/** Lazy dock getters — resolved at flight time, never cached. */
	ports: Partial<Record<PortName, () => Element | null>>;
	/**
	 * Build the station's internal timeline. MUST return an ACTIVE
	 * (unpaused) timeline; the orchestrator rescales it to `lengthVh`.
	 * Runs inside a gsap.context() that is reverted on error, restoring
	 * the SSR-visible state.
	 */
	build: (ctx: StationContext) => Timeline;
	/**
	 * Reduced-motion / compact end-state. Default expectation: the SSR
	 * HTML already IS the end state, so most stations no-op here.
	 */
	applyStatic: (ctx: StationContext) => void;
	onDock?: (traveler: TravelerId, port: PortName) => void;
	onUndock?: (traveler: TravelerId, port: PortName) => void;
}

/** Prop contract for every station Scene component. */
export interface SceneProps {
	/** Called once on mount with the station's handle. */
	register: (handle: StationHandle) => void;
}

/* ------------------------------------------------------------------ */
/* Transitions                                                         */
/* ------------------------------------------------------------------ */

export interface TransitionContext {
	gsap: GsapStatic;
	reduced: boolean;
	/** Derived by layout.ts from the from→to position delta. */
	direction: Direction;
	fromRoot: HTMLElement;
	toRoot: HTMLElement;
	port: (station: 'from' | 'to', name: PortName) => Element | null;
	traveler: (id: TravelerId) => HTMLElement;
}

export interface TravelerRoute {
	id: TravelerId;
	fromPort: PortName;
	toPort: PortName;
	/** Perpendicular quadratic Bézier bow as a fraction of flight distance. */
	arc?: number;
}

/**
 * Flight choreography between two stations. Directions/lengths are NOT
 * stored here — they live once in the manifest ledger; layout.ts derives
 * `ctx.direction` from the from→to delta.
 */
export interface StationTransition {
	/** 't12' … 't71'. */
	id: string;
	/** Station ids. */
	from: string;
	to: string;
	travelers: TravelerRoute[];
	/** ACTIVE timeline — runs in parallel with the camera tween. */
	build: (ctx: TransitionContext) => Timeline;
	/** One plain sentence — the reduced-motion/mobile connective text. */
	caption: string;
}

/* ------------------------------------------------------------------ */
/* Manifest (pure data — no component imports, unit-testable in node)  */
/* ------------------------------------------------------------------ */

/** Geometry ledger for the transition leaving a station. */
export interface TransitionSpec {
	id: string;
	direction: Direction;
	/** Whole viewports crossed (t71 climbs two rows → 2). Default 1. */
	steps: number;
	/** Scroll distance of the camera travel, in vh (100 per step). */
	lengthVh: number;
}

export interface StationManifestEntry {
	meta: StationMeta;
	/** The transition leaving this station (every station has one — the loop closes). */
	exit: TransitionSpec;
}

/* ------------------------------------------------------------------ */
/* Segment table                                                       */
/* ------------------------------------------------------------------ */

/**
 * One scroll segment of the master timeline. Derived from the manifest by
 * layout.ts — the single source for deep links, LoopMap, placeFor, and
 * active/inert station selection.
 */
export interface Segment {
	/** Station id or transition id. */
	id: string;
	kind: 'station' | 'transition';
	/**
	 * The accessible station for this segment: the station itself, or a
	 * transition's DESTINATION station.
	 */
	stationId: string;
	lengthVh: number;
	/** Cumulative vh at segment start/end. */
	startVh: number;
	endVh: number;
	/** Normalized master-timeline progress (0..1) at start/end. */
	startProgress: number;
	endProgress: number;
}

export interface SegmentTable {
	segments: Segment[];
	totalVh: number;
	/** Segment containing `progress` (clamped). */
	at: (progress: number) => Segment;
	/** Segment by id, or undefined. */
	byId: (id: string) => Segment | undefined;
}

/* ------------------------------------------------------------------ */
/* Traveler layer                                                      */
/* ------------------------------------------------------------------ */

/** Where a traveler is docked when no transition is in flight. */
export interface TravelerDock {
	stationId: string;
	port: PortName;
}

/**
 * Imperative API of TravelerLayer.svelte / layer.ts. The layer is a child
 * of `world`; flights happen in world coordinates.
 */
export interface TravelerLayerApi {
	/** The traveler's single DOM element (never cloned). */
	el: (id: TravelerId) => HTMLElement;
	/** Reparent into the layer at its current world position (Flip-measured). */
	adopt: (id: TravelerId) => void;
	/** Reparent into a station port as a normal child. */
	deposit: (id: TravelerId, dock: TravelerDock) => void;
	/**
	 * Pure, idempotent state machine: for any master progress, put every
	 * traveler in its deterministic state (docked at a port, or in flight
	 * at flight-progress p). Every entry path converges here — scrub,
	 * jumps, deep links, reloads, branch switches.
	 */
	placeFor: (progress: number) => void;
	/** Return every traveler to its home port (teardown / resetToStatic). */
	home: () => void;
}
