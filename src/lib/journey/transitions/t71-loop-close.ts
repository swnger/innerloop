import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
import { flightTween } from './flight';

export const t71: StationTransition = {
	id: 't71',
	from: 'harness-engineering',
	to: 'agent-loop',
	travelers: [{ id: 'response-card', fromPort: 'response-out', toPort: 'answer-in' }],
	build: (ctx) => {
		const card = ctx.traveler('response-card');
		const previousFace = card.getAttribute('data-face') ?? 'tool';
		const timeline = ctx.gsap.timeline({
			onReverseComplete: () => card.setAttribute('data-face', previousFace)
		});

		// The answer face is part of the handoff, not a station-side assumption.
		timeline.call(() => card.setAttribute('data-face', 'answer'), undefined, 0);
		timeline.add(flightTween(ctx, 'response-card', 'response-out', 'answer-in'), 0);

		if (!ctx.reduced) {
			// xPercent composes with flightTween's world-space x for a quiet arc on the climb.
			timeline
				.to(card, { xPercent: 6, duration: DUR.micro, ease: EASE.out }, 0.16)
				.to(card, { xPercent: -6, duration: DUR.settle * 0.5, ease: EASE.travel }, 0.36)
				.to(card, { xPercent: 0, duration: DUR.micro, ease: EASE.out }, 0.81);
		}
		return timeline;
	},
	caption: 'The answer lands back where the question began — the loop closes.',
};
