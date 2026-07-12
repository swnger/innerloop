<script lang="ts">
	import { onMount } from 'svelte';
	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import GoDeeper from '$lib/components/GoDeeper.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import TokenLab from './TokenLab.svelte';
	import { tokenize, display } from '$lib/tokenizer';
	import { DUR, EASE, STAGGER } from '$lib/motion/tokens';
	import { manifest } from '$lib/journey/stations.manifest';
	import type { SceneProps, StationContext } from '$lib/journey/types';

	let { register }: SceneProps = $props();
	let root: HTMLDivElement;
	let requestMeasure: () => void = () => {};
	const station = manifest.find((entry) => entry.meta.id === 'tokenization');
	const PROMPT = 'Fix the failing test';
	const promptTokens = tokenize(PROMPT);
	const strawberryTokens = tokenize('strawberry');
	const digitTokens = tokenize('12345');

	const build = (ctx: StationContext) => {
		requestMeasure = ctx.requestMeasure;
		const timeline = ctx.gsap.timeline();
		const panel = ctx.root.querySelector<HTMLElement>('[data-diagram-panel]');
		const copy = ctx.root.querySelector<HTMLElement>('[data-prompt-copy]');
		const shatter = Array.from(ctx.root.querySelectorAll<HTMLElement>('[data-shatter-chip]'));
		const ids = Array.from(ctx.root.querySelectorAll<HTMLElement>('[data-chip-id]'));
		const callout = ctx.root.querySelector<HTMLElement>('[data-space-callout]');
		const shatterRow = ctx.root.querySelector<HTMLElement>('[data-shatter-row]');
		const edge = Array.from(ctx.root.querySelectorAll<HTMLElement>('[data-edge-card]'));
		const lab = ctx.root.querySelector<HTMLElement>('[data-token-lab]');
		const progress = ctx.root.querySelector<HTMLElement>('[data-plateau-progress]');
		const output = ctx.root.querySelector<HTMLElement>('[data-output-chips]');

		if (panel) timeline.from(panel, { autoAlpha: 0, y: 24, duration: DUR.beat, ease: EASE.out });
		if (copy && shatter.length) {
			timeline.set(shatter, { autoAlpha: 0, scale: 0.92, y: 4 });
			timeline.set(ids, { autoAlpha: 0, rotationX: -90, transformOrigin: 'center bottom' });
			timeline.to({}, { duration: DUR.beat });
			timeline.to(copy, { autoAlpha: 0, duration: DUR.micro, ease: EASE.out });
			timeline.to(shatter, { autoAlpha: 1, scale: 1, y: 0, duration: DUR.beat, stagger: STAGGER.tight, ease: EASE.out });
			// The zero gap makes the pieces read as one surface before they separate.
			if (shatterRow) timeline.to(shatterRow, { columnGap: '0.45rem', duration: DUR.beat, ease: EASE.out });
		}
		if (callout) timeline.from(callout, { autoAlpha: 0, y: 10, duration: DUR.beat, ease: EASE.out });
		if (edge.length) {
			timeline.from(edge, { autoAlpha: 0, y: 18, duration: DUR.beat, stagger: STAGGER.chip, ease: EASE.out });
		}
		if (lab) {
			timeline.from(lab, { autoAlpha: 0, y: 22, duration: DUR.beat, ease: EASE.out });
			if (progress) {
				timeline.set(progress, { scaleX: 0, transformOrigin: 'left center' });
				const plateauStart = timeline.duration();
				// Keep the lab interactive while this empty interval gives the reader time to try it.
				timeline.to({}, { duration: 3 });
				timeline.to(progress, { scaleX: 1, duration: 3, ease: EASE.draw }, plateauStart);
			}
		}
		if (output) {
			timeline.from(output, { autoAlpha: 0, y: 12, duration: DUR.beat, ease: EASE.out });
			timeline.to(output, { autoAlpha: 0, duration: DUR.settle, ease: EASE.out });
		}
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
			applyStatic: (ctx) => {
				requestMeasure = ctx.requestMeasure;
			},
		});
	});
</script>

<div class="scene" bind:this={root}>
	<StationHead number={2} title="Tokenization" accent="history" />

	<DiagramPanel label="Station outline" caption="Before a model can work with a message, text becomes a row of numbered pieces.">
		<div class="intro" data-diagram-panel>
			<strong>Text is chopped into pieces, then looked up by number.</strong>
			<p>
				A token may be a whole word, a word-piece, punctuation, or a space attached to what follows. The IDs are addresses in a lookup table; they do not carry meaning by themselves.
			</p>
		</div>
	</DiagramPanel>

	<section class="beat shatter-beat" aria-labelledby="shatter-title">
		<div class="beat-heading">
			<p class="eyebrow">01 / Split the prompt</p>
			<h2 id="shatter-title">One sentence becomes several lookup pieces</h2>
		</div>
		<div class="prompt-copy" data-prompt-copy aria-label={PROMPT}>{PROMPT}</div>
		<div class="chip-row shatter-row" data-shatter-row aria-label="Illustrative tokens from the prompt">
			{#each promptTokens as token, index (`${token.id}-${index}`)}
				<span class="token-chip" data-shatter-chip>
					<span class="token-text">{display(token.text)}</span>
					<span class="token-id" data-chip-id>{token.id}</span>
				</span>
			{/each}
		</div>
		<p class="callout" data-space-callout><strong>Notice the middle dot.</strong> The space belongs to the token that follows it.</p>
	</section>

	<section class="beat edge-beat" aria-labelledby="edge-title">
		<div class="beat-heading">
			<p class="eyebrow">02 / Where the edges show</p>
			<h2 id="edge-title">Tokens are not a character counter</h2>
		</div>
		<div class="edge-grid">
			<article class="edge-card" data-edge-card>
				<h3><code>strawberry</code></h3>
				<div class="chip-row" aria-label="Strawberry tokenized into sub-word pieces">
					{#each strawberryTokens as token, index (`${token.id}-${index}`)}
						<span class="token-chip"><span class="token-text">{display(token.text)}</span><span class="token-id">{token.id}</span></span>
					{/each}
				</div>
				<p>Rare or unfamiliar words can be assembled from smaller, reusable pieces.</p>
			</article>
			<article class="edge-card" data-edge-card>
				<h3><code>12345</code></h3>
				<div class="chip-row" aria-label="Digits grouped into chunks">
					{#each digitTokens as token, index (`${token.id}-${index}`)}
						<span class="token-chip"><span class="token-text">{display(token.text)}</span><span class="token-id">{token.id}</span></span>
					{/each}
				</div>
				<p>Digits are commonly grouped into chunks rather than counted one by one.</p>
			</article>
		</div>
		<p class="edge-explainer">Counting letters misses the model's units: a long word can be a few tokens, while an unfamiliar spelling can take many.</p>
		<GoDeeper summary="why spaces stay attached" onreflow={() => requestMeasure()}>
			<p>Keeping a leading space with the next piece lets the same lookup table preserve word boundaries when pieces are joined again.</p>
		</GoDeeper>
	</section>

	<section class="beat lab-beat" data-token-lab aria-labelledby="token-lab-title">
		<TokenLab onreflow={() => requestMeasure()} />
		<div class="plateau" aria-live="polite">
			<p>Try a phrase, then keep scrolling when you are ready.</p>
			<div class="plateau-track" aria-hidden="true"><span data-plateau-progress></span></div>
		</div>
	</section>

	<section class="beat output-beat" aria-labelledby="output-title">
		<div class="beat-heading">
			<p class="eyebrow">03 / Hand off</p>
			<h2 id="output-title">The numbered row is ready for the next station</h2>
		</div>
		<p class="output-copy">These scene-owned chips line up at the dock. The traveling token stream is a separate object and will carry the handoff onward.</p>
	</section>

	<div class="ports" aria-label="Station ports">
		<div class="port" data-port="prompt-in" aria-hidden="true"><span>prompt in</span></div>
		<div class="port output-port" data-port="tokens-out" aria-hidden="true">
			<span>tokens out</span>
			<div class="chip-row output-chips" data-output-chips>
				{#each promptTokens as token, index (`output-${token.id}-${index}`)}
					<span class="token-chip"><span class="token-text">{display(token.text)}</span><span class="token-id">{token.id}</span></span>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.scene {
		position: relative;
		display: grid;
		gap: clamp(2rem, 6vh, 5rem);
		min-height: 100svh;
		padding: clamp(2rem, 7vh, 5rem) clamp(1rem, 6vw, 6rem);
		background: var(--c-paper);
		color: var(--c-ink);
	}

	.intro {
		max-width: 66ch;
		color: var(--c-ink-muted);
		font-size: clamp(1rem, 1.3vw, 1.15rem);
		line-height: 1.65;
	}

	.intro strong {
		display: block;
		margin-block-end: 0.5rem;
		color: var(--c-ink);
		font-size: 1.08em;
	}

	.intro p { margin: 0; }

	.beat {
		display: grid;
		gap: 1.25rem;
		width: min(100%, 58rem);
		margin-inline: auto;
	}

	.beat-heading { display: grid; gap: 0.35rem; }

	.eyebrow {
		margin: 0;
		color: var(--concept-history);
		font-family: var(--mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	h2 { margin: 0; font-size: clamp(1.5rem, 3.5vw, 2.35rem); line-height: 1.12; }
	h3 { margin: 0; font-size: 1rem; }

	.prompt-copy {
		padding: clamp(1.1rem, 3vw, 1.7rem);
		border: 1px solid var(--c-line-strong);
		border-radius: 0.65rem;
		background: var(--c-surface);
		font-family: var(--mono);
		font-size: clamp(1.2rem, 3vw, 1.8rem);
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.45rem;
	}

	.shatter-row { column-gap: 0; }

	.token-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 2rem;
		padding: 0.36rem 0.5rem 0.36rem 0.6rem;
		border: 1px solid var(--concept-history);
		border-radius: 0.35rem;
		background: var(--concept-history-fill);
		font-family: var(--mono);
		font-size: 0.82rem;
		line-height: 1;
	}

	.token-text { white-space: pre; }

	.token-id {
		padding-inline-start: 0.4rem;
		border-inline-start: 1px solid color-mix(in oklch, var(--concept-history) 45%, transparent);
		color: var(--c-ink-muted);
		font-size: 0.68rem;
	}

	.callout {
		max-width: 50ch;
		margin: 0;
		padding: 0.8rem 1rem;
		border-inline-start: 3px solid var(--concept-history);
		background: var(--concept-history-fill);
		color: var(--c-ink-muted);
		line-height: 1.5;
	}

	.callout strong { color: var(--c-ink); }

	.edge-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }

	.edge-card {
		display: grid;
		align-content: start;
		gap: 0.9rem;
		padding: 1rem;
		border: 1px solid var(--c-line);
		border-radius: 0.65rem;
		background: var(--c-surface);
	}

	.edge-card p, .edge-explainer, .output-copy { margin: 0; color: var(--c-ink-muted); line-height: 1.55; }
	.edge-explainer { max-width: 66ch; }
	.edge-card code { color: var(--c-ink); font-family: var(--mono); }

	.lab-beat { width: min(100%, 52rem); }

	.plateau {
		display: grid;
		gap: 0.65rem;
		color: var(--c-ink-muted);
		font-size: 0.85rem;
	}

	.plateau p { margin: 0; }
	.plateau-track { overflow: hidden; height: 0.3rem; border-radius: 99px; background: var(--c-line); }
	.plateau-track span { display: block; width: 100%; height: 100%; transform: scaleX(0); transform-origin: left center; background: var(--concept-history); }

	.ports {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		width: min(100%, 58rem);
		margin: 0 auto;
	}

	.port {
		display: grid;
		place-items: center;
		align-content: center;
		gap: 0.7rem;
		width: clamp(10rem, 20vw, 14rem);
		min-width: 10rem;
		min-height: 5rem;
		padding: 0.8rem;
		box-sizing: border-box;
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

	.output-port { min-width: min(100%, 24rem); }
	.output-chips { justify-content: center; width: 100%; }
	.output-chips .token-chip { font-size: 0.72rem; }

	@media (max-width: 40rem) {
		.edge-grid { grid-template-columns: 1fr; }
		.ports { gap: 0.65rem; }
		.port { min-width: 0; width: 50%; }
		.output-port { min-width: 50%; }
		.output-chips { display: none; }
	}
</style>
