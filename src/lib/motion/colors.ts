/**
 * Resolve a CSS custom-property color at call time.
 *
 * SSR has no computed-style environment, so unresolved values return an
 * empty string rather than attempting to access browser globals.
 */
export function cssColor(token: string, el?: Element): string {
	if (typeof window === 'undefined') return '';

	const target = el ?? document.documentElement;
	return getComputedStyle(target).getPropertyValue(`--${token}`).trim();
}
