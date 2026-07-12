import { worldPoint } from '../travelers/layer';
import type { PortName, TravelerId, TransitionContext } from '../types';

/**
 * Move one traveler to a destination port in world-local coordinates.
 * The destination and its geometry are resolved lazily when GSAP
 * initializes the function-valued end coordinates.
 */
export function flightTween(
	ctx: TransitionContext,
	id: TravelerId,
	fromPort: PortName,
	toPort: PortName,
	vars: gsap.TweenVars = {},
): gsap.core.Tween {
	const traveler = ctx.traveler(id);
	const world =
		(traveler.closest('.world') as HTMLElement | null) ??
		(traveler.offsetParent as HTMLElement | null);

	// The traveler is adopted by the layer before the transition starts, so
	// its current position already represents fromPort. Keep the source in
	// the signature as part of the route contract without reparenting here.
	void fromPort;

	const coordinate = (axis: 'x' | 'y') => () => {
		const destination = ctx.port('to', toPort);
		if (!destination || !world) return 0;
		return worldPoint(destination, world)[axis];
	};

	return ctx.gsap.to(traveler, {
		...vars,
		duration: 1,
		ease: 'none',
		x: coordinate('x'),
		y: coordinate('y'),
	});
}
