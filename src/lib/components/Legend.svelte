<script lang="ts">
	import type { ConceptHue } from '$lib/journey/types';

	interface LegendItem {
		hue: ConceptHue;
		label: string;
	}

	interface Props {
		items: LegendItem[];
	}

	let { items }: Props = $props();
</script>

<ul class="legend" aria-label="Diagram legend">
	{#each items as item (item.hue)}
		<li class="legend__item">
			<span class={`legend__swatch legend__swatch--${item.hue}`} aria-hidden="true"></span>
			<span>{item.label}</span>
		</li>
	{/each}
</ul>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem 1.25rem;
		margin: 0;
		padding: 0;
		color: var(--c-ink-muted);
		font-size: 0.9rem;
		line-height: 1.4;
		list-style: none;
	}

	.legend__item {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 1.5rem;
	}

	.legend__swatch {
		display: inline-block;
		flex: 0 0 auto;
		width: 0.9rem;
		height: 0.9rem;
		border: 1px solid currentColor;
		border-radius: 0.25rem;
		background: currentColor;
	}

	.legend__swatch--system {
		color: var(--concept-system);
	}

	.legend__swatch--history {
		color: var(--concept-history);
	}

	.legend__swatch--user {
		color: var(--concept-user);
	}

	.legend__swatch--tools {
		color: var(--concept-tools);
	}

	.legend__swatch--tool-output {
		color: var(--concept-tool-output);
	}

	.legend__swatch--response {
		color: var(--concept-response);
	}
</style>
