import type { StationTransition } from '../types';
import { flightTween } from './flight';

export const t23: StationTransition = {
	id: 't23',
	from: 'tokenization',
	to: 'context-window',
	travelers: [{ id: 'token-stream', fromPort: 'tokens-out', toPort: 'tokens-in' }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		timeline.add(flightTween(ctx, 'token-stream', 'tokens-out', 'tokens-in'), 0);
		if (!ctx.reduced) {
			timeline.to(
				ctx.traveler('token-stream'),
				{ rotation: -1.5, duration: 0.18, yoyo: true, repeat: 1 },
				0.42,
			);
		}
		return timeline;
	},
	caption: "Numbers now — ready for the model's short-term workspace.",
};
