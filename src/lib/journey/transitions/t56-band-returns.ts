import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
import { flightTween } from './flight';

export const t56: StationTransition = {
	id: 't56',
	from: 'tool-calling',
	to: 'context-engineering',
	travelers: [
		{ id: 'context-band', fromPort: 'context-out', toPort: 'context-in' },
		{ id: 'response-card', fromPort: 'response-out', toPort: 'response-in' },
	],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		timeline.add(flightTween(ctx, 'context-band', 'context-out', 'context-in'), 0);
		timeline.add(flightTween(ctx, 'response-card', 'response-out', 'response-in'), 0);
		if (!ctx.reduced) {
			const band = ctx.traveler('context-band');
			const meter = band.querySelector<HTMLElement>('.capacity-fill');
			if (meter) {
				timeline.to(
					meter,
					{
						backgroundColor: 'var(--concept-tool-output)',
						scaleX: 1.06,
						transformOrigin: 'left center',
						duration: DUR.beat,
						yoyo: true,
						repeat: 1,
						ease: EASE.draw,
					},
					0.46,
				);
			}
			timeline.to(
				band,
				{ rotation: -2, duration: DUR.micro, yoyo: true, repeat: 1, ease: EASE.draw },
				0.48,
			);
		}
		return timeline;
	},
	caption: "Every loop made the window fatter. Someone has to decide what's worth keeping.",
};
