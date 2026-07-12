import type { StationTransition } from '../types';
import { DUR, EASE } from '$lib/motion/tokens';
import { flightTween } from './flight';

export const t71: StationTransition = {
	id: 't71',
	from: 'harness-engineering',
	to: 'agent-loop',
	travelers: [{ id: 'response-card', fromPort: 'response-out', toPort: 'answer-in', arc: 0.15 }],
	build: (ctx) => {
		const card = ctx.traveler('response-card');
		const toolFace = card.querySelector<HTMLElement>('.tool-face');
		const answerFace = card.querySelector<HTMLElement>('.answer-face');
		const answerGlow = card.querySelector<HTMLElement>('.answer-glow');
		const initialFace = card.getAttribute('data-face') === 'answer' ? 'answer' : 'tool';
		const turnover = 0.5;
		const timeline = ctx.gsap.timeline();

		timeline.add(flightTween(ctx, t71.travelers[0]), 0);

		if (toolFace && answerFace) {
			// Face turnover is timeline-owned so direct seeks and reverse scrub have no CSS tail.
			timeline.set(
				card,
				{ attr: { 'data-face': initialFace } },
				0,
			);
			timeline.set(
				toolFace,
				{ autoAlpha: initialFace === 'tool' ? 1 : 0, rotationX: initialFace === 'tool' ? 0 : 90 },
				0,
			);
			timeline.set(
				answerFace,
				{ autoAlpha: initialFace === 'answer' ? 1 : 0, rotationX: initialFace === 'answer' ? 0 : -90 },
				0,
			);
			timeline.to(
				toolFace,
				{ autoAlpha: 0, rotationX: 90, duration: DUR.micro, ease: EASE.out },
				turnover,
			);
			timeline.to(
				answerFace,
				{ autoAlpha: 1, rotationX: 0, duration: DUR.micro, ease: EASE.out },
				turnover,
			);
			timeline.set(card, { attr: { 'data-face': 'answer' } }, turnover);
		}

		if (!ctx.reduced) {
			if (answerGlow) {
				// The answer's small status light briefly glows: a contained signal, not a card-wide effect.
				timeline.to(
					answerGlow,
					{
						boxShadow: '0 0 0.8rem var(--concept-response)',
						duration: DUR.micro,
						yoyo: true,
						repeat: 1,
						ease: EASE.out,
					},
					0.58,
				);
			}
			// A pulled card leans toward the loop before the handoff, then returns neutral.
			timeline
				.to(card, { xPercent: 6, duration: DUR.micro, ease: EASE.out }, 0.16)
				.to(card, { xPercent: -6, duration: DUR.settle * 0.5, ease: EASE.travel }, 0.36)
				.to(card, { xPercent: 0, duration: DUR.micro, ease: EASE.out }, 0.81);
			// Landing has two physical beats: decelerate above the panel, then settle back to line.
			timeline
				.to(card, { yPercent: -8, duration: DUR.micro, ease: EASE.out }, 0.58)
				.to(card, { yPercent: 0, duration: DUR.settle * 0.2, ease: EASE.travel }, 0.78);
		}
		return timeline;
	},
	caption: 'The answer lands back where the question began — the loop closes.',
};
