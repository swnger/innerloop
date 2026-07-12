<script lang="ts">
	import { onMount } from 'svelte';

	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import { manifest } from '$lib/journey/stations.manifest';
	import type { SceneProps, StationHandle } from '$lib/journey/types';

	let { register }: SceneProps = $props();
	let root: HTMLElement;

	const meta = manifest.find((entry) => entry.meta.id === 'context-engineering')!.meta;

	onMount(() => {
		const sceneEl = root;
		const handle: StationHandle = {
			meta,
			sceneEl,
			ports: {
				'context-in': () => sceneEl.querySelector('[data-port="context-in"]'),
				'context-out': () => sceneEl.querySelector('[data-port="context-out"]'),
				'response-in': () => sceneEl.querySelector('[data-port="response-in"]'),
				'response-out': () => sceneEl.querySelector('[data-port="response-out"]')
			},
			build: (ctx) => {
				const panel = ctx.root.querySelector<HTMLElement>('[data-diagram-panel]');
				const timeline = ctx.gsap.timeline();
				if (panel) timeline.from(panel, { autoAlpha: 0, y: 20, duration: 0.6 });
				timeline.to({}, { duration: 2 });
				return timeline;
			},
			applyStatic: () => {}
		};

		register(handle);
	});
</script>

<section bind:this={root} class="scene">
	<StationHead number={meta.number} title={meta.title} accent={meta.accent} />

	<div class="diagram-shell" data-diagram-panel>
		<DiagramPanel label="Stub diagram" caption="A placeholder for the context handoff">
			<p>
				Context engineering is choosing what enters each model call: trim, summarize, or retrieve the
				pieces that matter. This stub will later show how a bloated context gets packed into a smaller,
				more useful call.
			</p>
		</DiagramPanel>
	</div>

	<div class="ports" aria-hidden="true">
		<div class="port" data-port="context-in" aria-hidden="true"></div>
		<div class="port" data-port="context-out" aria-hidden="true"></div>
		<div class="port" data-port="response-in" aria-hidden="true"></div>
		<div class="port" data-port="response-out" aria-hidden="true"></div>
	</div>
</section>

<style>
	.scene {
		position: relative;
		display: flex;
		min-height: 100svh;
		width: 100%;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		padding: var(--page-gutter);
		background: var(--c-paper);
		color: var(--c-ink);
	}

	.diagram-shell {
		width: min(100%, 48rem);
	}

	.diagram-shell :global(p) {
		max-width: 66ch;
	}

	.ports {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
		width: min(100%, 52rem);
	}

	.port {
		display: grid;
		width: 10rem;
		height: 5rem;
		place-items: center;
		border: 1px solid var(--concept-history);
		border-radius: 8px;
		background: var(--concept-history-fill);
		color: var(--concept-history);
		font-family: var(--mono);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
	}

	.port::before {
		content: attr(data-port);
	}

	@media (prefers-reduced-motion: reduce) {
		.scene {
			gap: 1.5rem;
		}
	}
</style>
