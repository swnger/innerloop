<script lang="ts">
	import { onMount } from 'svelte';
	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import { manifest } from '$lib/journey/stations.manifest';
	import type { SceneProps, StationContext } from '$lib/journey/types';

	let { register }: SceneProps = $props();
	let root: HTMLDivElement;
	const station = manifest.find((entry) => entry.meta.id === 'context-window');

	const build = (ctx: StationContext) => {
		const timeline = ctx.gsap.timeline();
		const panel = ctx.root.querySelector<HTMLElement>('[data-diagram-panel]');
		if (panel) timeline.from(panel, { autoAlpha: 0, y: 24 });
		timeline.to({}, { duration: 2 });
		return timeline;
	};

	onMount(() => {
		if (!station) throw new Error('Missing manifest entry for context-window');
		register({
			meta: station.meta,
			sceneEl: root,
			ports: {
				'tokens-in': () => root.querySelector('[data-port="tokens-in"]'),
				'context-out': () => root.querySelector('[data-port="context-out"]'),
			},
			build,
			applyStatic: () => {},
		});
	});
</script>

<div class="scene" bind:this={root}>
	<StationHead number={3} title="The context window" accent="history" />
	<DiagramPanel label="Station outline" caption="The model reads a bounded packet of the conversation on every call.">
		<p class="placeholder" data-diagram-panel>
			<strong>A call carries its own short-term workspace.</strong> This station builds a context window from system instructions, tool definitions, and conversation history, then shows the stack pressing against its capacity. Each call gives the model this packet and nothing else, so deciding what to keep is a harness choice.
		</p>
	</DiagramPanel>
	<div class="ports" aria-label="Station ports">
		<div class="port" data-port="tokens-in" aria-hidden="true"><span>tokens in</span></div>
		<div class="port" data-port="context-out" aria-hidden="true"><span>context out</span></div>
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
