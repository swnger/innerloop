import { worldPoint } from '../travelers/layer';
import { flightPoint, type Point2D } from '../travelers/trajectory';
import type { TravelerRoute, TransitionContext } from '../types';

/**
 * Move one traveler along its declared route in world-local coordinates.
 * Both endpoints are measured when the tween initializes, so invalidation
 * re-resolves geometry without deriving a source from the traveler transform.
 */
export function flightTween(
	ctx: TransitionContext,
	route: TravelerRoute,
	vars: gsap.TweenVars = {},
): gsap.core.Tween {
	const traveler = ctx.traveler(route.id);
	const world =
		(traveler.closest('.world') as HTMLElement | null) ??
		(traveler.offsetParent as HTMLElement | null);
	const proxy = { progress: 0 };
	let from: Point2D = { x: 0, y: 0 };
	let to: Point2D = { x: 0, y: 0 };
	const setX = ctx.gsap.quickSetter(traveler, 'x', 'px');
	const setY = ctx.gsap.quickSetter(traveler, 'y', 'px');

	const measure = (): void => {
		const source = ctx.port('from', route.fromPort);
		const destination = ctx.port('to', route.toPort);
		if (!source || !destination || !world) return;
		from = worldPoint(source, world);
		to = worldPoint(destination, world);
	};

	return ctx.gsap.fromTo(
		proxy,
		{ progress: 0 },
		{
			...vars,
			progress: () => {
				measure();
				return 1;
			},
			duration: 1,
			ease: 'none',
			onUpdate: () => {
				const point = flightPoint(from, to, proxy.progress, route.arc);
				setX(point.x);
				setY(point.y);
			},
		},
	);
}
