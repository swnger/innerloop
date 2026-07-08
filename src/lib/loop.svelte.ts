import { browser } from '$app/environment';
import { STATIONS, type LoopNodeId as NodeId, type Station, type StationId, type WorldStopId } from '$lib/content/loopPath';

/**
 * Loop-spine state — the single source of truth for "where on the agent
 * loop is the reader right now".
 *
 * The page is one continuous lap: agent → context window → tokenization →
 * inference → context window (revisit) → tool calling → recap. Stations
 * report themselves via an IntersectionObserver in `+page.svelte`; the
 * header mini-map renders from this state.
 */

export { STATIONS, type NodeId, type Station, type StationId, type WorldStopId };

export const stationIndex = (id: StationId) => STATIONS.findIndex((s) => s.id === id);

let current = $state<StationId>('agent-loop');

/**
 * The master camera timeline (the world scrub). When the macro camera runs,
 * this is the GSAP timeline whose playhead the page scrubs with scroll.
 * Station-internal ScrollTriggers read it via `containerAnimation` so their
 * scrubs track the camera — not window-scroll measured through a transformed
 * ancestor (which mis-measures and fires early). Undefined outside the
 * enhanced world or before build.
 */
export type CameraTimeline = {
	progress: (value?: number, suppressEvents?: boolean) => number;
	duration: () => number;
	time: () => number;
};

let containerAnimation: CameraTimeline | undefined;

/**
 * Station-internal ScrollTriggers that must bind to the camera timeline
 * (via GSAP `containerAnimation`) register a rebuild factory here. The page
 * calls `setContainerAnimation` when the master timeline is (re)built — on
 * first build and on every resize-rebuild — and every factory rebuilds its
 * triggers against the fresh timeline. This is what keeps station scrubs
 * aligned with the camera through resizes, and resolves the mount-order race
 * (stations mount before the page has built the timeline).
 */
export type WorldTriggerFactory = {
	rebuild: (tl: CameraTimeline | undefined) => void;
};
const worldFactories = new Set<WorldTriggerFactory>();

let progress = $state(0);

/**
 * Progress *within the current stop's own scrub window* (the dwell or the
 * readable descent), 0→1. Published by the page's master-scrub render so a
 * station can run a chapter-local, viewport-parked animation off it without
 * measuring window-scroll through the transformed camera. `stop` is undefined
 * on legs / overview, where no single station owns the playhead.
 */
let stationProgress = $state<{ stop: WorldStopId | undefined; frac: number }>({ stop: undefined, frac: 0 });

/** True while the pinned 2D camera world is mounted (macro mode). */
let worldEnhanced = $state(false);

export const loop = {
	get current(): StationId {
		return current;
	},
	get index(): number {
		return stationIndex(current);
	},
	get progress(): number {
		return progress;
	},
	set(id: StationId) {
		current = id;
	},
	setProgress(value: number) {
		progress = Math.max(0, Math.min(1, value));
	},
	get stationProgress(): { stop: WorldStopId | undefined; frac: number } {
		return stationProgress;
	},
	setStationProgress(stop: WorldStopId | undefined, frac: number) {
		stationProgress = { stop, frac: Math.max(0, Math.min(1, frac)) };
	},
	get worldEnhanced(): boolean {
		return worldEnhanced;
	},
	setWorldEnhanced(value: boolean) {
		worldEnhanced = value;
	},
	get containerAnimation(): CameraTimeline | undefined {
		return containerAnimation;
	},
	setContainerAnimation(tl: CameraTimeline | undefined) {
		containerAnimation = tl;
		for (const factory of worldFactories) factory.rebuild(tl);
	},
	/**
	 * Register a factory whose `rebuild` (re)creates the station's
	 * camera-bound ScrollTriggers. Called immediately with the current
	 * timeline (possibly undefined), and again whenever the page swaps in a
	 * new master timeline. Returns an unregister fn.
	 */
	registerWorldTriggers(factory: WorldTriggerFactory) {
		worldFactories.add(factory);
		factory.rebuild(containerAnimation);
		return () => {
			worldFactories.delete(factory);
		};
	}
};

/**
 * Can the macro camera run? Mirrors DESIGN.md's diagram-reflow policy,
 * generalized to the whole nav: no pinned 2D travel under reduced motion,
 * on touch-primary pointers, or below 768px. Callers re-check on resize
 * via ScrollTrigger's own matchMedia handling where needed.
 */
export function macroCapable(): boolean {
	if (!browser) return false;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
	if (window.matchMedia('(pointer: coarse)').matches) return false;
	if (window.innerWidth < 768) return false;
	return true;
}
