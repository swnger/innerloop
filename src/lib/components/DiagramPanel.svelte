<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label?: string;
		caption?: string;
		children: Snippet;
	}

	let { label, caption, children }: Props = $props();
</script>

<figure class="diagram-panel">
	{#if label}
		<div class="diagram-panel__label">{label}</div>
	{/if}
	<div class="diagram-panel__content">
		{@render children()}
	</div>
	{#if caption}
		<figcaption>{caption}</figcaption>
	{/if}
</figure>

<style>
	.diagram-panel {
		position: relative;
		margin: 0;
		padding: 1.25rem;
		border: 1px solid var(--c-line);
		border-radius: 0.75rem;
		background: var(--c-surface);
		color: var(--c-ink);
	}

	.diagram-panel__label {
		display: inline-flex;
		align-items: center;
		min-height: 1.5rem;
		margin-block-end: 1rem;
		padding: 0.2rem 0.5rem;
		border: 1px solid var(--c-line-strong);
		border-radius: 0.25rem;
		background: var(--c-sunken);
		color: var(--c-ink-muted);
		font-family: var(--mono);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		line-height: 1.2;
	}

	.diagram-panel__content {
		min-width: 0;
	}

	.diagram-panel figcaption {
		margin-block-start: 1rem;
		padding-block-start: 0.8rem;
		border-block-start: 1px solid var(--c-line);
		color: var(--c-ink-muted);
		font-size: 0.9rem;
		font-weight: 500;
		line-height: 1.5;
		text-wrap: pretty;
	}

	@media (max-width: 40rem) {
		.diagram-panel {
			padding: 1rem;
		}
	}
</style>
