<script lang="ts">
	let { text, id }: { text: string; id?: number } = $props();
</script>

<span class="token-chip" aria-label={id === undefined ? `Token ${text}` : `Token ${text}, id ${id}`}>
	<span class="token-text mono">{text}</span>
	{#if id !== undefined}
		<span class="token-id mono" aria-hidden="true">{id}</span>
	{/if}
</span>

<style>
	.token-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.42rem 0.3rem 0.5rem;
		border: 1px solid color-mix(in oklch, var(--concept-history) 45%, var(--c-line));
		border-radius: 0.38rem;
		background: var(--concept-history-fill);
		color: var(--concept-history);
		font-size: 0.75rem;
		line-height: 1;
		white-space: nowrap;
		box-shadow: 0 0.2rem 0.55rem color-mix(in oklch, var(--concept-history) 12%, transparent);
	}

	.token-text {
		font-weight: 650;
	}

	.token-id {
		padding: 0.16rem 0.24rem;
		border-radius: 0.2rem;
		background: var(--concept-history);
		color: var(--concept-history-fill);
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}
</style>
