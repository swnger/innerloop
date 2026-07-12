import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
import { flightTween } from './flight';
export const t12: StationTransition = {
	id: 't12',
	from: 'agent-loop',
	to: 'tokenization',
	travelers: [{ id: 'prompt-card', fromPort: 'prompt-out', toPort: 'prompt-in', arc: 0 }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		timeline.set(ctx.traveler('prompt-card'), { rotation: 0, skewX: 0, scaleX: 1 }, 0);
		timeline.add(flightTween(ctx, t12.travelers[0]), 0);
		if (!ctx.reduced) {
			const promptCard = ctx.traveler('prompt-card');
			// A forward lean makes the card feel pulled into tokenization.
			timeline.to(promptCard, { rotation: 2, duration: DUR.micro * 0.5, ease: EASE.out }, 0.04);
			timeline.to(promptCard, { rotation: 0, duration: DUR.micro * 0.75, ease: EASE.out }, 0.14);
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
		timeline.set(ctx.traveler('prompt-card'), { rotation: 0, skewX: 0, scaleX: 1 }, 1);
		return timeline;
	},
	caption: 'Your words leave the chat and head for the model. First problem: models don\'t read words.',
};
