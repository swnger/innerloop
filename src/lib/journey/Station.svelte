<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { StationMeta } from './types';

	let { meta, children }: { meta: StationMeta; children: Snippet } = $props();
	const headingId = $derived(`${meta.id}-heading`);
</script>

<section
	class="station"
	id={meta.id}
	data-station={meta.id}
	aria-labelledby={headingId}
>
	<span class="sr-only" id={headingId}>Chapter {String(meta.number).padStart(2, '0')}: {meta.title}</span>
	<div class="station-scene">
		{@render children()}
	</div>
</section>

<style>
	.station {
		position: relative;
		min-height: 100svh;
		background: var(--c-paper);
		color: var(--c-ink);
	}

	.station-scene {
		position: relative;
		z-index: 1;
		min-height: 100svh;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
