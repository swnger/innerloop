import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
import { flightTween } from './flight';
export const t45: StationTransition = {
	id: 't45',
	from: 'inference',
	to: 'tool-calling',
	travelers: [{ id: 'response-card', fromPort: 'response-out', toPort: 'response-in', arc: 0 }],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		const traveler = ctx.traveler('response-card');
		timeline.set(traveler, { yPercent: 0, rotation: 0 }, 0);
		timeline.add(flightTween(ctx, t45.travelers[0]), 0);
		if (!ctx.reduced) {
			// Being handed down shifts the card's weight into a restrained
			// counter-rotation, rather than making it fall like a loose object.
			timeline.to(
				traveler,
				{ yPercent: 14, rotation: -2, duration: DUR.beat, ease: EASE.out },
				0.68
			);
			// The handoff rebounds only once: a brief opposite tilt, then a
			// chained settle back to neutral so both segment boundaries are still.
			timeline.to(traveler, { yPercent: 3, rotation: 1, duration: DUR.micro, ease: EASE.out }, '>');
			timeline.to(traveler, { yPercent: 0, rotation: 0, duration: DUR.settle, ease: EASE.out }, '>');
		}
		return timeline;
	},
	caption: "The model didn't answer — it asked to do something.",
};
