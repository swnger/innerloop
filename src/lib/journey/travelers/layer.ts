import type {
	GsapStatic,
	Segment,
	StationTransition,
	TravelerDock,
	TravelerId,
	TravelerLayerApi,
	TravelerRoute,
	StationHandle,
	SegmentTable
} from '$lib/journey/types';

export interface TravelerLayerDeps {
	gsap: GsapStatic;
	world: HTMLElement;
	layerEl: HTMLElement;
	table: SegmentTable;
	transitions: Record<string, StationTransition>;
	handle: (id: string) => StationHandle | undefined;
}

const HOME: Readonly<Record<TravelerId, TravelerDock>> = {
	'prompt-card': { stationId: 'agent-loop', port: 'prompt-out' },
	'token-stream': { stationId: 'tokenization', port: 'tokens-out' },
	'context-band': { stationId: 'context-window', port: 'context-out' },
	'response-card': { stationId: 'inference', port: 'response-out' }
};

const TRAVELERS: readonly TravelerId[] = [
	'prompt-card',
	'token-stream',
	'context-band',
	'response-card'
];

/** Return an element's coordinates in the local (unscaled) world space. */
export function worldPoint(el: Element, world: HTMLElement): { x: number; y: number } {
	const rect = el.getBoundingClientRect();
	const worldRect = world.getBoundingClientRect();
	return { x: rect.left - worldRect.left, y: rect.top - worldRect.top };
}

/** Build the imperative layer API around one, cached DOM node per traveler. */
export function createTravelerLayer(deps: TravelerLayerDeps): TravelerLayerApi {
	const elements = new Map<TravelerId, HTMLElement>();
	for (const id of TRAVELERS) {
		const found = deps.world.querySelector<HTMLElement>(`[data-traveler="${id}"]`);
		if (!found) throw new Error(`Traveler element not found: ${id}`);
		elements.set(id, found);
	}

	const dockedAt = new Map<TravelerId, TravelerDock>();

	const getElement = (id: TravelerId): HTMLElement => {
		const found = elements.get(id);
		if (!found) throw new Error(`Traveler element not found: ${id}`);
		return found;
	};

	const sameDock = (a: TravelerDock | undefined, b: TravelerDock): boolean =>
		a?.stationId === b.stationId && a.port === b.port;

	const undock = (id: TravelerId): void => {
		const previous = dockedAt.get(id);
		if (!previous) return;
		deps.handle(previous.stationId)?.onUndock?.(id, previous.port);
		dockedAt.delete(id);
	};

	const el = (id: TravelerId): HTMLElement => getElement(id);

	const adopt = (id: TravelerId): void => {
		const traveler = getElement(id);
		const point = worldPoint(traveler, deps.world);
		undock(id);
		if (traveler.parentElement !== deps.layerEl) deps.layerEl.appendChild(traveler);
		deps.gsap.set(traveler, {
			position: 'absolute',
			left: 0,
			top: 0,
			x: point.x,
			y: point.y
		});
	};

	const deposit = (id: TravelerId, dock: TravelerDock): void => {
		const traveler = getElement(id);
		const port = deps.handle(dock.stationId)?.ports[dock.port]?.();
		if (!port) {
			// A lazy port may not exist until a scene beat has rendered. Keep the
			// traveler visible in the layer rather than dropping the handoff.
			if (traveler.parentElement !== deps.layerEl) adopt(id);
			return;
		}

		if (traveler.parentElement === port && sameDock(dockedAt.get(id), dock)) return;
		undock(id);
		deps.gsap.set(traveler, { clearProps: 'x,y,left,top,position' });
		if (traveler.parentElement !== port) port.appendChild(traveler);
		dockedAt.set(id, dock);
		deps.handle(dock.stationId)?.onDock?.(id, dock.port);
	};

	const placeFlight = (
		id: TravelerId,
		segment: Segment,
		transition: StationTransition,
		route: TravelerRoute,
		progress: number
	): void => {
		const fromPort = deps.handle(transition.from)?.ports[route.fromPort]?.();
		const toPort = deps.handle(transition.to)?.ports[route.toPort]?.();
		if (!fromPort || !toPort) {
			adopt(id);
			return;
		}
		const from = worldPoint(fromPort, deps.world);
		const to = worldPoint(toPort, deps.world);
		adopt(id);
		const span = segment.endProgress - segment.startProgress;
		const local = span > 0 ? Math.max(0, Math.min(1, (progress - segment.startProgress) / span)) : 1;
		deps.gsap.set(getElement(id), {
			x: from.x + (to.x - from.x) * local,
			y: from.y + (to.y - from.y) * local
		});
	};

	const placeFor = (rawProgress: number): void => {
		const progress = Math.max(0, Math.min(1, rawProgress));
		for (const id of TRAVELERS) {
			let completed: { transition: StationTransition; route: TravelerRoute } | undefined;
			let flight:
				| { segment: Segment; transition: StationTransition; route: TravelerRoute }
				| undefined;

			for (const segment of deps.table.segments) {
				if (segment.kind !== 'transition') continue;
				const transition = deps.transitions[segment.id];
				if (!transition) continue;
				const route = transition.travelers.find((candidate) => candidate.id === id);
				if (!route) continue;
				if (segment.endProgress <= progress) {
					completed = { transition, route };
					continue;
				}
				if (segment.startProgress <= progress && progress < segment.endProgress) {
					flight = { segment, transition, route };
					break;
				}
			}

			if (flight) {
				placeFlight(id, flight.segment, flight.transition, flight.route, progress);
			} else if (completed) {
				deposit(id, { stationId: completed.transition.to, port: completed.route.toPort });
			} else {
				deposit(id, HOME[id]);
			}
		}
	};

	const home = (): void => {
		for (const id of TRAVELERS) deposit(id, HOME[id]);
	};

	return { el, adopt, deposit, placeFor, home };
}
