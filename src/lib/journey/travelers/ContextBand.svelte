<div class="context-band" data-traveler="context-band" aria-label="Context window packet">
	<div class="strata" aria-hidden="true">
		<span class="stratum system"></span>
		<span class="stratum tools"></span>
		<span class="stratum history"></span>
		<span class="stratum history"></span>
		<span class="stratum history"></span>
	</div>
	<div class="band-meta">
		<span class="band-label mono">CONTEXT</span>
		<span class="capacity" aria-label="Context capacity 72 percent">
			<span class="capacity-track"><span class="capacity-fill"></span></span>
			<span class="capacity-value mono">72%</span>
		</span>
	</div>
</div>

<style>
	.context-band {
		display: grid;
		gap: 0.48rem;
		width: min(18rem, 84vw);
		padding: 0.7rem 0.8rem 0.65rem;
		border: 1px solid var(--c-line-strong);
		border-radius: 0.58rem;
		background: var(--c-surface);
		box-shadow: 0 0.45rem 1rem color-mix(in oklch, var(--c-ink) 12%, transparent);
	}

	.strata {
		display: grid;
		grid-template-columns: 1.1fr 0.75fr 2fr 1.25fr 0.8fr;
		gap: 0.18rem;
		height: 1.8rem;
		align-items: stretch;
	}

	.stratum {
		border-radius: 0.16rem;
	}

	.system {
		background: var(--concept-system-fill);
		border: 1px solid color-mix(in oklch, var(--concept-system) 48%, var(--c-line));
	}

	.tools {
		background: var(--concept-tools-fill);
		border: 1px solid color-mix(in oklch, var(--concept-tools) 48%, var(--c-line));
	}

	.history {
		background: var(--concept-history-fill);
		border: 1px solid color-mix(in oklch, var(--concept-history) 42%, var(--c-line));
	}

	.band-meta,
	.capacity {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.55rem;
	}

	.band-label {
		color: var(--c-ink-muted);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.11em;
	}

	.capacity {
		min-width: 7rem;
		color: var(--concept-history);
		font-size: 0.62rem;
		font-weight: 700;
	}

	.capacity-track {
		overflow: hidden;
		width: 4.5rem;
		height: 0.28rem;
		border-radius: 999px;
		background: var(--c-sunken);
	}

	.capacity-fill {
		display: block;
		width: 72%;
		height: 100%;
		border-radius: inherit;
		background: var(--concept-history);
	}
</style>
