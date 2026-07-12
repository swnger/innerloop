import type { StationTransition } from '../types';
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
			timeline.to(
				ctx.traveler('response-card'),
				{ y: '+=8', duration: 0.12, yoyo: true, repeat: 1 },
				0.7,
			);
		}
		return timeline;
	},
	caption: "The model didn't answer — it asked to do something.",
};
