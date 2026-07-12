import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
import { flightTween } from './flight';
export const t34: StationTransition = {
	id: 't34',
	from: 'context-window',
	to: 'inference',
	travelers: [{ id: 'context-band', fromPort: 'context-out', toPort: 'context-in', arc: 0 }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		const packet = ctx.traveler('context-band');
		timeline.set(packet, { yPercent: 0, scaleX: 1, scaleY: 1 }, 0);
		timeline.add(flightTween(ctx, t34.travelers[0]), 0);
		if (!ctx.reduced) {
			// The window seals before the drop: a 4% compression is a physical
			// hesitation, then the packet releases without a bounce.
			timeline.to(packet, { scaleY: 0.96, duration: 0.04, ease: EASE.out }, 0);
			timeline.to(packet, { scaleY: 1, duration: DUR.micro * 0.5, ease: EASE.out }, 0.04);
			// A soft landing squashes the packet and lets its weight settle back
			// to the dock; percentages compose with the shared world trajectory.
			timeline.to(packet, { yPercent: 12, scaleY: 0.78, scaleX: 1.06, duration: DUR.micro, ease: EASE.out }, 1);
			timeline.to(
				packet,
				{ yPercent: 0, scaleY: 1, scaleX: 1, duration: DUR.settle * 0.45, ease: EASE.travel },
				1 + DUR.micro
			);
		}
		return timeline;
	},
	caption: 'The entire window is shipped into the model. Every single time.',
};
