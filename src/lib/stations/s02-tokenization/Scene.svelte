<script lang="ts">
	import { onMount } from 'svelte';
	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import { manifest } from '$lib/journey/stations.manifest';
	import type { SceneProps, StationContext } from '$lib/journey/types';

	let { register }: SceneProps = $props();
	let root: HTMLDivElement;
	const station = manifest.find((entry) => entry.meta.id === 'tokenization');

	const build = (ctx: StationContext) => {
		const timeline = ctx.gsap.timeline();
		const panel = ctx.root.querySelector<HTMLElement>('[data-diagram-panel]');
		if (panel) timeline.from(panel, { autoAlpha: 0, y: 24 });
		timeline.to({}, { duration: 2 });
		return timeline;
	};

	onMount(() => {
		if (!station) throw new Error('Missing manifest entry for tokenization');
		register({
			meta: station.meta,
			sceneEl: root,
			ports: {
				'prompt-in': () => root.querySelector('[data-port="prompt-in"]'),
				'tokens-out': () => root.querySelector('[data-port="tokens-out"]'),
			},
			build,
			applyStatic: () => {},
		});
	});
</script>

<div class="scene" bind:this={root}>
	<StationHead number={2} title="Tokenization" accent="history" />
	<DiagramPanel label="Station outline" caption="Words become the small pieces a model can look up and process.">
		<p class="placeholder" data-diagram-panel>
			<strong>Words become machine-readable pieces.</strong> This station follows a prompt as it shatters into tokens, keeping leading spaces and stamping each piece with an illustrative lookup ID. The examples teach the shape of tokenization, not a real model's vocabulary.
		</p>
	</DiagramPanel>
	<div class="ports" aria-label="Station ports">
		<div class="port" data-port="prompt-in" aria-hidden="true"><span>prompt in</span></div>
		<div class="port" data-port="tokens-out" aria-hidden="true"><span>tokens out</span></div>
	</div>
</div>

<style>
	.scene {
		position: relative;
		display: grid;
		place-content: center;
		gap: clamp(1.25rem, 4vh, 3rem);
		min-height: 100svh;
		padding: clamp(2rem, 7vh, 5rem) clamp(1rem, 6vw, 6rem);
		background: var(--c-paper);
		color: var(--c-ink);
	}

	.placeholder {
		max-width: 60ch;
		color: var(--c-ink-muted);
		font-size: clamp(1rem, 1.3vw, 1.15rem);
		line-height: 1.65;
	}

	.placeholder strong {
		display: block;
		margin-block-end: 0.45rem;
		color: var(--c-ink);
		font-size: 1.05em;
	}

	.ports {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: min(100%, 42rem);
		margin-block-start: clamp(2rem, 8vh, 6rem);
	}

	.port {
		display: grid;
		place-items: center;
		width: clamp(10rem, 20vw, 14rem);
		min-width: 10rem;
		height: clamp(5rem, 8vw, 7rem);
		border: 1px solid var(--c-line-strong);
		border-radius: 0.75rem;
		background: var(--c-surface);
		box-shadow: var(--panel-shadow);
		color: var(--c-ink-muted);
		font-family: var(--mono);
		font-size: 0.72rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	@media (max-width: 38rem) {
		.ports {
			gap: 0.65rem;
		}

		.port {
			min-width: 0;
			width: 50%;
		}
	}
</style>
