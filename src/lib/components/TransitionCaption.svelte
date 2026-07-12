<script lang="ts">
	import type { Direction } from '$lib/journey/types';

	interface Props {
		direction: Direction;
		caption: string;
	}

	const arrows: Record<Direction, string> = {
		right: '→',
		down: '↓',
		left: '←',
		up: '↑'
	};

	let { direction, caption }: Props = $props();
</script>

<div class="transition-caption">
	<span class="transition-caption__arrow" aria-hidden="true">{arrows[direction]}</span>
	<p>{caption}</p>
</div>

<style>
	.transition-caption {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		width: 100%;
		padding: 1.5rem var(--page-gutter);
		color: var(--c-ink-muted);
		text-align: center;
	}

	.transition-caption__arrow {
		flex: 0 0 auto;
		color: var(--c-ink-muted);
		font-size: 1.35rem;
		font-weight: 500;
		line-height: 1;
	}

	.transition-caption p {
		max-width: 62ch;
		font-size: 0.9rem;
		line-height: 1.5;
		text-wrap: pretty;
	}

	@media (max-width: 40rem) {
		.transition-caption {
			align-items: flex-start;
			padding-block: 1.25rem;
		}
	}
</style>
