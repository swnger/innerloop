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
		border: 2px solid var(--c-line-strong);
		border-radius: 0.25rem;
		background: var(--c-sunken);
	}

	.legend__swatch--system {
		border-color: var(--concept-system);
		background: var(--concept-system-fill);
	}

	.legend__swatch--history {
		border-color: var(--concept-history);
		background: var(--concept-history-fill);
	}

	.legend__swatch--user {
		border-color: var(--concept-user);
		background: var(--concept-user-fill);
	}

	.legend__swatch--tools {
		border-color: var(--concept-tools);
		background: var(--concept-tools-fill);
	}

	.legend__swatch--tool-output {
		border-color: var(--concept-tool-output);
		background: var(--concept-tool-output-fill);
	}

	.legend__swatch--response {
		border-color: var(--concept-response);
		background: var(--concept-response-fill);
	}
</style>
