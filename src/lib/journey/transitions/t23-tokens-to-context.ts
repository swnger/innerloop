import type { StationTransition } from '../types';
import { DUR, EASE, STAGGER } from '$lib/motion/tokens';
import { flightTween } from './flight';

export const t23: StationTransition = {
	id: 't23',
	from: 'tokenization',
	to: 'context-window',
	travelers: [{ id: 'token-stream', fromPort: 'tokens-out', toPort: 'tokens-in' }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		const tokenStream = ctx.traveler('token-stream');
		timeline.add(flightTween(ctx, 'token-stream', 'tokens-out', 'tokens-in'), 0);
		if (!ctx.reduced) {
			timeline.to(
				tokenStream.children,
				{ y: -5, rotation: -2, duration: DUR.micro, stagger: STAGGER.tight, yoyo: true, repeat: 1, ease: EASE.out },
				0.34,
			);
		}
		return timeline;
	},
	caption: "Numbers now — ready for the model's short-term workspace.",
};
