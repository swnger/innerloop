import { describe, expect, it } from 'vitest';

import { layoutCircuit, buildSegmentTable, deriveDirection, JOURNEY_BUDGET_VH } from './layout';
import type { Direction } from './types';
import { manifest } from './stations.manifest';

describe('journey layout', () => {
	it('closes the circuit after applying every exit direction and step count', () => {
		let x = 0;
		let y = 0;
		const vectors: Record<Direction, readonly [number, number]> = {
			right: [1, 0],
			down: [0, 1],
			left: [-1, 0],
			up: [0, -1],
		};

		for (const { exit } of manifest) {
			const [dx, dy] = vectors[exit.direction];
			x += dx * exit.steps;
			y += dy * exit.steps;
		}

		expect({ x, y }).toEqual({ x: 0, y: 0 });
	});

	it('places seven stations at unique expected circuit coordinates', () => {
		const positions = layoutCircuit(manifest);
		const expected = {
			'agent-loop': { x: 0, y: 0 },
			tokenization: { x: 1, y: 0 },
			'context-window': { x: 2, y: 0 },
			inference: { x: 2, y: 1 },
			'tool-calling': { x: 2, y: 2 },
			'context-engineering': { x: 1, y: 2 },
			'harness-engineering': { x: 0, y: 2 },
		} as const;

		expect(positions.size).toBe(7);
		expect(new Set([...positions.values()].map(({ x, y }) => `${x},${y}`)).size).toBe(7);
		for (const [id, position] of Object.entries(expected)) {
			expect(positions.get(id)).toEqual(position);
		}
	});

	it('derives direction and builds a contiguous, weighted segment table', () => {
		expect(deriveDirection({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe('right');
		expect(deriveDirection({ x: 2, y: 0 }, { x: 2, y: 1 })).toBe('down');
		expect(deriveDirection({ x: 2, y: 2 }, { x: 1, y: 2 })).toBe('left');
		expect(deriveDirection({ x: 0, y: 2 }, { x: 0, y: 0 })).toBe('up');

		const table = buildSegmentTable(manifest);
		expect(table.segments).toHaveLength(14);
		expect(table.segments.map(({ id }) => id)).toEqual([
			'agent-loop',
			't12',
			'tokenization',
			't23',
			'context-window',
			't34',
			'inference',
			't45',
			'tool-calling',
			't56',
			'context-engineering',
			't67',
			'harness-engineering',
			't71',
		]);

		for (let index = 0; index < table.segments.length; index += 1) {
			const segment = table.segments[index];
			expect(segment.kind).toBe(index % 2 === 0 ? 'station' : 'transition');
			if (index > 0) {
				expect(segment.startVh).toBe(table.segments[index - 1].endVh);
			}
			expect(Math.abs(segment.startProgress - segment.startVh / table.totalVh)).toBeLessThanOrEqual(1e-9);
			expect(Math.abs(segment.endProgress - segment.endVh / table.totalVh)).toBeLessThanOrEqual(1e-9);
		}

		for (let index = 1; index < table.segments.length; index += 2) {
			const transition = table.segments[index];
			expect(transition.stationId).toBe(manifest[((index + 1) / 2) % manifest.length].meta.id);
		}

		expect(table.at(0)).toBe(table.segments[0]);
		expect(table.at(1)).toBe(table.segments[table.segments.length - 1]);
		const t34 = table.byId('t34');
		expect(t34).toBeDefined();
		expect(table.at((t34!.startProgress + t34!.endProgress) / 2)).toBe(t34);
	});

	it('stays within the journey scroll budget', () => {
		const table = buildSegmentTable(manifest);
		expect(table.totalVh).toBeLessThanOrEqual(JOURNEY_BUDGET_VH);
	});
});
