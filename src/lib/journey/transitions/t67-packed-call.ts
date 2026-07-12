import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
import { flightTween } from './flight';

export const t67: StationTransition = {
	id: 't67',
	from: 'context-engineering',
	to: 'harness-engineering',
	travelers: [
		{ id: 'context-band', fromPort: 'context-out', toPort: 'context-in', arc: -0.06 },
		{ id: 'response-card', fromPort: 'response-out', toPort: 'response-in', arc: -0.06 },
	],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		timeline.add(flightTween(ctx, t67.travelers[0]), 0);
		timeline.add(flightTween(ctx, t67.travelers[1]), 0);
		if (!ctx.reduced) {
			const band = ctx.traveler('context-band');
			// The packed band lightens on release: compression and lift return neutral at the dock.
			timeline.to(
				band,
				{ scaleX: 0.76, scaleY: 0.84, yPercent: -4, duration: DUR.micro, ease: EASE.draw },
				0.42,
			);
			timeline.to(
				band,
				{
					scaleX: 1,
					scaleY: 1,
					yPercent: 0,
					duration: DUR.settle * 0.4,
					ease: EASE.out,
				},
				0.62,
			);
			timeline.to(
				band,
				{ rotation: 1.5, duration: DUR.micro, ease: EASE.draw, yoyo: true, repeat: 1 },
				0.5,
			);
		}
		return timeline;
	},
	caption: 'A well-packed call. Now zoom out: who runs all of this?',
};
