<script lang="ts">
	import type { ConceptHue, StationNumber } from '$lib/journey/types';

	interface Props {
		number: StationNumber;
		title: string;
		kicker?: string;
		accent?: ConceptHue;
	}

	let { number, title, kicker, accent }: Props = $props();
</script>

<header class:accent-system={accent === 'system'} class:accent-history={accent === 'history'} class:accent-user={accent === 'user'} class:accent-tools={accent === 'tools'} class:accent-tool-output={accent === 'tool-output'} class:accent-response={accent === 'response'} class="station-head">
	<p class="station-head__chapter">Chapter {String(number).padStart(2, '0')}</p>
	<h2>{title}</h2>
	{#if kicker}
		<p class="station-head__kicker">{kicker}</p>
	{/if}
</header>

<style>
	.station-head {
		position: relative;
		max-width: 44rem;
		padding-block: 0.25rem 1.5rem;
		color: var(--c-ink);
	}

	.station-head::before {
		content: '';
		display: block;
		width: 2.5rem;
		height: 0.2rem;
		margin-block-end: 1rem;
		background: var(--c-line-strong);
	}

	.station-head.accent-system::before {
		background: var(--concept-system);
	}

	.station-head.accent-history::before {
		background: var(--concept-history);
	}

	.station-head.accent-user::before {
		background: var(--concept-user);
	}

	.station-head.accent-tools::before {
		background: var(--concept-tools);
	}

	.station-head.accent-tool-output::before {
		background: var(--concept-tool-output);
	}

	.station-head.accent-response::before {
		background: var(--concept-response);
	}

	.station-head__chapter {
		margin-block-end: 0.55rem;
		color: var(--c-ink-muted);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		line-height: 1.2;
		text-transform: uppercase;
	}

	.station-head h2 {
		max-width: 18ch;
		font-family: var(--display);
		font-size: clamp(2rem, 4vh, 3.2rem);
		font-weight: 700;
		letter-spacing: -0.025em;
		line-height: 1.04;
		text-wrap: balance;
	}

	.station-head__kicker {
		max-width: 62ch;
		margin-block-start: 0.8rem;
		color: var(--c-ink-muted);
		font-size: 1rem;
		line-height: 1.55;
		text-wrap: pretty;
	}
</style>
