import { describe, expect, it } from 'vitest';

import { flightPoint } from './trajectory';

describe('flightPoint', () => {
	it('preserves both endpoints for straight and arced routes', () => {
		const from = { x: 12, y: -8 };
		const to = { x: 72, y: 112 };
		for (const arc of [0, 0.15, -0.06]) {
			expect(flightPoint(from, to, 0, arc)).toEqual(from);
			expect(flightPoint(from, to, 1, arc)).toEqual(to);
		}
	});

	it('is exactly linear when arc is absent or zero', () => {
		const from = { x: 0, y: 10 };
		const to = { x: 80, y: 50 };
		expect(flightPoint(from, to, 0.25)).toEqual({ x: 20, y: 20 });
		expect(flightPoint(from, to, 0.75, 0)).toEqual({ x: 60, y: 40 });
	});

	it('bows positive arcs left and negative arcs right of travel', () => {
		const from = { x: 0, y: 0 };
		const to = { x: 100, y: 0 };
		expect(flightPoint(from, to, 0.5, 0.2)).toEqual({ x: 50, y: 10 });
		expect(flightPoint(from, to, 0.5, -0.2)).toEqual({ x: 50, y: -10 });
	});

	it('clamps progress and handles zero-distance legs', () => {
		expect(flightPoint({ x: 5, y: 9 }, { x: 5, y: 9 }, 0.5, 0.15)).toEqual({ x: 5, y: 9 });
		expect(flightPoint({ x: 0, y: 0 }, { x: 10, y: 20 }, -1, 0.15)).toEqual({ x: 0, y: 0 });
		expect(flightPoint({ x: 0, y: 0 }, { x: 10, y: 20 }, 2, 0.15)).toEqual({ x: 10, y: 20 });
	});
});
