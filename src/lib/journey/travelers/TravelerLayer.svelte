<script lang="ts">
	import { tokenize, display } from '$lib/tokenizer';
	import PromptCard from './PromptCard.svelte';
	import TokenChip from './TokenChip.svelte';
	import ContextBand from './ContextBand.svelte';
	import ResponseCard from './ResponseCard.svelte';

	let { el = $bindable() }: { el?: HTMLElement } = $props();

	const promptTokens = tokenize('Fix the failing test');
</script>

<div class="traveler-layer" bind:this={el}>
	<PromptCard />
	<div class="token-stream" data-traveler="token-stream" aria-label="Prompt tokens">
		{#each promptTokens as token, index (`${token.id}-${index}`)}
			<TokenChip text={display(token.text)} id={token.id} />
		{/each}
	</div>
	<ContextBand />
	<ResponseCard />
</div>

<style>
	.traveler-layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.traveler-layer > :global([data-traveler]) {
		will-change: transform;
	}

	.token-stream {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
		max-width: min(24rem, 90vw);
	}
</style>
