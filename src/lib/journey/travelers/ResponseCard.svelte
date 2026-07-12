<script lang="ts">
	interface Props {
		/** Which face shows at rest; transitions flip it via the data attribute. */
		face?: 'tool' | 'answer';
	}
	let { face = 'tool' }: Props = $props();
</script>

<div class="response-card" data-traveler="response-card" data-face={face} aria-label="Model response">
	<div class="response-face tool-face" aria-hidden="true">
		<span class="face-kicker mono">TOOL CALL</span>
		<strong>run_tests</strong>
		<span class="face-detail mono">&#123; suite: 'unit' &#125;</span>
	</div>
	<div class="response-face answer-face">
		<span class="answer-glow" aria-hidden="true"></span>
		<span class="face-kicker mono">ANSWER</span>
		<strong>Tests pass.</strong>
		<span class="face-detail mono">result: ready</span>
	</div>
</div>

<style>
	.response-card {
		position: relative;
		width: min(15rem, 78vw);
		min-height: 5.8rem;
		perspective: 700px;
	}

	.response-face {
		display: grid;
		align-content: center;
		gap: 0.3rem;
		position: absolute;
		inset: 0;
		padding: 0.82rem 0.95rem;
		border: 1px solid;
		border-radius: 0.7rem 0.7rem 0.18rem 0.7rem;
		box-shadow: 0 0.45rem 1.05rem color-mix(in oklch, var(--c-ink) 13%, transparent);
		backface-visibility: hidden;
		transition:
			opacity 0.24s ease,
			transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
		transform-style: preserve-3d;
	}

	.tool-face {
		border-color: color-mix(in oklch, var(--concept-tools) 50%, var(--c-line));
		background: var(--concept-tools-fill);
		color: var(--concept-tools);
		transform: rotateX(0deg);
	}

	.answer-face {
		border-color: color-mix(in oklch, var(--concept-response) 50%, var(--c-line));
		background: var(--concept-response-fill);
		color: var(--concept-response);
		opacity: 0;
		transform: rotateX(-90deg);
	}

	.response-card[data-face='answer'] .tool-face {
		opacity: 0;
		transform: rotateX(90deg);
	}

	.response-card[data-face='answer'] .answer-face {
		opacity: 1;
		transform: rotateX(0deg);
	}

	.answer-glow {
		position: absolute;
		top: 0.65rem;
		right: 0.65rem;
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 50%;
		background: var(--concept-response);
		box-shadow: 0 0 0 transparent;
		opacity: 0.72;
	}

	:global(.journey[data-journey='enhanced']) .response-face {
		transition: none;
	}

	.face-kicker {
		font-size: 0.58rem;
		font-weight: 750;
		letter-spacing: 0.12em;
	}

	.response-face strong {
		font: 700 1.05rem/1.1 var(--display);
		letter-spacing: -0.025em;
	}

	.face-detail {
		font-size: 0.66rem;
		opacity: 0.8;
	}

	@media (prefers-reduced-motion: reduce) {
		.response-face {
			transition: none;
		}
	}
</style>
