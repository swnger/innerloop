import type { StationTransition } from '../types';
import { flightTween } from './flight';

export const t56: StationTransition = {
	id: 't56',
	from: 'tool-calling',
	to: 'context-engineering',
	travelers: [
		{ id: 'context-band', fromPort: 'context-out', toPort: 'context-in' },
		{ id: 'response-card', fromPort: 'response-out', toPort: 'response-in' },
	],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		timeline.add(flightTween(ctx, 'context-band', 'context-out', 'context-in'), 0);
		timeline.add(flightTween(ctx, 'response-card', 'response-out', 'response-in'), 0);
		if (!ctx.reduced) {
			timeline.to(
				ctx.traveler('context-band'),
				{ rotation: -2, duration: 0.16, yoyo: true, repeat: 1 },
				0.48,
			);
		}
		return timeline;
	},
	caption: "Every loop made the window fatter. Someone has to decide what's worth keeping.",
};
