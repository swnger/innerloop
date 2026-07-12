<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		summary: string;
		children: Snippet;
		onreflow?: () => void;
	}

	let { summary, children, onreflow }: Props = $props();
</script>

<details class="go-deeper" ontoggle={() => onreflow?.()}>
	<summary>
		<span>Go deeper — {summary}</span>
		<span class="go-deeper__chevron" aria-hidden="true">⌄</span>
	</summary>
	<div class="go-deeper__content">
		{@render children()}
	</div>
</details>

<style>
	.go-deeper {
		border-block: 1px solid var(--c-line);
		color: var(--c-ink);
	}

	.go-deeper summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-block: 0.9rem;
		cursor: pointer;
		color: var(--c-ink-muted);
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.4;
		list-style: none;
	}

	.go-deeper summary::-webkit-details-marker {
		display: none;
	}

	.go-deeper summary::marker {
		display: none;
		content: '';
	}

	.go-deeper summary:hover {
		color: var(--c-ink);
	}

	.go-deeper summary:focus-visible {
		outline: 2px solid var(--c-brand-strong);
		outline-offset: 3px;
	}

	.go-deeper__chevron {
		flex: 0 0 auto;
		color: var(--c-ink-muted);
		font-size: 1.2rem;
		line-height: 1;
		transform: rotate(0deg);
		transition: transform 0.2s ease;
	}

	.go-deeper[open] .go-deeper__chevron {
		transform: rotate(180deg);
	}

	.go-deeper__content {
		max-width: 66ch;
		padding-block: 0 1.2rem;
		color: var(--c-ink-muted);
		font-size: 0.95rem;
		line-height: 1.6;
	}

	@media (prefers-reduced-motion: reduce) {
		.go-deeper__chevron {
			transition: none;
		}
	}
</style>
