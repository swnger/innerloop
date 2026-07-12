<script lang="ts">
	import DiagramPanel from '$lib/components/DiagramPanel.svelte';

	const CODE_LINES = [
		'while (true) {',
		'  msg = llm(context);',
		'  if (msg.tool) {',
		'    context += run(msg.tool);',
		'  } else {',
		'    break;',
		'  }',
		'}'
	];
</script>

<DiagramPanel
	label="One full turn"
	caption="The harness calls the model, checks whether it asked for a tool, runs that tool, and calls the model again."
>
	<div class="loop-layout">
		<svg
			class="loop-diagram"
			viewBox="0 0 680 360"
			role="img"
			aria-label="A loop connecting user, harness, model, and tool before returning to the harness."
		>
			<defs>
				<marker id="agent-loop-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--m-violet)" />
				</marker>
			</defs>
			<path class="flow flow--blue" data-flow d="M 112 166 C 175 95, 215 95, 278 145" pathLength="1" marker-end="url(#agent-loop-arrow)" />
			<path class="flow flow--violet" data-flow d="M 340 103 C 408 58, 485 72, 531 129" pathLength="1" marker-end="url(#agent-loop-arrow)" />
			<path class="flow flow--red" data-flow d="M 540 204 C 485 276, 402 292, 340 254" pathLength="1" marker-end="url(#agent-loop-arrow)" />
			<path class="flow flow--blue" data-flow d="M 274 241 C 210 292, 145 267, 102 209" pathLength="1" marker-end="url(#agent-loop-arrow)" />
			<g class="loop-node loop-node--user">
				<circle data-node="user" cx="84" cy="184" r="32" />
				<text x="84" y="180">user</text>
				<text x="84" y="197">request</text>
			</g>
			<g class="loop-node loop-node--harness">
				<circle data-node="harness" cx="310" cy="184" r="32" />
				<text x="310" y="180">harness</text>
				<text x="310" y="197">decides</text>
			</g>
			<g class="loop-node loop-node--model">
				<circle data-node="model" cx="585" cy="168" r="32" />
				<text x="585" y="164">model</text>
				<text x="585" y="181">predicts</text>
			</g>
			<g class="loop-node loop-node--tool">
				<circle data-node="tool" cx="310" cy="302" r="32" />
				<text x="310" y="298">tool</text>
				<text x="310" y="315">runs</text>
			</g>
		</svg>

		<div class="pseudocode" aria-label="Illustrative agent loop pseudocode">
			<p class="pseudocode__label">Illustrative routine</p>
			<code>
				{#each CODE_LINES as line, index}
					<span data-code-line={String(index + 1)}>{line}</span>
				{/each}
			</code>
			<p class="pseudocode__note">The loop is the harness around the model call.</p>
		</div>
	</div>
</DiagramPanel>

<style>
	.loop-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(10rem, 0.8fr);
		align-items: center;
		gap: 1rem;
	}

	.loop-diagram {
		display: block;
		width: 100%;
		height: auto;
		min-height: 18rem;
		overflow: visible;
	}

	.flow {
		fill: none;
		stroke-width: 4;
		stroke-linecap: round;
		stroke-dasharray: 1;
	}

	.flow--blue { stroke: var(--m-blue); }
	.flow--violet { stroke: var(--m-violet); }
	.flow--red { stroke: var(--m-red); }

	.loop-node circle { stroke-width: 2; }

	.loop-node text {
		fill: var(--c-ink);
		font-family: var(--display);
		font-size: 12px;
		font-weight: 600;
		text-anchor: middle;
	}

	.loop-node--user circle { fill: var(--concept-user-fill); stroke: var(--concept-user); }
	.loop-node--harness circle { fill: var(--concept-history-fill); stroke: var(--m-blue); }
	.loop-node--model circle { fill: var(--concept-response-fill); stroke: var(--concept-response); }
	.loop-node--tool circle { fill: var(--concept-tools-fill); stroke: var(--concept-tools); }

	.pseudocode {
		display: grid;
		gap: 0.65rem;
		padding: 1rem;
		border: 1px solid var(--c-line);
		border-radius: 0.5rem;
		background: var(--c-sunken);
	}

	.pseudocode__label {
		margin: 0;
		color: var(--c-ink-muted);
		font-size: 0.77rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.pseudocode code {
		display: grid;
		gap: 0.1rem;
		color: var(--c-ink);
		font: 0.79rem/1.55 var(--mono);
		white-space: pre;
	}

	.pseudocode code span {
		display: block;
		padding: 0.06rem 0.25rem;
		border-radius: 0.2rem;
	}

	.pseudocode__note {
		margin: 0;
		color: var(--c-ink-muted);
		font-size: 0.88rem;
		line-height: 1.5;
	}

	@media (max-width: 56rem) {
		.loop-layout { grid-template-columns: 1fr; }
		.loop-diagram { min-height: 0; }
	}
</style>
