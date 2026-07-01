<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/theme.svelte';

	// Belt-and-braces: if this module initialised before the no-flash
	// script's value was readable, re-sync from the DOM on mount.
	onMount(() => {
		const dom = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
		if (dom !== theme.current) theme.set(dom, { persist: false });
	});

	const isDark = $derived(theme.isDark);
	const label = $derived(isDark ? 'Switch to light theme' : 'Switch to dark theme');
</script>

<button
	type="button"
	class="theme-toggle"
	class:is-dark={isDark}
	aria-label={label}
	title={label}
	onclick={() => theme.toggle()}
>
	<span class="glyphs" aria-hidden="true">
		<svg
			class="sun"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4l1.4-1.4M18 6l1.4-1.4"
			/>
		</svg>
		<svg
			class="moon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M20.5 13.2A8.3 8.3 0 1 1 10.8 3.5 6.5 6.5 0 0 0 20.5 13.2Z" />
		</svg>
	</span>
</button>

<style>
	.theme-toggle {
		display: inline-grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		margin: 0;
		flex: 0 0 auto;
		color: var(--muted);
		background: transparent;
		border: 1px solid transparent;
		border-radius: 999px;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			color 0.2s ease,
			background-color 0.2s ease,
			border-color 0.2s ease;
	}

	.theme-toggle:hover {
		color: var(--paper); /* primary ink */
		background: var(--surface);
		border-color: var(--line);
	}

	.theme-toggle:active {
		transform: translateY(0.5px);
	}

	/* Keep the focus ring round (the global :focus-visible forces a 4px
	   radius, which would square off this pill button on keyboard focus). */
	.theme-toggle:focus-visible {
		border-radius: 999px;
	}

	.glyphs {
		display: grid;
		width: 1.2rem;
		height: 1.2rem;
	}

	.glyphs svg {
		grid-area: 1 / 1;
		width: 100%;
		height: 100%;
		transition:
			opacity 0.25s ease,
			transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
	}

	/* Sun shows in light, moon in dark — they swap with a small rotate. */
	.sun {
		opacity: 1;
		transform: rotate(0) scale(1);
	}

	.moon {
		opacity: 0;
		transform: rotate(-65deg) scale(0.55);
	}

	.is-dark .sun {
		opacity: 0;
		transform: rotate(65deg) scale(0.55);
	}

	.is-dark .moon {
		opacity: 1;
		transform: rotate(0) scale(1);
	}

	@media (prefers-reduced-motion: reduce) {
		.glyphs svg {
			transition: none;
		}
	}
</style>
