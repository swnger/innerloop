/** Shared durations for motion beats and transitions. */
export const DUR = {
	micro: 0.2,
	beat: 0.6,
	travel: 1.2,
	settle: 0.9,
} as const;

/** Shared easing curves for the journey. */
export const EASE = {
	out: 'power4.out',
	travel: 'power2.inOut',
	draw: 'power1.inOut',
} as const;

/** Shared stagger intervals for grouped elements. */
export const STAGGER = {
	tight: 0.04,
	chip: 0.08,
} as const;
