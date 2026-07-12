import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
import { flightTween } from './flight';
export const t34: StationTransition = {
	id: 't34',
	from: 'context-window',
	to: 'inference',
	travelers: [{ id: 'context-band', fromPort: 'context-out', toPort: 'context-in' }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		const packet = ctx.traveler('context-band');
		timeline.add(flightTween(ctx, 'context-band', 'context-out', 'context-in'), 0);
		if (!ctx.reduced) {
			// The intake is below the source: let the packet drop past the dock,
			// then settle back into place rather than bouncing.
			timeline.to(packet, { y: '+=12', scaleY: 0.78, scaleX: 1.06, duration: DUR.micro, ease: EASE.out }, 1);
			timeline.to(packet, { y: '-=12', scaleY: 1, scaleX: 1, duration: DUR.settle * 0.45, ease: EASE.travel }, 1 + DUR.micro);
		}
		return timeline;
	},
	caption: 'The entire window is shipped into the model. Every single time.',
};
