import type { StationTransition } from '../types';
import { flightTween } from './flight';

export const t12: StationTransition = {
	id: 't12',
	from: 'agent-loop',
	to: 'tokenization',
	travelers: [{ id: 'prompt-card', fromPort: 'prompt-out', toPort: 'prompt-in' }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		timeline.add(flightTween(ctx, 'prompt-card', 'prompt-out', 'prompt-in'), 0);
		if (!ctx.reduced) {
			timeline.to(
				ctx.traveler('prompt-card'),
				{ rotation: 2, skewX: 3, duration: 0.16, yoyo: true, repeat: 1 },
				0.38,
			);
		}
		return timeline;
	},
	caption: 'Your words leave the chat and head for the model. First problem: models don\'t read words.',
};
