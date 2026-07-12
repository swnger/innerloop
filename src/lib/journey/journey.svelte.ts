import { manifest } from './stations.manifest';
import type { SegmentTable, StationHandle, StationMeta } from './types';

const handles = new Map<string, StationHandle>();
const firstStationId = manifest[0]?.meta.id ?? '';
let activeId = $state(firstStationId);
let progress = $state(0);
let loopMapBorn = $state(false);
const active = $derived(manifest.find((entry) => entry.meta.id === activeId)?.meta ?? null);

/** Shared reactive journey state and station-handle registry. */
export const journey = {
	get activeId(): string {
		return activeId;
	},
	get active(): StationMeta | null {
		return active;
	},
	get progress(): number {
		return progress;
	},
	get loopMapBorn(): boolean {
		return loopMapBorn;
	},
	/** Update active station and progress from the normalized master timeline. */
	setFromProgress(nextProgress: number, table: SegmentTable): void {
		const clamped = Number.isFinite(nextProgress) ? Math.min(1, Math.max(0, nextProgress)) : 0;
		progress = clamped;
		activeId = table.at(clamped).stationId;

		const firstStation = table.segments.find((segment) => segment.kind === 'station');
		if (firstStation && clamped >= 0.95 * firstStation.endProgress) {
			loopMapBorn = true;
		}
	},
	/** Register a station handle for transition and orchestration lookups. */
	register(handle: StationHandle): void {
		handles.set(handle.meta.id, handle);
	},
	/** Retrieve a registered station handle by id. */
	handle(id: string): StationHandle | undefined {
		return handles.get(id);
	},
};
