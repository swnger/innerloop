<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import TransitionCaption from '$lib/components/TransitionCaption.svelte';
	import TravelerLayer from './travelers/TravelerLayer.svelte';
	import LoopMap from './LoopMap.svelte';
	import Station from './Station.svelte';
	import { journey } from './journey.svelte';
	import { manifest } from './stations.manifest';
	import { transitions } from './transitions';
	import { registry } from './stations.registry';
	import { initJourney } from './orchestrator';
	import type { JourneyController } from './orchestrator';

	let viewportEl: HTMLElement;
	let worldEl: HTMLElement;
	let layerEl: HTMLElement;
	let journeyRoot: HTMLElement;
	let controller: JourneyController | undefined;
	let disposed = false;

	onMount(() => {
		initJourney({ viewport: viewportEl, world: worldEl, layer: layerEl }).then((nextController) => {
			if (disposed) {
				nextController.destroy();
				return;
			}
			controller = nextController;
		});
	});

	onDestroy(() => {
		disposed = true;
		controller?.destroy();
	});
</script>

<svelte:head>
	<title>The Inner Loop — how LLMs and coding agents actually work</title>
	<meta
		name="description"
		content="An internal field guide: travel with a prompt through the agentic loop — tokenization, the context window, next-token prediction, tool calling — and back home."
	/>
</svelte:head>

<header class="site-header">
	<h1 class="wordmark-heading"><a class="wordmark" href="#agent-loop" aria-label="The Inner Loop home">The Inner Loop</a></h1>
	<div class="header-meta">
		<p aria-live="polite">Chapter {journey.active?.number ?? 1}/07</p>
		<ThemeToggle />
	</div>
</header>
<LoopMap />

<div class="journey" bind:this={journeyRoot} data-journey="static" data-enhanced="false">
	<main class="viewport" bind:this={viewportEl} aria-label="The Inner Loop journey">
		<div class="world" bind:this={worldEl}>
			{#each manifest as entry}
				{@const Scene = registry[entry.meta.id]}
				<Station meta={entry.meta}>
					<Scene register={(handle) => journey.register(handle)} />
				</Station>
				<TransitionCaption
					direction={entry.exit.direction}
					caption={transitions[entry.exit.id].caption}
				/>
			{/each}
			<TravelerLayer bind:el={layerEl} />
		</div>
	</main>
</div>

<footer class="site-footer">
	<p class="footer-wordmark">The Inner Loop</p>
	<p>Illustrative field guide — the behaviors are real, the examples are simplified.</p>
</footer>

<style>
	.site-header {
		position: relative;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		min-height: 4.5rem;
		padding: 0.8rem var(--page-gutter);
		background: var(--header-bg);
		border-bottom: 1px solid var(--c-line);
		backdrop-filter: blur(8px);
	}

	.wordmark-heading {
		margin: 0;
		font-size: inherit;
		line-height: inherit;
		font-weight: inherit;
	}

	.wordmark,
	.footer-wordmark {
		color: var(--c-ink);
		font-family: var(--display);
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		text-decoration: none;
	}

	.wordmark:focus-visible {
		color: var(--c-brand-strong);
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header-meta p {
		margin: 0;
		color: var(--c-ink-muted);
		font-family: var(--display);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.journey {
		position: relative;
		isolation: isolate;
		/* Decorative docks may poke past the flow edge on the static branch. */
		overflow-x: clip;
	}

	.viewport {
		position: relative;
		min-height: 0;
	}

	.world {
		position: relative;
		width: 100%;
	}

	.world :global(.transition-caption) {
		margin: 0 auto;
		padding: 1.25rem var(--page-gutter);
		border-block: 1px solid var(--c-line);
	}

	:global(.journey[data-journey='enhanced']) .viewport {
		height: 100svh;
		min-height: 100svh;
		overflow: hidden;
	}

	:global(.journey[data-journey='enhanced']) .world {
		height: 100%;
		will-change: transform;
	}

	:global(.journey[data-journey='enhanced']) :global(.transition-caption) {
		display: none;
	}

	.site-footer {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 2rem;
		padding: 2.5rem var(--page-gutter) 3.5rem;
		color: var(--c-ink-muted);
		font-size: 0.875rem;
		border-top: 1px solid var(--c-line);
	}

	.site-footer p {
		margin: 0;
	}

	.footer-wordmark {
		color: var(--c-ink);
		font-size: 0.95rem;
	}

	@media (max-width: 760px) {
		.site-header {
			min-height: 4rem;
		}

		.site-footer {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.75rem;
			padding-top: 2rem;
		}
	}
</style>
