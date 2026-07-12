<script lang="ts">
	import { onMount } from 'svelte';
	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import GuessMachine from './GuessMachine.svelte';
	import { DUR, EASE, STAGGER } from '$lib/motion/tokens';
	import { manifest } from '$lib/journey/stations.manifest';
	import type { SceneProps, StationContext } from '$lib/journey/types';

	let { register }: SceneProps = $props();
	let root: HTMLDivElement;
	let requestMeasure = () => {};
	const station = manifest.find((entry) => entry.meta.id === 'inference');

	const probabilities = [
		{ token: 'The', percentage: '48%', width: '48%' },
		{ token: 'A', percentage: '22%', width: '22%' },
		{ token: 'This', percentage: '13%', width: '13%' },
		{ token: 'One', percentage: '8%', width: '8%' },
	];
	const streamTokens = ['run_tests', '(', "'failing_test'", ')'];

	const build = (ctx: StationContext) => {
		const timeline = ctx.gsap.timeline();
		const packet = ctx.root.querySelector<HTMLElement>('[data-beat="packet"]');
		const instrument = ctx.root.querySelector<HTMLElement>('[data-beat="instrument"]');
		const probabilityPanel = ctx.root.querySelector<HTMLElement>('[data-beat="probabilities"]');
		const filmstrip = ctx.root.querySelector<HTMLElement>('[data-beat="filmstrip"]');
		const guessMachine = ctx.root.querySelector<HTMLElement>('[data-beat="guess-machine"]');
		const stream = ctx.root.querySelector<HTMLElement>('[data-beat="stream"]');
		const pickedLine = ctx.root.querySelector<HTMLElement>('[data-pick]');
		const progress = ctx.root.querySelector<HTMLElement>('[data-plateau-fill]');
		const bars = ctx.root.querySelectorAll<HTMLElement>('[data-prob-bar]');
		const frames = ctx.root.querySelectorAll<HTMLElement>('[data-cycle-frame]');
		const streamedTokens = ctx.root.querySelectorAll<HTMLElement>('[data-stream-token]');

		requestMeasure = ctx.requestMeasure;
		if (ctx.reduced) {
			return timeline.to({}, { duration: 0.01 });
		}

		const beats = [packet, instrument, probabilityPanel, filmstrip, guessMachine, stream].filter(
			(element): element is HTMLElement => Boolean(element),
		);
		timeline.set(beats, { autoAlpha: 0 });
		timeline.set(frames, { autoAlpha: 0 });
		timeline.set(bars, { scaleX: 0, transformOrigin: 'left center' });
		if (pickedLine) timeline.set(pickedLine, { autoAlpha: 0 });
		timeline.set(streamedTokens, { autoAlpha: 0, y: 8 });

		if (packet) timeline.to(packet, { autoAlpha: 1, duration: DUR.beat, ease: EASE.out });
		if (instrument) timeline.to(instrument, { autoAlpha: 1, duration: DUR.beat, ease: EASE.out }, '<0.25');
		if (probabilityPanel) timeline.to(probabilityPanel, { autoAlpha: 1, duration: DUR.beat }, '+=0.15');
		if (bars.length) {
			timeline.to(bars, {
				scaleX: 1,
				duration: DUR.micro,
				ease: EASE.draw,
				stagger: STAGGER.tight,
			}, '<0.15');
		}
		if (pickedLine) timeline.to(pickedLine, { autoAlpha: 1, duration: DUR.micro, ease: EASE.out }, '+=0.1');
		if (filmstrip) timeline.to(filmstrip, { autoAlpha: 1, duration: DUR.beat }, '+=0.2');
		if (frames.length) {
			timeline.to(frames, { autoAlpha: 1, y: 0, duration: DUR.beat, ease: EASE.out, stagger: 0.22 }, '<0.1');
		}
		if (guessMachine) timeline.to(guessMachine, { autoAlpha: 1, duration: DUR.beat, ease: EASE.out }, '+=0.3');
		if (progress) timeline.to(progress, { scaleX: 1, duration: 1.1, ease: EASE.draw }, '+=0.15');
		// This is deliberate scrub distance: the machine is interactive while the reader keeps scrolling.
		timeline.to({}, { duration: 3 });
		if (stream) timeline.to(stream, { autoAlpha: 1, duration: DUR.beat, ease: EASE.out }, '+=0.2');
		if (streamedTokens.length) {
			timeline.to(streamedTokens, { autoAlpha: 1, y: 0, duration: DUR.micro, ease: EASE.out, stagger: STAGGER.chip }, '<0.15');
		}
		return timeline;
	};

	onMount(() => {
		if (!station) throw new Error('Missing manifest entry for inference');
		register({
			meta: station.meta,
			sceneEl: root,
			ports: {
				'context-in': () => root.querySelector('[data-port="context-in"]'),
				'response-out': () => root.querySelector('[data-port="response-out"]'),
			},
			build,
			applyStatic: (ctx) => {
				ctx.root.querySelectorAll<HTMLElement>('[data-beat]').forEach((beat) => {
					beat.style.removeProperty('opacity');
					beat.style.removeProperty('visibility');
					beat.style.removeProperty('transform');
				});
				ctx.root.querySelectorAll<HTMLElement>('[data-cycle-frame]').forEach((frame) => {
					frame.style.removeProperty('opacity');
					frame.style.removeProperty('visibility');
					frame.style.removeProperty('transform');
				});
				ctx.root.querySelectorAll<HTMLElement>('[data-prob-bar]').forEach((bar) => {
					bar.style.removeProperty('transform');
				});
				ctx.root.querySelectorAll<HTMLElement>('[data-stream-token]').forEach((token) => {
					token.style.removeProperty('opacity');
					token.style.removeProperty('transform');
				});
				const plateauFill = ctx.root.querySelector<HTMLElement>('[data-plateau-fill]');
				if (plateauFill) plateauFill.style.transform = 'scaleX(1)';
			},
		});
	});
</script>

<div class="scene" bind:this={root}>
	<StationHead number={4} title="Next-token prediction" accent="response" />

	<DiagramPanel label="The next move" caption="The model does not write a finished answer. It repeats one small operation: read the packet, score possible next tokens, and append one.">
		<div class="lead" data-diagram-panel>
			<p class="lead__claim">A response is assembled one guess at a time.</p>
			<p class="lead__copy">Inference is what happens when a trained model is run on a context packet. There is no hidden paragraph waiting inside. Each pass produces a distribution of possible next tokens, then the chosen token becomes part of the next pass.</p>
		</div>
	</DiagramPanel>

	<section class="stage" aria-labelledby="packet-title">
		<div class="section-intro">
			<p class="section-label">01 · feed the instrument</p>
			<h2 id="packet-title">The packet enters the model</h2>
			<p>Every call starts with the same kind of intake: a bounded packet of tokens. The model reads the whole sequence before making one prediction.</p>
		</div>

		<div class="feed-layout">
			<div class="packet" data-beat="packet">
				<span class="packet__label">context packet</span>
				<div class="packet__tokens"><span>system</span><span>history</span><span>user</span><span>tool rules</span></div>
				<span class="packet__caption">the complete input for this call</span>
			</div>
			<div class="feed-arrow" aria-hidden="true">→</div>
			<div class="instrument" data-beat="instrument">
				<div class="instrument__lattice" aria-hidden="true">
					{#each Array(20) as _, index}<i style={`--i:${index}`}></i>{/each}
				</div>
				<div class="instrument__copy">
					<span class="instrument__eyebrow">trained model · one full pass</span>
					<strong>next-token instrument</strong>
					<span>patterns in the packet become scores</span>
				</div>
				<div class="instrument__intake" aria-hidden="true"></div>
				<div class="port port--context" data-port="context-in" aria-hidden="true"><span>context in</span></div>
			</div>
			<div class="intake-note">read all of it<br /><span>then make one guess</span></div>
		</div>
	</section>

	<section class="stage stage--probabilities" data-beat="probabilities" aria-labelledby="probability-title">
		<div class="section-intro">
			<p class="section-label">02 · score and choose</p>
			<h2 id="probability-title">Many plausible next tokens</h2>
			<p>The model assigns a score to every token it knows. These bars are deliberately fake but plausible: the leading guess is not the only strategy.</p>
		</div>
		<div class="probability-layout">
			<div class="sequence" aria-label="Current sequence">
				<span class="sequence__label">tokens so far</span>
				<p><span>The</span><span> failing</span><span> test</span><b> ?</b></p>
			</div>
			<div class="probability-panel">
				<div class="probability-panel__heading"><span>candidate token</span><span>share of score</span></div>
				{#each probabilities as candidate (candidate.token)}
					<div class="probability-row" class:selected={candidate.token === 'The'}>
						<span class="probability-row__token">{candidate.token}</span>
						<span class="probability-row__track"><i data-prob-bar style={`width:${candidate.width}`}></i></span>
						<span class="probability-row__value">{candidate.percentage}</span>
					</div>
				{/each}
				<div class="selected-note" data-pick><span>picked</span><strong>The</strong><span>appended to the output line</span></div>
				<div class="probability-tail">… the rest share the remaining 9%</div>
			</div>
		</div>
		<p class="annotation">Taking the top guess is one strategy. A weighted draw can choose a less likely candidate, which is why two runs can differ.</p>
	</section>

	<section class="stage stage--cycle" data-beat="filmstrip" aria-labelledby="cycle-title">
		<div class="section-intro">
			<p class="section-label">03 · run it again</p>
			<h2 id="cycle-title">The chosen token becomes tomorrow's input</h2>
			<p class="cycle-explain">The selected token is appended, then the instrument reads the longer sequence from the beginning. This autoregressive re-read is the core loop.</p>
		</div>
		<div class="filmstrip" aria-label="Three static frames of the autoregressive cycle">
			<article class="cycle-frame" data-cycle-frame>
				<span class="cycle-frame__number">1</span>
				<div><strong>read → guess</strong><p>The first draw appends <code>The</code>.</p></div>
				<span class="cycle-frame__arrow" aria-hidden="true">→</span>
			</article>
			<article class="cycle-frame" data-cycle-frame>
				<span class="cycle-frame__number">2</span>
				<div><strong>append → re-read</strong><p>The longer line now starts <code>The <em>fix</em></code>.</p></div>
				<span class="cycle-frame__arrow" aria-hidden="true">↺</span>
			</article>
			<article class="cycle-frame" data-cycle-frame>
				<span class="cycle-frame__number">3</span>
				<div><strong>append → re-read</strong><p>New scores choose <code>The fix <em>is</em> …</code>; the whole line returns to the same intake.</p></div>
				<span class="cycle-frame__arrow" aria-hidden="true">↺</span>
			</article>
		</div>
		<div class="cycle-loop-note"><span aria-hidden="true">↺</span> append → re-read the full sequence → fan out new scores → append again</div>
	</section>

	<section class="stage stage--machine" data-beat="guess-machine" aria-labelledby="machine-title">
		<div class="section-intro">
			<p class="section-label">04 · your turn</p>
			<h2 id="machine-title">Run a small Guess Machine</h2>
			<p>Choose a candidate to append it, or re-roll to see alternatives. The interaction is illustrative, but the loop — score, draw, append, repeat — is the real shape.</p>
		</div>
		<GuessMachine onreflow={() => requestMeasure()} />
		<div class="plateau-cue" aria-label="Keep scrolling to leave the interactive plateau">
			<span>keep scrolling</span>
			<span class="plateau-cue__track"><i data-plateau-fill></i></span>
			<span>the machine stays available while this fills</span>
		</div>
	</section>

	<section class="stage stage--stream" data-beat="stream" aria-labelledby="stream-title">
		<div class="section-intro">
			<p class="section-label">05 · stream the output</p>
			<h2 id="stream-title">The output can be a tool request</h2>
			<p>The chosen tokens arrive one by one. This response is not prose: it names a tool the surrounding harness can run.</p>
		</div>
		<div class="stream-panel">
			<div class="stream-panel__head"><span>model response</span><span class="stream-panel__status">complete enough to dispatch</span></div>
			<p class="stream-line" aria-label="Tool request run_tests failing_test"><span class="stream-line__prefix">response →</span>{#each streamTokens as token (token)}<span class="stream-token" data-stream-token>{token}</span>{/each}</p>
			<p class="stream-caption">It looks like text, but the next station will validate it against a tool schema before doing anything.</p>
		</div>
		<div class="port port--response" data-port="response-out" aria-hidden="true"><span>response out</span></div>
	</section>
</div>

<style>
	.scene {
		position: relative;
		display: grid;
		gap: clamp(3rem, 10vh, 8rem);
		min-height: 100svh;
		padding: clamp(2rem, 7vh, 5rem) clamp(1rem, 6vw, 6rem) clamp(5rem, 12vh, 10rem);
		background: var(--c-paper);
		color: var(--c-ink);
	}

	.lead { max-width: 70ch; }
	.lead__claim { margin: 0 0 0.75rem; color: var(--c-ink); font-size: clamp(1.35rem, 2.2vw, 2rem); font-weight: 600; line-height: 1.2; }
	.lead__copy { max-width: 65ch; margin: 0; color: var(--c-ink-muted); font-size: 1.05rem; line-height: 1.7; }

	.stage { position: relative; display: grid; gap: clamp(1.4rem, 4vh, 2.5rem); width: min(100%, 74rem); margin-inline: auto; }
	.section-intro { max-width: 62ch; }
	.section-label { margin: 0 0 0.65rem; color: var(--c-ink-muted); font: 500 0.76rem/1.3 var(--mono); letter-spacing: 0.04em; }
	h2 { margin: 0 0 0.7rem; font-size: clamp(1.55rem, 3.3vw, 2.55rem); line-height: 1.08; text-wrap: balance; }
	.section-intro p:not(.section-label) { margin: 0; color: var(--c-ink-muted); font-size: 1rem; line-height: 1.65; text-wrap: pretty; }

	.feed-layout { position: relative; display: grid; grid-template-columns: minmax(11rem, 0.75fr) 2.5rem minmax(18rem, 1.35fr) minmax(8rem, 0.6fr); align-items: center; gap: 1rem; padding: clamp(1.2rem, 3vw, 2.5rem); border: 1px solid var(--c-line); border-radius: 0.75rem; background: var(--c-surface); }
	.packet { display: grid; gap: 0.8rem; padding: 1rem; border: 1px solid var(--concept-history); border-radius: 0.55rem; background: var(--concept-history-fill); }
	.packet__label, .packet__caption { font: 500 0.72rem/1.4 var(--mono); }
	.packet__label { color: var(--concept-history); }
	.instrument { position: relative; display: grid; place-items: center; min-height: 12rem; overflow: visible; border: 1px solid var(--c-line-strong); border-radius: 1rem; background: var(--c-sunken); }
	.packet__tokens { display: flex; flex-wrap: wrap; gap: 0.35rem; }
	.packet__tokens span { padding: 0.25rem 0.4rem; border-radius: 0.25rem; background: var(--c-paper); color: var(--c-ink); font: 0.72rem/1.2 var(--mono); }
	.instrument > .port--context { position: absolute; left: 0; top: 50%; margin: 0; transform: translate(-100%, -50%); }
	.feed-arrow { color: var(--concept-history); font-size: 1.8rem; text-align: center; }
	.instrument__lattice { position: absolute; inset: 1rem; display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(4, 1fr); gap: 0.65rem; opacity: 0.5; }
	.instrument__lattice i { border: 1px solid var(--concept-history); border-radius: 50%; opacity: 0.45; }
	.instrument__copy { position: relative; display: grid; gap: 0.35rem; padding: 1.2rem; text-align: center; }
	.instrument__eyebrow { color: var(--c-ink-muted); font: 0.68rem/1.4 var(--mono); }
	.instrument__copy strong { font-size: clamp(1.15rem, 2.1vw, 1.55rem); }
	.instrument__copy > span:last-child { color: var(--c-ink-muted); font-size: 0.85rem; }
	.instrument__intake { position: absolute; left: -0.3rem; top: 50%; width: 0.7rem; height: 3rem; border: 1px solid var(--concept-history); border-radius: 0.25rem; background: var(--concept-history-fill); transform: translateY(-50%); }
	.intake-note { color: var(--c-ink-muted); font: 0.72rem/1.45 var(--mono); }
	.intake-note span { color: var(--concept-history); }
	.port { display: grid; place-items: center; width: clamp(10rem, 16vw, 13rem); min-height: 4.5rem; padding: 0.7rem; border: 1px dashed var(--c-line-strong); border-radius: 0.55rem; background: var(--c-surface); color: var(--c-ink-muted); font: 500 0.72rem/1.3 var(--mono); text-align: center; }
	.port--context { margin-inline: 2rem; border-color: var(--concept-history); color: var(--concept-history); }
	.port--response { margin-inline-start: auto; border-color: var(--concept-tools); color: var(--concept-tools); }

	.stage--probabilities, .stage--cycle, .stage--machine, .stage--stream { padding-block-start: clamp(1rem, 3vh, 2rem); }
	.probability-layout { display: grid; grid-template-columns: minmax(12rem, 0.7fr) minmax(20rem, 1.3fr); gap: clamp(1rem, 4vw, 4rem); align-items: start; }
	.sequence { padding: 1.2rem; border: 1px solid var(--c-line); border-radius: 0.5rem; background: var(--c-surface); }
	.sequence__label, .probability-panel__heading, .probability-tail { color: var(--c-ink-muted); font: 0.72rem/1.4 var(--mono); }
	.sequence__label { text-transform: uppercase; }
	.sequence p { margin: 1.4rem 0 0; color: var(--c-ink); font: 1rem/1.8 var(--mono); }
	.sequence p span { padding: 0.25rem 0.35rem; background: var(--concept-history-fill); }
	.sequence b { color: var(--concept-response); font-weight: 500; }
	.probability-panel { padding: 1.2rem; border: 1px solid var(--c-line); border-radius: 0.5rem; background: var(--c-surface); }
	.probability-panel__heading { display: grid; grid-template-columns: 8rem 1fr 3rem; gap: 0.8rem; padding-block-end: 0.65rem; border-block-end: 1px solid var(--c-line); text-transform: uppercase; }
	.probability-row { display: grid; grid-template-columns: 8rem 1fr 3rem; gap: 0.8rem; align-items: center; min-height: 2.45rem; border-block-end: 1px solid var(--c-line); }
	.probability-row.selected { color: var(--concept-response); }
	.probability-row__token, .probability-row__value { font: 0.82rem/1.3 var(--mono); }
	.probability-row__value { text-align: right; }
	.probability-row__track { height: 0.65rem; overflow: hidden; border-radius: 999px; background: var(--c-sunken); }
	.probability-row__track i { display: block; height: 100%; border-radius: inherit; background: var(--concept-response); transform-origin: left center; }
	.probability-tail { padding-block-start: 0.8rem; }
	.selected-note { display: flex; flex-wrap: wrap; gap: 0.55rem; align-items: baseline; margin-block-start: 0.9rem; padding-block-start: 0.8rem; border-block-start: 1px solid var(--c-line); color: var(--c-ink-muted); font-size: 0.82rem; }
	.selected-note strong { padding: 0.2rem 0.4rem; border-radius: 0.25rem; background: var(--concept-response-fill); color: var(--concept-response); font: 0.82rem/1.3 var(--mono); }
	.annotation, .cycle-loop-note { margin: 0; color: var(--c-ink-muted); font-size: 0.88rem; line-height: 1.55; }
	.annotation { max-width: 58ch; }

	.filmstrip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; }
	.cycle-frame { display: grid; grid-template-columns: auto 1fr auto; gap: 0.8rem; align-items: start; min-height: 10rem; padding: 1rem; border: 1px solid var(--c-line); border-radius: 0.55rem; background: var(--c-surface); }
	.cycle-frame__number { display: grid; place-items: center; width: 1.7rem; height: 1.7rem; border-radius: 50%; background: var(--concept-history-fill); color: var(--concept-history); font: 600 0.78rem/1 var(--mono); }
	.cycle-frame strong { display: block; margin-block-end: 0.45rem; color: var(--c-ink); font-size: 1rem; }
	.cycle-frame p { margin: 0; color: var(--c-ink-muted); font-size: 0.9rem; line-height: 1.55; }
	.cycle-frame code { color: var(--concept-history); font: 0.8rem/1.4 var(--mono); }
	.cycle-frame em { color: var(--concept-response); font-style: normal; }
	.cycle-frame__arrow { color: var(--concept-response); font-size: 1.4rem; }
	.cycle-loop-note { display: flex; align-items: center; gap: 0.55rem; padding: 0.75rem 1rem; border: 1px solid var(--concept-response); border-radius: 0.4rem; background: var(--concept-response-fill); }
	.cycle-loop-note > span { font-size: 1.3rem; }

	.plateau-cue { display: grid; grid-template-columns: auto minmax(8rem, 1fr) auto; gap: 0.7rem; align-items: center; color: var(--c-ink-muted); font: 0.72rem/1.3 var(--mono); }
	.plateau-cue__track { height: 0.45rem; overflow: hidden; border-radius: 999px; background: var(--c-sunken); }
	.plateau-cue__track i { display: block; width: 100%; height: 100%; border-radius: inherit; background: var(--concept-response); transform: scaleX(0); transform-origin: left center; }
	.stream-panel { padding: clamp(1.2rem, 3vw, 2rem); border: 1px solid var(--concept-tools); border-radius: 0.7rem; background: var(--concept-tools-fill); }
	.stream-panel__head { display: flex; justify-content: space-between; gap: 1rem; padding-block-end: 0.8rem; border-block-end: 1px solid color-mix(in oklch, var(--concept-tools) 45%, var(--c-line)); color: var(--concept-tools); font: 0.72rem/1.3 var(--mono); text-transform: uppercase; }
	.stream-panel__status { color: var(--c-ink-muted); text-transform: none; }
	.stream-line { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: baseline; margin: 1.5rem 0 1rem; color: var(--c-ink); font: clamp(1rem, 2vw, 1.35rem)/1.6 var(--mono); }
	.stream-line__prefix { color: var(--concept-tools); }
	.stream-token { padding: 0.2rem 0.4rem; border-radius: 0.25rem; background: var(--c-paper); }
	.stream-caption { max-width: 60ch; margin: 0; color: var(--c-ink-muted); font-size: 0.9rem; line-height: 1.55; }

	@media (max-width: 52rem) {
		.feed-layout { grid-template-columns: 1fr 2rem 1.4fr; }
		.intake-note { grid-column: 3; }
		.probability-layout { grid-template-columns: 1fr; }
	}

	@media (max-width: 42rem) {
		.scene { gap: 4rem; }
		.feed-layout { grid-template-columns: 1fr; }
		.feed-arrow { transform: rotate(90deg); }
		.intake-note { grid-column: auto; }
		.port--context { margin-inline: 0; }
		.filmstrip { grid-template-columns: 1fr; }
		.cycle-frame { min-height: 0; }
		.plateau-cue { grid-template-columns: 1fr; }
		.plateau-cue__track { width: 100%; }
		.stream-panel__head { display: grid; }
	}
</style>
