import type {
	Direction,
	Segment,
	SegmentTable,
	StationManifestEntry,
	WorldPosition,
} from './types';

/** Journey scroll budget in viewport-height units. */
export const JOURNEY_BUDGET_VH = 3200;

const DIRECTION_VECTORS: Record<Direction, WorldPosition> = {
	right: { x: 1, y: 0 },
	down: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
	up: { x: 0, y: -1 },
};

/** Place each station by accumulating its predecessor's exit vector. */
export function layoutCircuit(entries: StationManifestEntry[]): Map<string, WorldPosition> {
	const positions = new Map<string, WorldPosition>();
	let current: WorldPosition = { x: 0, y: 0 };

	for (const entry of entries) {
		positions.set(entry.meta.id, { ...current });
		const vector = DIRECTION_VECTORS[entry.exit.direction];
		current = {
			x: current.x + vector.x * entry.exit.steps,
			y: current.y + vector.y * entry.exit.steps,
		};
	}

	return positions;
}

/** Build normalized station/transition segments in manifest order. */
export function buildSegmentTable(entries: StationManifestEntry[]): SegmentTable {
	const segments: Segment[] = [];
	let cursorVh = 0;

	entries.forEach((entry, index) => {
		const stationStartVh = cursorVh;
		cursorVh += entry.meta.lengthVh;
		segments.push({
			id: entry.meta.id,
			kind: 'station',
			stationId: entry.meta.id,
			lengthVh: entry.meta.lengthVh,
			startVh: stationStartVh,
			endVh: cursorVh,
			startProgress: 0,
			endProgress: 0,
		});

		const transitionStartVh = cursorVh;
		cursorVh += entry.exit.lengthVh;
		const destination = entries[(index + 1) % entries.length]?.meta.id ?? entry.meta.id;
		segments.push({
			id: entry.exit.id,
			kind: 'transition',
			stationId: destination,
			lengthVh: entry.exit.lengthVh,
			startVh: transitionStartVh,
			endVh: cursorVh,
			startProgress: 0,
			endProgress: 0,
		});
	});

	const totalVh = cursorVh;
	for (const segment of segments) {
		segment.startProgress = totalVh === 0 ? 0 : segment.startVh / totalVh;
		segment.endProgress = totalVh === 0 ? 0 : segment.endVh / totalVh;
	}
	const segmentById = new Map<string, Segment>();
	for (const segment of segments) segmentById.set(segment.id, segment);

	return {
		segments,
		totalVh,
		at(progress: number): Segment {
			if (segments.length === 0) {
				throw new RangeError('Cannot locate a segment in an empty table');
			}

			const clamped = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
			for (let index = 0; index < segments.length; index += 1) {
				const segment = segments[index];
				if (index === segments.length - 1 || clamped < segment.endProgress) return segment;
			}
			return segments[segments.length - 1];
		},
		byId(id: string): Segment | undefined {
			return segmentById.get(id);
		},
	};
}

/** Derive a cardinal direction from one world position to another. */
export function deriveDirection(from: WorldPosition, to: WorldPosition): Direction {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	if (dx > 0) return 'right';
	if (dx < 0) return 'left';
	if (dy > 0) return 'down';
	if (dy < 0) return 'up';
	throw new RangeError('Cannot derive a direction for identical positions');
}
