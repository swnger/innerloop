import type { StationTransition } from '../types';
import { DUR, EASE, STAGGER } from '$lib/motion/tokens';
import { flightTween } from './flight';

export const t23: StationTransition = {
	id: 't23',
	from: 'tokenization',
	to: 'context-window',
	travelers: [{ id: 'token-stream', fromPort: 'tokens-out', toPort: 'tokens-in', arc: 0 }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		const tokenStream = ctx.traveler('token-stream');
		const chips = Array.from(tokenStream.children);
		timeline.set(chips, { y: 0, rotation: 0 }, 0);
		timeline.add(flightTween(ctx, t23.travelers[0]), 0);
		if (!ctx.reduced) {
			// The trailing chip leads the ripple, making the stream read in order.
			timeline.to(
				chips,
				{ y: -5, rotation: -2, duration: DUR.micro, stagger: { each: STAGGER.tight, from: 'end' }, yoyo: true, repeat: 1, ease: EASE.out },
				0.34,
			);
		}
		timeline.set(chips, { y: 0, rotation: 0 }, 1);
		return timeline;
	},
	caption: "Numbers now — ready for the model's short-term workspace.",
};
