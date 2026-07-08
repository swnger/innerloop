/**
 * Shared chapter-motion constants and helpers. Small on purpose: this module
 * centralizes only the values that repeat verbatim across chapters (the step
 * root margin and the lede scrub window) plus a scoped step observer. It does
 * NOT hide per-chapter timelines behind an abstraction — bespoke choreography
 * stays in each component.
 */

/** IntersectionObserver rootMargin used by step-driven chapters. */
export const STEP_ROOT_MARGIN = '-45% 0px -45% 0px';

/** ScrollTrigger scrub window shared by the lede reveals. */
export const LEDE_SCRUB = { start: 'top 78%', end: 'top 28%' } as const;

/**
 * Observe `selector` elements within `root` and report each element's
 * `data-i` index as it enters view. Returns a disconnect fn. Scoped to
 * `root` so chapters never reach across the document for their own steps.
 */
export function scopedStepObserver(
	root: HTMLElement,
	selector: string,
	onIndex: (index: number) => void,
	rootMargin = STEP_ROOT_MARGIN
): () => void {
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const index = Number((entry.target as HTMLElement).dataset.i);
				if (!Number.isNaN(index)) onIndex(index);
			}
		},
		{ rootMargin, threshold: 0 }
	);
	root.querySelectorAll<HTMLElement>(selector).forEach((element) => observer.observe(element));
	return () => observer.disconnect();
}
