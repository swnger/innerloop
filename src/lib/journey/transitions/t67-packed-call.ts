import type { StationTransition } from '../types';
import { flightTween } from './flight';

export const t67: StationTransition = {
	id: 't67',
	from: 'context-engineering',
	to: 'harness-engineering',
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
				{ rotation: 1.5, duration: 0.16, yoyo: true, repeat: 1 },
				0.5,
			);
		}
		return timeline;
	},
	caption: 'A well-packed call. Now zoom out: who runs all of this?',
};
