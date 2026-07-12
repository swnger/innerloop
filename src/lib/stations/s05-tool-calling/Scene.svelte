<script lang="ts">
	import { onMount } from 'svelte';

	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import Legend from '$lib/components/Legend.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import { DUR, EASE, STAGGER } from '$lib/motion/tokens';
	import { manifest } from '$lib/journey/stations.manifest';
	import type { SceneProps, StationHandle } from '$lib/journey/types';

	let { register }: SceneProps = $props();
	let root: HTMLElement;

	const station = manifest.find((entry) => entry.meta.id === 'tool-calling');
	if (!station) throw new Error('Missing manifest entry for tool-calling');
	const meta = station.meta;

	const codeLines = [
		'while (true) {',
		'  msg = llm(context);',
		'  if (msg.tool) {',
		'    context += run(msg.tool);',
		'  } else {',
		'    break;',
		'  }',
		'}',
	];


	onMount(() => {
		const handle: StationHandle = {
			meta,
			sceneEl: root,
			ports: {
				'response-in': () => root.querySelector('[data-port="response-in"]'),
				'context-out': () => root.querySelector('[data-port="context-out"]'),
				'response-out': () => root.querySelector('[data-port="response-out"]'),
			},
			build: (ctx) => {
				const timeline = ctx.gsap.timeline();
				const beats = Array.from(ctx.root.querySelectorAll<HTMLElement>('[data-beat]'));
				const branch = ctx.root.querySelector<HTMLElement>('[data-branch-pulse]');
				const tank = ctx.root.querySelector<HTMLElement>('[data-tank]');
				const tankFill = ctx.root.querySelector<HTMLElement>('[data-tank-fill]');
				const checkPaths = Array.from(ctx.root.querySelectorAll<SVGPathElement>('[data-check-path]'));
				const card = ctx.root.querySelector<HTMLElement>(
					'[data-port="response-in"] [data-traveler="response-card"]',
				);
				const toolFace = card?.querySelector<HTMLElement>('.tool-face');
				const answerFace = card?.querySelector<HTMLElement>('.answer-face');

				// SSR is the readable end state. These sets are the only wire-time hiding.
				beats.forEach((beat) => timeline.set(beat, { autoAlpha: 0, y: 22 }));
				if (branch) timeline.set(branch, { autoAlpha: 0, scaleX: 0.4, transformOrigin: 'left center' });
				if (tank) timeline.set(tank, { attr: { 'data-threshold': 'none' } });
				if (tankFill) timeline.set(tankFill, { scaleY: 0, transformOrigin: 'bottom' });
				if (checkPaths.length) {
					timeline.set(checkPaths, { attr: { strokeDashoffset: 1 } });
					timeline.to(checkPaths, {
						attr: { strokeDashoffset: 0 },
						duration: DUR.micro,
						ease: EASE.draw,
						stagger: STAGGER.tight,
					});
				}
				if (card) timeline.set(card, { attr: { 'data-face': 'tool' } }, 0);
				if (toolFace) {
					timeline.set(toolFace, { autoAlpha: 1, rotationX: 0, transformOrigin: '50% 50%' }, 0);
				}
				if (answerFace) {
					timeline.set(answerFace, { autoAlpha: 0, rotationX: -90, transformOrigin: '50% 50%' }, 0);
				}

				beats.forEach((beat, index) => {
					timeline.to(beat, { autoAlpha: 1, y: 0, duration: DUR.beat, ease: EASE.out }, index === 0 ? '>' : '+=0.2');
					if (index === 3 && tank && tankFill) timeline.addLabel('tank-fill-start');
					timeline.to({}, { duration: index === 1 ? 0.5 : 0.28 });
					if (index === 3 && tank && tankFill) {
						// The fill is 78% tall: the lower line is the first crossing,
						// then the upper line. Both semantic sets are reversible on scrub.
						const firstCrossing = (1 - 0.65) / 0.78;
						const secondCrossing = (1 - 0.35) / 0.78;
						timeline.to(tankFill, { scaleY: 1, duration: DUR.settle, ease: EASE.draw }, 'tank-fill-start');
						timeline.set(
							tank,
							{ attr: { 'data-threshold': 'one' } },
							`tank-fill-start+=${DUR.settle * firstCrossing}`,
						);
						timeline.set(
							tank,
							{ attr: { 'data-threshold': 'two' } },
							`tank-fill-start+=${DUR.settle * secondCrossing}`,
						);
					}
					if (index === 4 && branch) {
						timeline.to(branch, { autoAlpha: 1, scaleX: 1, duration: DUR.micro, ease: EASE.out }, '<');
						timeline.to(branch, { scaleX: 0.65, duration: DUR.micro, yoyo: true, repeat: 3, ease: EASE.draw }, '+=0.12');
					}
				});

				// Face turnover is owned by the scrubbed timeline. The semantic
				// attribute changes at the handoff, after both faces have crossed.
				const answerPoint = timeline.duration();
				const faceStart = Math.max(0, answerPoint - DUR.micro);
				if (toolFace) {
					timeline.to(toolFace, { autoAlpha: 0, rotationX: 90, duration: DUR.micro, ease: EASE.out }, faceStart);
				}
				if (answerFace) {
					timeline.to(answerFace, { autoAlpha: 1, rotationX: 0, duration: DUR.micro, ease: EASE.out }, faceStart);
				}
				if (card) timeline.set(card, { attr: { 'data-face': 'answer' } }, answerPoint);

				// Keep a little scrolling distance after the answer lands: the departure
				// copy and overstuffed tank are the hand-off to context engineering.
				timeline.to({}, { duration: 0.75 });
				return timeline;
			},
			applyStatic: (ctx) => {
				ctx.root.querySelectorAll<HTMLElement>('[data-beat]').forEach((beat) => {
					beat.style.opacity = '1';
					beat.style.visibility = 'visible';
					beat.style.transform = 'none';
				});
				const fill = ctx.root.querySelector<HTMLElement>('[data-tank-fill]');
				if (fill) fill.style.transform = 'scaleY(1)';
				const tank = ctx.root.querySelector<HTMLElement>('[data-tank]');
				if (tank) tank.setAttribute('data-threshold', 'two');
				const pulse = ctx.root.querySelector<HTMLElement>('[data-branch-pulse]');
				if (pulse) pulse.style.opacity = '1';
				const checkPaths = ctx.root.querySelectorAll<SVGPathElement>('[data-check-path]');
				checkPaths.forEach((path) => {
					path.style.strokeDasharray = '1';
					path.style.strokeDashoffset = '0';
				});
				const card = ctx.root.querySelector<HTMLElement>(
					'[data-port="response-in"] [data-traveler="response-card"]',
				);
				if (card) {
					card.setAttribute('data-face', 'answer');
					const toolFace = card.querySelector<HTMLElement>('.tool-face');
					const answerFace = card.querySelector<HTMLElement>('.answer-face');
					if (toolFace) {
						toolFace.style.transition = 'none';
						toolFace.style.opacity = '0';
						toolFace.style.transform = 'rotateX(90deg) rotateY(90deg)';
					}
					if (answerFace) {
						answerFace.style.transition = 'none';
						answerFace.style.opacity = '1';
						answerFace.style.transform = 'rotateX(0deg) rotateY(0deg)';
					}
				}
			},
		};

		register(handle);
	});
</script>

<section bind:this={root} class="scene">
	<StationHead number={meta.number} title={meta.title} accent={meta.accent} />

	<div class="intro" data-beat="arrival">
		<p class="eyebrow">THE INNER LOOP · A REQUEST, NOT A MAGIC SPELL</p>
		<h2>The model asks the harness to run a test.</h2>
		<p class="lede">
			The response card docks here and unfolds into a tool call. The model still only predicted tokens;
			the API gives those tokens a structured shape the harness can inspect.
		</p>
	</div>

	<div class="call-layout" data-beat="call" data-diagram-panel>
		<DiagramPanel label="MODEL OUTPUT · STRUCTURED ITEM" caption="Still model-generated tokens, now surfaced against a declared contract.">
			<div class="tool-call" aria-label="Tool call to run tests">
				<div class="call-heading"><span class="call-dot" aria-hidden="true"></span><span>tool call</span><strong>run_tests</strong></div>
				<pre>{`{\n  "name": "run_tests",\n  "arguments": {\n    "command": "pytest -q"\n  }\n}`}</pre>
			</div>
		</DiagramPanel>
		<aside class="schema-card" aria-label="Declared tool schema and validation">
			<div class="schema-label">DECLARED TOOL SCHEMA</div>
			<h3>run_tests</h3>
			<p>Runs the project's test command.</p>
			<ul class="checks">
				<li><svg class="check-mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path data-check-path pathLength="1" d="M3 8.5 6.5 12 13 4" /></svg> tool name matches</li>
				<li><svg class="check-mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path data-check-path pathLength="1" d="M3 8.5 6.5 12 13 4" /></svg> arguments are an object</li>
				<li><svg class="check-mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path data-check-path pathLength="1" d="M3 8.5 6.5 12 13 4" /></svg> command is required</li>
			</ul>
		</aside>
	</div>

	<div class="explain" data-beat="validation">
		<strong>Validation is the harness's job.</strong>
		<span>It checks the tool name and arguments against the schema instead of scraping a paragraph for instructions.</span>
	</div>

	<div class="execution-grid" data-beat="execute">
		<DiagramPanel label="HARNESS EXECUTES" caption="The model never gets a shell, files, or network access.">
			<div class="terminal" aria-label="Test command output">
				<div class="terminal-top"><span class="terminal-light" aria-hidden="true"></span><span>harness / test runner</span></div>
				<pre><span class="prompt">$</span> pytest -q
<span class="muted">collecting ...</span>
<span class="pass">3 passed</span> <span class="muted">in 0.42s</span></pre>
			</div>
		</DiagramPanel>
		<div class="boundary-note"><span class="boundary-rule" aria-hidden="true"></span><span>This is the boundary: code here runs on your machine.</span></div>
	</div>

	<div class="append-grid" data-beat="append">
		<DiagramPanel label="OBSERVATION · TOOL OUTPUT" caption="The result is text again, appended before the next model call.">
			<div class="tool-output"><span class="output-label">tool output</span><code>3 passed in 0.42s</code></div>
		</DiagramPanel>
		<div class="mini-tank" aria-label="Context tank grows with tool output">
			<div class="tank-head"><strong>next context</strong><span>window grows</span></div>
			<div class="tank" data-tank data-threshold="two" aria-hidden="true"><div class="tank-fill" data-tank-fill></div><span class="tank-line tank-line--one"></span><span class="tank-line tank-line--two"></span></div>
			<p>Tool output joins the history the model must read.</p>
		</div>
	</div>

	<div class="loop-grid" data-beat="loop">
		<DiagramPanel label="THE SAME INNER LOOP" caption="Two abbreviated cycles: observe → act → observe. The tool branch is now concrete.">
			<div class="pseudocode" aria-label="Agent loop pseudocode">
				{#each codeLines as line, index}
					<div class:branch-line={index === 2 || index === 3} class="code-line"><span class="line-number">{String(index + 1).padStart(2, '0')}</span><code>{line}</code>{#if index === 2}<span class="branch-pulse" data-branch-pulse aria-hidden="true"></span>{/if}</div>
				{/each}
			</div>
		</DiagramPanel>
		<div class="cycle-notes" aria-label="Two loop cycles">
			<div><span>01</span><strong>call</strong><small>run_tests</small></div>
			<div><span>02</span><strong>append</strong><small>3 passed</small></div>
			<div><span>03</span><strong>call again</strong><small>check the result</small></div>
		</div>
	</div>

	<div class="answer-grid" data-beat="answer">
		<DiagramPanel label="EXIT CONDITION" caption="No tool call means the harness stops looping and returns the answer.">
			<div class="answer-copy"><span class="answer-arrow" aria-hidden="true">→</span><div><strong>No tool call.</strong><p>“The test passes now — the bug was a missing null check.”</p></div></div>
		</DiagramPanel>
		<div class="answer-state"><span class="state-label">response card</span><strong>answer</strong><span>ochre face · ready to return</span></div>
	</div>

	<div class="departure" data-beat="departure">
		<div>
			<p class="eyebrow">DEPARTURE · CONTEXT-OUT</p>
			<h2>Every loop made the window fatter.</h2>
			<p>That overstuffed packet leaves for the next station. Someone has to decide what is worth keeping.</p>
		</div>
		<div class="departure-tank" aria-label="Overstuffed context packet">
			<div class="departure-tank__fill"></div><span>tool result</span><span>history</span><span>tool definition</span>
		</div>
	</div>

	<Legend items={[{ hue: 'tools', label: 'tool call · violet' }, { hue: 'tool-output', label: 'tool output · red' }, { hue: 'response', label: 'answer · ochre' }]} />

	<div class="ports" aria-label="Station ports">
		<div class="port" data-port="response-in" aria-hidden="true"><span>response in</span></div>
		<div class="port" data-port="context-out" aria-hidden="true"><span>context out</span></div>
		<div class="port" data-port="response-out" aria-hidden="true"><span>response out</span></div>
	</div>
</section>

<style>
	.scene {
		position: relative;
		display: grid;
		align-content: center;
		gap: clamp(1rem, 2.4vh, 2rem);
		min-height: 100svh;
		width: 100%;
		padding: clamp(2rem, 6vh, 4.5rem) var(--page-gutter) clamp(3rem, 8vh, 6rem);
		background: var(--c-paper);
		color: var(--c-ink);
	}

	.intro,
	.departure { max-width: 64rem; }
	.eyebrow,
	.schema-label,
	.state-label {
		margin: 0 0 0.45rem;
		color: var(--c-ink-muted);
		font-family: var(--mono);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	h2 { max-width: 22ch; margin: 0; font-size: clamp(1.7rem, 3.4vw, 3.1rem); line-height: 1.05; letter-spacing: -0.02em; }
	.intro h2 { color: var(--concept-tools); }
	.lede,
	.departure p:not(.eyebrow) { max-width: 62ch; margin: 0.75rem 0 0; color: var(--c-ink-muted); font-size: clamp(1rem, 1.2vw, 1.15rem); line-height: 1.6; }
	.call-layout,
	.execution-grid,
	.append-grid,
	.loop-grid,
	.answer-grid { display: grid; align-items: stretch; gap: clamp(1rem, 2vw, 2rem); max-width: 64rem; }
	.call-layout { grid-template-columns: minmax(0, 1.35fr) minmax(14rem, 0.65fr); }
	.execution-grid,
	.append-grid,
	.loop-grid,
	.answer-grid { grid-template-columns: minmax(0, 1.2fr) minmax(12rem, 0.8fr); }
	.call-layout :global(.diagram-panel),
	.execution-grid :global(.diagram-panel),
	.append-grid :global(.diagram-panel),
	.loop-grid :global(.diagram-panel),
	.answer-grid :global(.diagram-panel) { height: 100%; }
	.tool-call pre,
	.terminal pre,
	.pseudocode code,
	.tool-output code { margin: 0; font-family: var(--mono); font-size: clamp(0.74rem, 1.1vw, 0.9rem); line-height: 1.65; white-space: pre-wrap; }
	.call-heading { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem; color: var(--concept-tools); font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; }
	.call-heading strong { margin-left: auto; color: var(--c-ink); font-size: 1rem; letter-spacing: 0; text-transform: none; }
	.call-dot { width: 0.62rem; height: 0.62rem; border-radius: 50%; background: var(--concept-tools); }
	.tool-call pre { padding: 1rem; border: 1px solid var(--concept-tools); border-radius: 0.5rem; background: var(--concept-tools-fill); color: var(--c-ink); }
	.schema-card { padding: 1.2rem; border: 1px solid var(--concept-tools); border-radius: 0.75rem; background: var(--concept-tools-fill); }
	.schema-card h3 { margin: 0; font-family: var(--mono); font-size: 1.1rem; }
	.schema-card p { margin: 0.5rem 0 1rem; color: var(--c-ink-muted); font-size: 0.9rem; line-height: 1.45; }
	.checks { display: grid; gap: 0.55rem; margin: 0; padding: 0; list-style: none; color: var(--c-ink); font-size: 0.82rem; }
	.check-mark { display: inline-block; width: 1.2rem; height: 1.2rem; margin-inline-end: 0.35rem; vertical-align: -0.28rem; overflow: visible; }
	.check-mark path { fill: none; stroke: var(--concept-tools); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 0; }
	.explain { display: flex; flex-wrap: wrap; gap: 0.35rem 0.6rem; max-width: 64rem; padding: 0.8rem 1rem; border-inline-start: 3px solid var(--concept-tools); background: var(--c-sunken); color: var(--c-ink-muted); line-height: 1.5; }
	.explain strong { color: var(--c-ink); }
	.terminal { overflow: hidden; border: 1px solid var(--c-line-strong); border-radius: 0.55rem; background: var(--c-sunken); }
	.terminal-top { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.75rem; border-bottom: 1px solid var(--c-line); color: var(--c-ink-muted); font-family: var(--mono); font-size: 0.68rem; }
	.terminal-light { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--concept-tool-output); }
	.terminal pre { padding: 1rem; color: var(--c-ink); }
	.prompt, .pass { color: var(--concept-tool-output); font-weight: 700; }
	.muted { color: var(--c-ink-muted); }
	.boundary-note { display: flex; align-items: center; gap: 0.8rem; align-self: center; color: var(--c-ink-muted); font-size: 0.9rem; line-height: 1.5; }
	.boundary-rule { width: 2rem; height: 2px; background: var(--concept-tool-output); }
	.tool-output { display: grid; gap: 0.75rem; }
	.output-label { width: fit-content; padding: 0.28rem 0.5rem; border: 1px solid var(--concept-tool-output); border-radius: 0.25rem; background: var(--concept-tool-output-fill); color: var(--concept-tool-output); font-family: var(--mono); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
	.tool-output code { display: block; padding: 0.9rem; border-radius: 0.45rem; background: var(--concept-tool-output-fill); color: var(--c-ink); }
	.mini-tank { display: grid; align-content: start; gap: 0.65rem; padding: 1rem; border: 1px solid var(--c-line-strong); border-radius: 0.75rem; background: var(--c-surface); }
	.tank-head { display: flex; justify-content: space-between; gap: 0.8rem; font-size: 0.8rem; }
	.tank-head span { color: var(--concept-history); font-family: var(--mono); font-size: 0.68rem; text-transform: uppercase; }
	.tank { position: relative; overflow: hidden; height: 8rem; border: 1px solid var(--concept-history); border-radius: 0.45rem; background: var(--c-sunken); }
	.tank-fill { position: absolute; inset: auto 0 0; height: 78%; background: linear-gradient(to top, var(--concept-history-fill), var(--concept-tool-output-fill)); }
	:global(.tank[data-threshold='none']) { border-color: var(--concept-history); }
	:global(.tank[data-threshold='one']) { border-color: var(--concept-tools); }
	.tank[data-threshold='two'] { border-color: var(--concept-tool-output); }
	.tank-line { position: absolute; inset-inline: 0.5rem; border-top: 1px dashed var(--c-line-strong); }
	:global(.tank[data-threshold='one']) .tank-line--two { border-color: var(--concept-tools); }
	.tank[data-threshold='two'] .tank-line--one,
	.tank[data-threshold='two'] .tank-line--two { border-color: var(--concept-tool-output); }
	.tank-line--one { top: 35%; }
	.tank-line--two { top: 65%; }
	.mini-tank p { margin: 0; color: var(--c-ink-muted); font-size: 0.82rem; line-height: 1.45; }
	.pseudocode { display: grid; gap: 0.18rem; padding: 0.15rem 0; }
	.code-line { position: relative; display: grid; grid-template-columns: 2rem 1fr; gap: 0.7rem; align-items: baseline; padding: 0.13rem 0.35rem; border-radius: 0.22rem; }
	.code-line.branch-line { background: var(--concept-tools-fill); }
	.line-number { color: var(--c-ink-muted); font-family: var(--mono); font-size: 0.68rem; user-select: none; }
	.branch-line code { color: var(--concept-tools); }
	.branch-pulse { position: absolute; left: -0.9rem; width: 0.45rem; height: 0.45rem; border-radius: 50%; background: var(--concept-tools); }
	.cycle-notes { display: grid; align-content: center; gap: 0.65rem; }
	.cycle-notes div { display: grid; grid-template-columns: 2rem 1fr; column-gap: 0.55rem; padding: 0.7rem; border-inline-start: 2px solid var(--concept-history); background: var(--c-sunken); }
	.cycle-notes span { grid-row: span 2; color: var(--concept-history); font-family: var(--mono); font-size: 0.72rem; font-weight: 700; }
	.cycle-notes strong { font-size: 0.88rem; }
	.cycle-notes small { color: var(--c-ink-muted); font-size: 0.78rem; }
	.answer-copy { display: flex; align-items: flex-start; gap: 1rem; }
	.answer-arrow { color: var(--concept-response); font-size: 1.8rem; line-height: 1; }
	.answer-copy strong { font-size: 1.2rem; }
	.answer-copy p { margin: 0.4rem 0 0; color: var(--c-ink-muted); line-height: 1.5; }
	.answer-state { display: grid; align-content: center; justify-items: start; gap: 0.35rem; padding: 1.1rem; border: 1px solid var(--concept-response); border-radius: 0.75rem; background: var(--concept-response-fill); }
	.answer-state strong { color: var(--concept-response); font-size: 1.45rem; }
	.answer-state > span:last-child { color: var(--c-ink-muted); font-size: 0.8rem; }
	.departure { display: grid; grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.55fr); align-items: center; gap: 2rem; padding: 1.25rem; border: 1px solid var(--concept-history); border-radius: 0.75rem; background: var(--concept-history-fill); }
	.departure h2 { font-size: clamp(1.4rem, 2.8vw, 2.4rem); }
	.departure-tank { display: grid; gap: 0.3rem; padding: 0.75rem; border: 1px solid var(--concept-tool-output); border-radius: 0.5rem; background: var(--c-surface); color: var(--c-ink-muted); font-family: var(--mono); font-size: 0.68rem; }
	.departure-tank__fill { height: 0.45rem; margin-bottom: 0.25rem; border-radius: 99px; background: var(--concept-tool-output); }
	.ports { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; max-width: 64rem; padding-block-start: 0.5rem; }
	.port { display: grid; width: clamp(9rem, 18vw, 13rem); height: 5.25rem; place-items: center; border: 1px solid var(--concept-tools); border-radius: 0.65rem; background: var(--concept-tools-fill); color: var(--concept-tools); font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.05em; text-transform: uppercase; }
	.port[data-port="context-out"] { border-color: var(--concept-history); background: var(--concept-history-fill); color: var(--concept-history); }
	.port[data-port="response-out"] { border-color: var(--concept-response); background: var(--concept-response-fill); color: var(--concept-response); }
	:global(.journey[data-journey='enhanced'] .response-face) { transition: none; }
	@media (max-width: 48rem) {
		.call-layout, .execution-grid, .append-grid, .loop-grid, .answer-grid, .departure { grid-template-columns: 1fr; }
		.ports { justify-content: flex-start; }
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.response-face) { transition: none; }
		.scene { gap: 1.15rem; }
		.branch-pulse { opacity: 1; }
	}
:global(.journey[data-journey='enhanced']) .scene {
	display: block;
	height: 100svh;
	min-height: 100svh;
	overflow: hidden;
	padding-block: clamp(1.5rem, 5vh, 3.5rem);
}

:global(.journey[data-journey='enhanced']) .scene > [data-beat] {
	position: absolute;
	top: 25%;
	right: var(--page-gutter);
	left: var(--page-gutter);
	max-height: 62%;
}

:global(.journey[data-journey='enhanced']) .scene > .intro {
	top: 27%;
}

:global(.journey[data-journey='enhanced']) .scene > .departure {
	top: 29%;
}

:global(.journey[data-journey='enhanced']) .scene > :global(.legend) {
	position: absolute;
	right: var(--page-gutter);
	bottom: 13%;
	left: var(--page-gutter);
}

:global(.journey[data-journey='enhanced']) .scene > .ports {
	position: absolute;
	right: var(--page-gutter);
	bottom: 3%;
	left: var(--page-gutter);
}
</style>
