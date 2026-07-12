import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
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
			const promptCard = ctx.traveler('prompt-card');
			// The card strains at the seams where words become the next station's
			// material: a small physical cue, never a bounce.
			for (const at of [0.22, 0.48, 0.74]) {
				timeline.to(
					promptCard,
					{
						skewX: 1.6,
						scaleX: 1.035,
						duration: DUR.micro * 0.6,
						yoyo: true,
						repeat: 1,
						ease: EASE.out
					},
					at
				);
			}
		}
		return timeline;
	},
	caption: 'Your words leave the chat and head for the model. First problem: models don\'t read words.',
};
