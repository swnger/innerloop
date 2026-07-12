import type { StationTransition } from '../types';
import { flightTween } from './flight';

export const t71: StationTransition = {
	id: 't71',
	from: 'harness-engineering',
	to: 'agent-loop',
	travelers: [{ id: 'response-card', fromPort: 'response-out', toPort: 'answer-in' }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		timeline.add(flightTween(ctx, 'response-card', 'response-out', 'answer-in'), 0);
		if (!ctx.reduced) {
			timeline.to(
				ctx.traveler('response-card'),
				{ scale: 1.04, duration: 0.18, yoyo: true, repeat: 1 },
				0.72,
			);
		}
		return timeline;
	},
	caption: 'The answer lands back where the question began — the loop closes.',
};
