<script lang="ts">
	import { onMount } from 'svelte';
	import { tokenize, display } from '$lib/tokenizer';

	interface Props {
		onreflow?: () => void;
	}

	let { onreflow }: Props = $props();
	let input = $state("How many r's are in strawberry?");
	const tokens = $derived(tokenize(input));
	let outputEl: HTMLDivElement;

	onMount(() => {
		if (typeof ResizeObserver === 'undefined' || !outputEl) return;
		const observer = new ResizeObserver(() => onreflow?.());
		observer.observe(outputEl);
		return () => observer.disconnect();
	});
</script>

<section class="token-lab" aria-labelledby="token-lab-title">
	<div class="lab-heading">
		<div>
			<p class="eyebrow">Try it yourself</p>
			<h3 id="token-lab-title">Token Lab</h3>
		</div>
		<p class="lab-note">Illustrative — not a real model's vocabulary</p>
	</div>

	<label for="token-lab-input">Type a phrase</label>
	<textarea
		id="token-lab-input"
		bind:value={input}
		rows="2"
		aria-describedby="token-lab-help"
	></textarea>
	<p id="token-lab-help" class="help">Spaces are part of the pieces you see below.</p>

	<div class="result" bind:this={outputEl} aria-live="polite">
		<div class="result-meta">
			<strong>{tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}</strong>
			<span>each piece gets a lookup ID</span>
		</div>
		<div class="chip-row" aria-label="Illustrative token output">
			{#each tokens as token, index (`${token.id}-${index}`)}
				<span class="token-chip" title={`Illustrative ID ${token.id}`}>
					<span class="token-text">{display(token.text)}</span>
					<span class="token-id">{token.id}</span>
				</span>
			{/each}
		</div>
	</div>
</section>

<style>
	.token-lab {
		display: grid;
		gap: 0.85rem;
		padding: clamp(1rem, 3vw, 1.5rem);
		border: 1px solid var(--c-line-strong);
		border-radius: 0.75rem;
		background: var(--c-surface);
		color: var(--c-ink);
	}

	.lab-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	.eyebrow {
		margin: 0 0 0.3rem;
		color: var(--concept-history);
		font-family: var(--mono);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	h3 {
		margin: 0;
		font-size: clamp(1.2rem, 2.5vw, 1.5rem);
		line-height: 1.1;
	}

	.lab-note {
		max-width: 27ch;
		margin: 0;
		color: var(--c-ink-muted);
		font-size: 0.8rem;
		line-height: 1.4;
		text-align: right;
	}

	label {
		color: var(--c-ink-muted);
		font-size: 0.85rem;
		font-weight: 600;
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
		padding: 0.7rem 0.8rem;
		border: 1px solid var(--c-line-strong);
		border-radius: 0.45rem;
		background: var(--c-paper);
		color: var(--c-ink);
		font: inherit;
		line-height: 1.45;
	}

	textarea:focus-visible {
		outline: 2px solid var(--brand-strong);
		outline-offset: 2px;
	}

	.help {
		margin: -0.35rem 0 0;
		color: var(--c-ink-muted);
		font-size: 0.8rem;
	}

	.result {
		display: grid;
		gap: 0.7rem;
		padding-block-start: 0.85rem;
		border-block-start: 1px solid var(--c-line);
	}

	.result-meta {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		color: var(--c-ink-muted);
		font-size: 0.8rem;
	}

	.result-meta strong {
		color: var(--c-ink);
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.45rem;
	}

	.token-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 2rem;
		padding: 0.35rem 0.5rem 0.35rem 0.6rem;
		border: 1px solid var(--concept-history);
		border-radius: 0.35rem;
		background: var(--concept-history-fill);
		font-family: var(--mono);
		font-size: 0.82rem;
		line-height: 1;
		transition: transform 0.18s ease, box-shadow 0.18s ease;
	}

	.token-chip:hover {
		transform: translateY(-2px);
		box-shadow: 0 0.25rem 0.8rem color-mix(in oklch, var(--concept-history) 16%, transparent);
	}

	.token-text {
		white-space: pre;
	}

	.token-id {
		padding-inline-start: 0.4rem;
		border-inline-start: 1px solid color-mix(in oklch, var(--concept-history) 45%, transparent);
		color: var(--c-ink-muted);
		font-size: 0.68rem;
	}

	@media (max-width: 40rem) {
		.lab-heading {
			flex-direction: column;
		}

		.lab-note {
			max-width: none;
			text-align: left;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.token-chip {
			transition: none;
		}
	}
</style>
