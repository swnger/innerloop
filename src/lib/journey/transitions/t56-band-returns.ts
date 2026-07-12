import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
import { flightTween } from './flight';

export const t56: StationTransition = {
	id: 't56',
	from: 'tool-calling',
	to: 'context-engineering',
	travelers: [
		{ id: 'context-band', fromPort: 'context-out', toPort: 'context-in', arc: -0.06 },
		{ id: 'response-card', fromPort: 'response-out', toPort: 'response-in', arc: -0.06 },
	],
	build: (ctx) => {
		const timeline = ctx.gsap.timeline();
		timeline.add(flightTween(ctx, t56.travelers[0]), 0);
		timeline.add(flightTween(ctx, t56.travelers[1]), 0);
		if (!ctx.reduced) {
			// The return carries accumulated context weight; the meter strains before release.
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
			// A loaded band twists under the return load, then settles neutral at the dock.
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
