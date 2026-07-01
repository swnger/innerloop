import { browser } from '$app/environment';

/**
 * Theme state for The Inner Loop's light ("BMW in daylight") and dark
 * ("BMW at night") registers.
 *
 * The no-flash script in `app.html` has already resolved and applied the
 * theme to `<html data-theme>` before this module loads; here we mirror
 * that into reactive state, handle explicit toggles (persisted), and keep
 * following the OS live until the reader makes a choice of their own.
 */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const META_COLOR: Record<Theme, string> = { light: '#f8fafd', dark: '#0b0e14' };

function storedChoice(): Theme | null {
	if (!browser) return null;
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		return v === 'light' || v === 'dark' ? v : null;
	} catch {
		return null;
	}
}

function domTheme(): Theme {
	if (!browser) return 'light';
	return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function reducedMotion(): boolean {
	return browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let current = $state<Theme>(domTheme());

function paint(next: Theme) {
	current = next;
	if (!browser) return;
	document.documentElement.dataset.theme = next;
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[next]);
}

/** Apply a theme with a calm whole-page crossfade where supported. */
function transition(next: Theme) {
	if (next === current) return;
	const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
	if (!reducedMotion() && typeof doc.startViewTransition === 'function') {
		doc.startViewTransition(() => paint(next));
	} else {
		paint(next);
	}
}

export const theme = {
	get current(): Theme {
		return current;
	},
	get isDark(): boolean {
		return current === 'dark';
	},
	/** Set the theme. Persists by default; pass `{ persist: false }` for sync-only. */
	set(next: Theme, opts: { persist?: boolean } = {}) {
		transition(next);
		if ((opts.persist ?? true) && browser) {
			try {
				localStorage.setItem(STORAGE_KEY, next);
			} catch {
				/* storage blocked (private mode) — the in-session choice still holds */
			}
		}
	},
	toggle() {
		theme.set(current === 'dark' ? 'light' : 'dark');
	}
};

// Follow the OS live until the reader has made an explicit choice.
if (browser) {
	window
		.matchMedia('(prefers-color-scheme: dark)')
		.addEventListener('change', (e) => {
			if (storedChoice() === null) transition(e.matches ? 'dark' : 'light');
		});
}
