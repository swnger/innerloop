<script lang="ts">
	import { onMount } from 'svelte';

	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import { manifest } from '$lib/journey/stations.manifest';
	import { DUR, EASE, STAGGER } from '$lib/motion/tokens';
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
				const strategies = ctx.root.querySelectorAll<HTMLElement>('[data-strategy]');
				const timeline = ctx.gsap.timeline();

				if (panel) {
					timeline.from(panel, { autoAlpha: 0, y: 20, duration: DUR.beat, ease: EASE.out });
					timeline.from(
						strategies,
						{ autoAlpha: 0, y: 12, duration: DUR.micro, stagger: STAGGER.tight, ease: EASE.out },
						`<${STAGGER.tight}`,
					);
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
			label="Context engineering · per call"
			caption="Context engineering is choosing what enters each model call."
		>
			<p class="lede">
				A bloated context makes a call costlier, noisier, and more likely to overflow. Before every
				call, choose the smallest useful set of information.
			</p>

			<div class="packing-row">
				<div class="band-sketch band-sketch--bloated">
					<span class="sketch-label">arriving context</span>
					<div class="band band--bloated" aria-hidden="true">
						<i></i><i></i><i></i><i></i><i></i><i></i>
					</div>
					<span class="sketch-note">everything carried forward</span>
				</div>
				<div class="problem-list" aria-label="Problems with bloated context">
					<span><b>cost</b> more tokens to process</span>
					<span><b>noise</b> useful details get buried</span>
					<span><b>overflow</b> the call can exceed its limit</span>
				</div>
			</div>

			<div class="strategy-grid">
				<article class="strategy" data-strategy>
					<div class="strategy-heading"><span class="strategy-index">01</span><h3>Trim</h3></div>
					<p>Drop what is old, duplicate, or out of scope.</p>
					<div class="mini-flow" aria-hidden="true">
						<span class="mini-band mini-band--many"><i></i><i></i><i></i><i></i><i></i></span>
						<span class="flow-arrow">→</span>
						<span class="mini-band mini-band--few"><i></i><i></i></span>
					</div>
					<div class="mini-labels"><span>too much</span><span>needed now</span></div>
				</article>

				<article class="strategy" data-strategy>
					<div class="strategy-heading"><span class="strategy-index">02</span><h3>Summarize</h3></div>
					<p>Replace a long trail with a short, faithful brief.</p>
					<div class="mini-flow" aria-hidden="true">
						<span class="mini-band mini-band--many"><i></i><i></i><i></i><i></i><i></i></span>
						<span class="flow-arrow">→</span>
						<span class="mini-band mini-band--brief"><em>brief</em></span>
					</div>
					<div class="mini-labels"><span>long trail</span><span>short brief</span></div>
				</article>

				<article class="strategy" data-strategy>
					<div class="strategy-heading"><span class="strategy-index">03</span><h3>Retrieve</h3></div>
					<p>Fetch the few relevant records when the call needs them.</p>
					<div class="mini-flow" aria-hidden="true">
						<span class="mini-band mini-band--many"><i></i><i></i><i></i><i></i><i></i></span>
						<span class="flow-arrow">→</span>
						<span class="mini-band mini-band--few"><i></i><i></i></span>
					</div>
					<div class="mini-labels"><span>stored records</span><span>relevant set</span></div>
				</article>
			</div>
		</DiagramPanel>
	</div>

	<div class="ports" aria-hidden="true">
		<div class="port port--in" data-port="context-in">
			<span class="port-band port-band--bloated"></span>
		</div>
		<div class="port" data-port="response-in"></div>
		<div class="port" data-port="response-out"></div>
		<div class="port port--out" data-port="context-out">
			<span class="port-band port-band--slim"></span>
		</div>
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
		gap: clamp(1.5rem, 4vh, 3rem);
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

	.packing-row {
		display: grid;
		grid-template-columns: minmax(12rem, 0.9fr) minmax(14rem, 1.1fr);
		gap: 1rem;
		align-items: center;
		padding: 1rem;
		border: 1px solid var(--c-line);
		border-radius: 0.6rem;
		background: var(--c-sunken);
	}

	.band-sketch {
		display: grid;
		gap: 0.45rem;
	}

	.sketch-label,
	.sketch-note,
	.mini-labels,
	.strategy-index {
		color: var(--c-ink-muted);
		font: 500 0.68rem/1.3 var(--mono);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.sketch-note {
		font-size: 0.65rem;
		text-transform: none;
	}

	.band {
		display: flex;
		gap: 0.22rem;
		min-height: 2.7rem;
		padding: 0.42rem;
		border: 1px solid var(--concept-history);
		border-radius: 0.45rem;
		background: var(--concept-history-fill);
	}

	.band i,
	.mini-band i {
		display: block;
		flex: 1;
		border-radius: 0.2rem;
		background: var(--concept-history);
		opacity: 0.72;
	}

	.band i:nth-child(2n),
	.mini-band i:nth-child(2n) {
		opacity: 0.42;
	}

	.problem-list {
		display: grid;
		gap: 0.55rem;
		color: var(--c-ink-muted);
		font-size: 0.88rem;
		line-height: 1.35;
	}

	.problem-list span {
		display: block;
		padding-inline-start: 0.8rem;
		border-inline-start: 2px solid var(--concept-tool-output);
	}

	.problem-list b {
		color: var(--c-ink);
		font-weight: 700;
	}

	.strategy-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
		margin-block-start: 1rem;
	}

	.strategy {
		display: grid;
		align-content: start;
		gap: 0.55rem;
		min-width: 0;
		padding: 0.9rem;
		border: 1px solid var(--c-line);
		border-radius: 0.55rem;
		background: var(--c-paper);
	}

	.strategy-heading {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
	}

	.strategy h3 {
		margin: 0;
		font: 650 1.05rem/1.1 var(--display);
		letter-spacing: -0.02em;
	}

	.strategy p {
		margin: 0;
		color: var(--c-ink-muted);
		font-size: 0.82rem;
		line-height: 1.4;
	}

	.mini-flow {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 0.62fr);
		align-items: center;
		gap: 0.35rem;
		margin-block-start: 0.25rem;
	}

	.mini-band {
		display: flex;
		gap: 0.16rem;
		height: 1.3rem;
		padding: 0.2rem;
		border: 1px solid var(--concept-history);
		border-radius: 0.28rem;
		background: var(--concept-history-fill);
	}

	.mini-band--brief {
		display: grid;
		place-items: center;
		border-color: var(--concept-response);
		background: var(--concept-response-fill);
		color: var(--c-ink);
		font: 600 0.55rem/1 var(--mono);
	}

	.mini-band--brief em {
		font-style: normal;
	}

	.flow-arrow {
		color: var(--c-ink-muted);
		font-size: 1.1rem;
	}

	.mini-labels {
		display: flex;
		justify-content: space-between;
		gap: 0.4rem;
		font-size: 0.58rem;
		text-transform: none;
	}

	.ports {
		display: grid;
		grid-template-columns: repeat(4, minmax(7rem, 1fr));
		gap: 0.75rem;
		width: min(100%, 58rem);
	}

	.port {
		position: relative;
		display: grid;
		width: 100%;
		min-height: 4.8rem;
		place-items: center;
		border: 1px solid var(--concept-history);
		border-radius: 0.5rem;
		background: var(--concept-history-fill);
		color: var(--concept-history);
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

	.port-band {
		display: block;
		width: 72%;
		height: 1.35rem;
		border: 1px solid var(--concept-history);
		border-radius: 0.28rem;
		background: repeating-linear-gradient(
			90deg,
			var(--concept-history) 0 0.34rem,
			var(--concept-history-fill) 0.34rem 0.52rem
		);
		opacity: 0.75;
	}

	.port-band--slim {
		width: 50%;
		height: 0.8rem;
		border-color: var(--concept-user);
		background: var(--concept-user-fill);
	}

	@media (max-width: 46rem) {
		.packing-row,
		.strategy-grid {
			grid-template-columns: 1fr;
		}

		.ports {
			grid-template-columns: repeat(2, minmax(8rem, 1fr));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.scene {
			gap: 1.5rem;
		}
	}
</style>
