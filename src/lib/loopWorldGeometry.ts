import type { WorldStopId, LoopStop, LoopHue, LoopLeg } from '$lib/content/loopPath';

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

export type StopHeights = Partial<Record<WorldStopId, number>>;

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

type Point = { x: number; y: number };

// Collapse consecutive identical vertices (both axes) before serializing. The
// hand-sliced routes in the old +page.svelte pushed each shared vertex once;
// per-leg generation repeats the shared endpoint between adjacent legs, so
// collapsing keeps the emitted path byte-identical.
const collapse = (points: Point[]): Point[] => {
	const out: Point[] = [];
	for (const point of points) {
		const last = out[out.length - 1];
		if (last && last.x === point.x && last.y === point.y) continue;
		out.push(point);
	}
	return out;
};

const poly = (points: Point[]): string =>
	collapse(points)
		.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
		.join(' ');

export function buildWorldGeometry({
	stops,
	legs,
	heights,
	viewportWidth,
	viewportHeight,
	config
}: {
	stops: readonly LoopStop[];
	legs: readonly LoopLeg[];
	heights: StopHeights;
	viewportWidth: number;
	viewportHeight: number;
	config: WorldLayoutConfig;
}): WorldGeometry {
	const columnPitch = Math.ceil(viewportWidth + config.stationWidthPx + config.minTransitClearancePx * 2);
	const dropGap = Math.max(config.rowGutterPx, viewportHeight * 2 + config.minTransitClearancePx * 2);

	const measured: MeasuredStop[] = [];
	for (let i = 0; i < stops.length; i += 1) {
		const stop = stops[i];
		const height = heights[stop.id] ?? viewportHeight;
		const travel = Math.max(0, height - viewportHeight);
		let x: number;
		let y: number;
		if (i === 0) {
			x = 0;
			y = 0;
		} else {
			const previous = measured[i - 1];
			x = stop.column * columnPitch;
			y = previous.y + previous.travel + (stop.row !== previous.row ? dropGap : 0);
		}
		measured.push({ ...stop, x, y, height, travel });
	}

	const routePoint = (stop: MeasuredStop): Point => ({
		x: stop.x + config.stationWidthPx / 2,
		y: stop.y + config.routeYOffsetPx
	});
	const departPoint = (stop: MeasuredStop): Point => ({
		x: stop.x + config.stationWidthPx / 2,
		y: stop.y + stop.travel + config.routeYOffsetPx
	});

	const stopById = new Map<WorldStopId, MeasuredStop>(measured.map((stop) => [stop.id, stop]));

	const legSegments = (leg: LoopLeg): Point[] => {
		const from = stopById.get(leg.from);
		const to = stopById.get(leg.to);
		if (!from || !to) return [];
		return [routePoint(from), departPoint(from), routePoint(to)];
	};

	const fullPoints: Point[] = [];
	for (const leg of legs) fullPoints.push(...legSegments(leg));
	const fullRouteD = poly(fullPoints);

	const hues: LoopHue[] = ['blue', 'violet', 'red'];
	const routeByHue = {} as Record<LoopHue, string>;
	for (const hue of hues) {
		const points: Point[] = [];
		for (const leg of legs) {
			if (leg.hue !== hue) continue;
			points.push(...legSegments(leg));
		}
		routeByHue[hue] = poly(points);
	}

	let maxRight = 0;
	let maxBottom = 0;
	for (const stop of measured) {
		const route = routePoint(stop);
		maxRight = Math.max(maxRight, stop.x + config.stationWidthPx, route.x);
		maxBottom = Math.max(maxBottom, stop.y + stop.height, route.y);
	}
	const width = Math.ceil(maxRight + config.worldPaddingPx);
	const height = Math.ceil(maxBottom + config.worldPaddingPx);

	return { stops: measured, width, height, fullRouteD, routeByHue };
}
