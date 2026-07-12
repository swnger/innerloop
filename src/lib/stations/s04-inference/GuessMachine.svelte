<script lang="ts">
	import GoDeeper from '$lib/components/GoDeeper.svelte';
	type Candidate = { token: string; probability: number };

	interface Props {
		onreflow?: () => void;
	}

	let { onreflow }: Props = $props();

	const rounds: Candidate[][] = [
		[
			{ token: ' fix', probability: 0.48 },
			{ token: ' test', probability: 0.24 },
			{ token: ' change', probability: 0.16 },
			{ token: ' patch', probability: 0.08 },
		],
		[
			{ token: ' is', probability: 0.52 },
			{ token: ' was', probability: 0.2 },
			{ token: ' still', probability: 0.16 },
			{ token: ' now', probability: 0.08 },
		],
		[
			{ token: ' ready', probability: 0.43 },
			{ token: ' green', probability: 0.28 },
			{ token: ' passing', probability: 0.2 },
			{ token: ' clean', probability: 0.06 },
		],
	];

	let draft = $state('The failing test');
	let round = $state(0);
	let chosen = $state<string | null>(null);
	let sampled = $state<Candidate[]>([]);
	let reroll = $state(0);
	let candidates = $state<Candidate[]>(rounds[0] ?? []);
	let rest = $state(0.04);

	function setRound(next: number) {
		round = next;
		candidates = rounds[next] ?? [];
		rest = Math.max(0, 1 - candidates.reduce((sum, item) => sum + item.probability, 0));
	}

	function append(candidate: Candidate) {
		draft += candidate.token;
		chosen = candidate.token;
		sampled = [];
		setRound((round + 1) % rounds.length);
		onreflow?.();
	}

	function rerollCandidates() {
		reroll += 1;
		const offset = reroll % candidates.length;
		sampled = [candidates[offset], candidates[(offset + 1) % candidates.length]];
		onreflow?.();
	}

	function reset() {
		draft = 'The failing test';
		chosen = null;
		sampled = [];
		reroll = 0;
		setRound(0);
		onreflow?.();
	}

</script>

<section class="machine" aria-labelledby="guess-machine-title">
	<header class="machine__head">
		<div>
			<p class="machine__label">interactive plateau</p>
			<h3 id="guess-machine-title">Guess Machine</h3>
		</div>
		<p class="machine__hint">score → sample → append → repeat</p>
	</header>

	<div class="machine__body">
		<div class="draft" aria-live="polite">
			<span class="draft__label">growing sequence</span>
			<p class="draft__line">{draft}<span class="draft__cursor" aria-hidden="true">▌</span></p>
			<p class="machine__note">These scores are a tiny, deterministic teaching table — not a real model vocabulary.</p>
		</div>

		<div class="distribution" aria-label="Illustrative next-token candidates">
			<div class="distribution__title">next-token scores</div>
			{#each candidates as candidate, index (candidate.token)}
				<button
					class="candidate"
					class:selected={chosen === candidate.token}
					type="button"
					onclick={() => append(candidate)}
				>
					<span class="candidate__token">{candidate.token}</span>
					<span class="candidate__track" aria-hidden="true"><span style={`width: ${candidate.probability * 100}%`}></span></span>
					<span class="candidate__value">{Math.round(candidate.probability * 100)}%</span>
					<span class="candidate__action">{index === 0 ? 'pick' : 'use'}</span>
				</button>
			{/each}
			<div class="candidate candidate--rest" aria-hidden="true">
				<span class="candidate__token">everything else</span>
				<span class="candidate__track"><span style={`width: ${rest * 100}%`}></span></span>
				<span class="candidate__value">{Math.round(rest * 100)}%</span>
			</div>
		</div>
	</div>

	<div class="machine__controls">
		<button class="machine__button" type="button" onclick={rerollCandidates}>re-roll alternatives</button>
		<button class="machine__button machine__button--quiet" type="button" onclick={reset}>reset sequence</button>
	</div>

	{#if sampled.length}
		<div class="sampled" aria-live="polite">
			<strong>sampled alternatives</strong>
			<span>One draw could have landed on</span>
			{#each sampled as candidate (candidate.token)}
				<span class="sampled__token">{candidate.token} · {Math.round(candidate.probability * 100)}%</span>
			{/each}
		</div>
	{/if}

	<div class="details">
		<GoDeeper summary="temperature" {onreflow}>
			<p>Temperature changes how much the draw spreads beyond the favorite. Lower settings stay close to the top score; higher settings make less likely tokens easier to sample. It changes the draw, not the model's stored knowledge.</p>
			<div class="temperature-sketch" aria-label="Low temperature is narrow; high temperature is wider">
				<div><span>low</span><i style="width: 78%"></i><i style="width: 18%"></i><i style="width: 7%"></i></div>
				<div><span>high</span><i style="width: 42%"></i><i style="width: 34%"></i><i style="width: 26%"></i></div>
			</div>
		</GoDeeper>
		<GoDeeper summary="attention" {onreflow}>
			<p>Attention is the model's way of weighting relationships among the tokens in the packet. It is not a spotlight that stores a thought; it is a calculation repeated at each layer while this one next-token score is produced.</p>
		</GoDeeper>
	</div>

	<p class="machine__disclaimer">Illustrative only — a real model scores a much larger vocabulary. Taking the top guess is one strategy; sampling can choose another.</p>
</section>


<style>
	.machine {
		position: relative;
		display: grid;
		gap: 1.2rem;
		padding: clamp(1rem, 3vw, 2rem);
		border: 1px solid var(--c-line-strong);
		border-radius: 0.75rem;
		background: var(--c-surface);
		box-shadow: var(--panel-shadow);
	}

	.machine__head,
	.machine__controls,
	.candidate,
	.sampled {
		display: flex;
		align-items: center;
	}

	.machine__head {
		justify-content: space-between;
		gap: 1rem;
		padding-block-end: 0.9rem;
		border-block-end: 1px solid var(--c-line);
	}

	.machine__label,
	.machine__hint,
	.machine__note,
	.distribution__title,
	.draft__label,
	.machine__disclaimer {
		font-family: var(--mono);
		font-size: 0.72rem;
		letter-spacing: 0.03em;
	}

	.machine__label {
		margin: 0 0 0.25rem;
		color: var(--concept-response);
		text-transform: lowercase;
	}

	h3 {
		margin: 0;
		font-size: clamp(1.35rem, 2.4vw, 1.8rem);
		line-height: 1.1;
	}

	.machine__hint {
		margin: 0;
		color: var(--c-ink-muted);
		text-align: right;
	}

	.machine__body {
		display: grid;
		grid-template-columns: minmax(12rem, 0.8fr) minmax(16rem, 1.2fr);
		gap: clamp(1rem, 3vw, 2.5rem);
	}

	.draft {
		padding: 1rem;
		border: 1px solid var(--c-line);
		border-radius: 0.5rem;
		background: var(--c-sunken);
	}

	.draft__label,
	.distribution__title {
		display: block;
		margin-block-end: 0.75rem;
		color: var(--c-ink-muted);
		text-transform: uppercase;
	}

	.draft__line {
		margin: 0;
		color: var(--c-ink);
		font-family: var(--mono);
		font-size: clamp(1rem, 1.8vw, 1.3rem);
		line-height: 1.6;
		text-wrap: pretty;
	}

	.draft__cursor {
		margin-inline-start: 0.15rem;
		color: var(--concept-response);
	}

	.machine__note {
		margin: 1rem 0 0;
		color: var(--c-ink-muted);
		line-height: 1.5;
	}

	.distribution {
		min-width: 0;
	}

	.candidate {
		width: 100%;
		gap: 0.65rem;
		min-height: 2.25rem;
		padding: 0.3rem 0.4rem;
		border: 0;
		border-block-end: 1px solid var(--c-line);
		background: transparent;
		color: var(--c-ink);
		font: inherit;
		text-align: left;
	}

	button.candidate {
		cursor: pointer;
	}

	button.candidate:hover,
	button.candidate:focus-visible,
	.candidate.selected {
		background: var(--concept-response-fill);
	}

	button:focus-visible {
		outline: 2px solid var(--c-brand-strong);
		outline-offset: 2px;
	}

	.candidate__token {
		width: 5rem;
		font-family: var(--mono);
		font-size: 0.82rem;
		white-space: pre;
	}

	.candidate__track {
		flex: 1;
		height: 0.5rem;
		overflow: hidden;
		border-radius: 999px;
		background: var(--c-sunken);
	}

	.candidate__track span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--concept-response);
	}

	.candidate__value,
	.candidate__action {
		font-family: var(--mono);
		font-size: 0.72rem;
	}

	.candidate__value {
		width: 2.5rem;
		color: var(--c-ink-muted);
		text-align: right;
	}

	.candidate__action {
		width: 2.5rem;
		color: var(--concept-response);
		text-align: right;
	}

	.candidate--rest {
		color: var(--c-ink-muted);
	}

	.candidate--rest .candidate__track span {
		background: var(--c-line-strong);
	}

	.machine__controls {
		flex-wrap: wrap;
		gap: 0.65rem;
	}

	.machine__button {
		padding: 0.55rem 0.8rem;
		border: 1px solid var(--c-line-strong);
		border-radius: 0.35rem;
		background: var(--c-paper);
		color: var(--c-ink);
		font: 500 0.78rem/1.2 var(--mono);
		cursor: pointer;
	}

	.machine__button:hover,
	.machine__button:focus-visible {
		border-color: var(--concept-response);
	}

	.machine__button--quiet {
		color: var(--c-ink-muted);
	}

	.sampled {
		flex-wrap: wrap;
		gap: 0.45rem 0.7rem;
		padding: 0.75rem 0.9rem;
		border: 1px dashed var(--concept-response);
		border-radius: 0.35rem;
		background: var(--concept-response-fill);
		font-size: 0.84rem;
	}

	.sampled strong {
		color: var(--c-ink);
	}

	.sampled > span:not(.sampled__token) {
		color: var(--c-ink-muted);
	}

	.sampled__token {
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		background: var(--c-paper);
		font-family: var(--mono);
		font-size: 0.78rem;
	}

	.details {
		display: grid;
		gap: 0;
	}

	.temperature-sketch {
		display: grid;
		gap: 0.55rem;
		margin-block-start: 0.8rem;
		font-family: var(--mono);
		font-size: 0.72rem;
	}

	.temperature-sketch > div {
		display: grid;
		grid-template-columns: 3rem repeat(3, minmax(2rem, 1fr));
		align-items: center;
		gap: 0.35rem;
	}

	.temperature-sketch i {
		display: block;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--concept-response);
	}

	.temperature-sketch i:nth-of-type(2) { opacity: 0.7; }
	.temperature-sketch i:nth-of-type(3) { opacity: 0.4; }

	.machine__disclaimer {
		margin: 0;
		color: var(--c-ink-muted);
		line-height: 1.5;
	}

	@media (max-width: 42rem) {
		.machine__head,
		.machine__body {
			grid-template-columns: 1fr;
		}

		.machine__head {
			display: grid;
		}

		.machine__hint {
			text-align: left;
		}
	}
</style>
