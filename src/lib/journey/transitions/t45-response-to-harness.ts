import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
import { flightTween } from './flight';
export const t45: StationTransition = {
	id: 't45',
	from: 'inference',
	to: 'tool-calling',
	travelers: [{ id: 'response-card', fromPort: 'response-out', toPort: 'response-in' }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		timeline.add(flightTween(ctx, 'response-card', 'response-out', 'response-in'), 0);
		if (!ctx.reduced) {
			const traveler = ctx.traveler('response-card');
			timeline.to(
				traveler,
				{ y: '+=14', rotation: 2.5, duration: DUR.beat, ease: EASE.out },
				0.68,
			);
			timeline.to(
				traveler,
				{ y: '+=3', rotation: 0, duration: DUR.settle, ease: EASE.out },
				'>',
			);
		}
		return timeline;
	},
	caption: "The model didn't answer — it asked to do something.",
};
