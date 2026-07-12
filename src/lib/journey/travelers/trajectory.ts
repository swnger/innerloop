export interface Point2D {
	x: number;
	y: number;
}

/**
 * Resolve a deterministic point along a quadratic flight trajectory.
 * Positive arcs bow left of travel; negative arcs bow right.
 */
export function flightPoint(
	from: Point2D,
	to: Point2D,
	progress: number,
	arc = 0,
): Point2D {
	const t = Math.max(0, Math.min(1, progress));
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const distance = Math.hypot(dx, dy);

	if (distance === 0 || arc === 0) {
		return { x: from.x + dx * t, y: from.y + dy * t };
	}

	const control = {
		x: (from.x + to.x) / 2 + arc * distance * (-dy / distance),
		y: (from.y + to.y) / 2 + arc * distance * (dx / distance),
	};
	const inverse = 1 - t;
	return {
		x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
		y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
	};
}
