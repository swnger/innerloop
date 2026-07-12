<script lang="ts">
	import { onMount } from 'svelte';

	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import { manifest } from '$lib/journey/stations.manifest';
	import { DUR, EASE, STAGGER } from '$lib/motion/tokens';
	import type { SceneProps, StationHandle } from '$lib/journey/types';

	let { register }: SceneProps = $props();
	let root: HTMLElement;

	const meta = manifest.find((entry) => entry.meta.id === 'harness-engineering')!.meta;

	onMount(() => {
		const sceneEl = root;
		const handle: StationHandle = {
			meta,
			sceneEl,
			ports: {
				'context-in': () => sceneEl.querySelector('[data-port="context-in"]'),
				'response-in': () => sceneEl.querySelector('[data-port="response-in"]'),
				'response-out': () => sceneEl.querySelector('[data-port="response-out"]')
			},
			build: (ctx) => {
				const panel = ctx.root.querySelector<HTMLElement>('[data-diagram-panel]');
				const ring = ctx.root.querySelector<HTMLElement>('[data-loop-ring]');
				const terms = ctx.root.querySelector<HTMLElement>('[data-terms]');
				const timeline = ctx.gsap.timeline();

				if (panel) {
					timeline.from(panel, { autoAlpha: 0, y: 20, duration: DUR.beat, ease: EASE.out });
					if (ring) {
						timeline.from(
							ring,
							{ autoAlpha: 0, scale: 0.96, duration: DUR.settle, ease: EASE.out },
							`<${STAGGER.tight}`,
						);
					}
					if (terms) {
						timeline.from(
							terms,
							{ autoAlpha: 0, y: 12, duration: DUR.micro, ease: EASE.out },
							`<${STAGGER.tight}`,
						);
					}
				}
				timeline.to({}, { duration: DUR.beat });
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
		<DiagramPanel
			label="Harness engineering · the outer loop"
			caption="The harness surrounds a model call; it decides what happens when a call needs another try or a tool."
		>
			<p class="lede">
				The model call is one small step. The harness is the surrounding loop that prepares, checks, and
				repeats that step.
			</p>

			<div class="loop-diagram">
				<div class="loop-ring" data-loop-ring aria-hidden="true">
					<div class="ring-label">
						retries <span>·</span> guardrails <span>·</span> orchestration <span>·</span> tool registry
						<span>·</span> the outer loop
					</div>
					<div class="call-capsule">one model call</div>
				</div>
				<p class="diagram-explanation">
					The outer loop can call the model again, reject unsafe output, or route a tool request. It
					keeps the call moving without changing what the model is.
				</p>
			</div>

			<div class="terms-panel" data-terms aria-label="Definitions kept distinct">
				<article class="term term--context">
					<span class="term-kicker">context engineering</span>
					<h3>What enters one call</h3>
					<blockquote><q>context engineering chooses what enters each model call;</q></blockquote>
				</article>
				<article class="term term--harness">
					<span class="term-kicker">harness engineering</span>
					<h3>What surrounds the call</h3>
					<blockquote>
						<q>harness engineering is the surrounding loop, tools, retries, orchestration, and guardrails.</q>
					</blockquote>
				</article>
			</div>
		</DiagramPanel>
	</div>

	<div class="closing" aria-label="Journey ending">
		<p>the loop closes</p>
		<a href="#agent-loop">start again</a>
	</div>

	<div class="ports" aria-hidden="true">
		<div class="port" data-port="context-in"></div>
		<div class="port" data-port="response-in"></div>
		<div class="port" data-port="response-out"></div>
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
		gap: clamp(1.35rem, 3.5vh, 2.6rem);
		padding: var(--page-gutter);
		background: var(--c-paper);
		color: var(--c-ink);
	}

	.diagram-shell {
		width: min(100%, 58rem);
	}

	.diagram-shell :global(p) {
		max-width: 68ch;
	}

	.lede {
		margin: 0 0 1.35rem;
		font-size: clamp(1rem, 1.4vw, 1.12rem);
		line-height: 1.55;
	}

	.loop-diagram {
		display: grid;
		grid-template-columns: minmax(15rem, 0.85fr) minmax(13rem, 1.15fr);
		gap: 1.25rem;
		align-items: center;
		padding: 1.1rem;
		border: 1px solid var(--c-line);
		border-radius: 0.65rem;
		background: var(--c-sunken);
	}

	.loop-ring {
		position: relative;
		display: grid;
		width: min(100%, 19rem);
		aspect-ratio: 1;
		margin-inline: auto;
		place-items: center;
		border: 2px solid var(--concept-tools);
		border-radius: 50%;
		background:
			radial-gradient(circle at center, var(--c-paper) 0 29%, transparent 29.5%),
			color-mix(in oklch, var(--concept-tools-fill) 68%, var(--c-sunken));
		box-shadow: inset 0 0 0 0.42rem var(--c-paper), inset 0 0 0 0.5rem var(--concept-tools);
	}

	.ring-label {
		position: absolute;
		inset: 0.8rem 1.35rem auto;
		color: var(--concept-tools);
		font: 600 0.66rem/1.45 var(--mono);
		letter-spacing: 0.035em;
		text-align: center;
		text-transform: uppercase;
	}

	.ring-label span {
		color: var(--concept-tool-output);
	}

	.call-capsule {
		display: grid;
		width: 8.3rem;
		min-height: 3rem;
		place-items: center;
		border: 1px solid var(--concept-response);
		border-radius: 999px;
		background: var(--concept-response-fill);
		color: var(--c-ink);
		font: 650 0.82rem/1.2 var(--display);
		letter-spacing: -0.01em;
		text-align: center;
	}

	.diagram-explanation {
		margin: 0;
		color: var(--c-ink-muted);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.terms-panel {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0;
		margin-block-start: 1rem;
		border: 1px solid var(--c-line);
		border-radius: 0.6rem;
		background: var(--c-paper);
		overflow: hidden;
	}

	.term {
		display: grid;
		align-content: start;
		gap: 0.55rem;
		padding: 1rem 1.1rem;
	}

	.term + .term {
		border-inline-start: 1px solid var(--c-line);
	}

	.term--context {
		border-block-start: 3px solid var(--concept-history);
	}

	.term--harness {
		border-block-start: 3px solid var(--concept-tools);
	}

	.term-kicker {
		color: var(--c-ink-muted);
		font: 600 0.68rem/1.3 var(--mono);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.term h3 {
		margin: 0;
		font: 650 1.05rem/1.15 var(--display);
		letter-spacing: -0.02em;
	}

	.term blockquote {
		margin: 0;
		color: var(--c-ink-muted);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.term q {
		quotes: '“' '”';
	}

	.closing {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: min(100%, 58rem);
		padding-block: 0.15rem;
	}

	.closing p {
		margin: 0;
		font: 650 clamp(1.2rem, 2vw, 1.55rem)/1.1 var(--display);
		letter-spacing: -0.025em;
	}

	.closing a {
		color: var(--brand-strong);
		font-weight: 650;
		text-underline-offset: 0.22em;
	}

	.closing a:focus-visible {
		outline: 2px solid var(--brand);
		outline-offset: 0.25rem;
	}

	.ports {
		display: grid;
		grid-template-columns: repeat(3, minmax(8rem, 1fr));
		gap: 0.75rem;
		width: min(100%, 58rem);
	}

	.port {
		position: relative;
		display: grid;
		width: 100%;
		min-height: 4.8rem;
		place-items: center;
		border: 1px solid var(--concept-system);
		border-radius: 0.5rem;
		background: var(--concept-system-fill);
		color: var(--concept-system);
		font: 500 0.66rem/1.2 var(--mono);
		letter-spacing: 0.04em;
	}

	.port::before {
		content: attr(data-port);
		position: absolute;
		inset-inline: 0.45rem;
		inset-block-start: 0.42rem;
		color: var(--c-ink-muted);
		font-size: 0.6rem;
		text-align: center;
	}

	@media (max-width: 46rem) {
		.loop-diagram,
		.terms-panel {
			grid-template-columns: 1fr;
		}
		.ports {
			grid-template-columns: 1fr;
		}
		.term + .term {
			border-inline-start: 0;
			border-block-start: 1px solid var(--c-line);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.scene {
			gap: 1.5rem;
		}
	}
</style>
