import type { StationTransition } from '../types';
import { flightTween } from './flight';

export const t34: StationTransition = {
	id: 't34',
	from: 'context-window',
	to: 'inference',
	travelers: [{ id: 'context-band', fromPort: 'context-out', toPort: 'context-in' }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		timeline.add(flightTween(ctx, 'context-band', 'context-out', 'context-in'), 0);
		if (!ctx.reduced) {
			timeline.to(
				ctx.traveler('context-band'),
				{ y: '+=8', duration: 0.12, yoyo: true, repeat: 1 },
				0.7,
			);
		}
		return timeline;
	},
	caption: 'The entire window is shipped into the model. Every single time.',
};
