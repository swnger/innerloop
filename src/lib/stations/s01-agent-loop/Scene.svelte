<script lang="ts">
	import { onMount } from 'svelte';
	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import LoopDiagram from './LoopDiagram.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import { DUR, EASE, STAGGER } from '$lib/motion/tokens';
	import { manifest } from '$lib/journey/stations.manifest';
	import type { SceneProps, StationContext, StationHandle } from '$lib/journey/types';

	let { register }: SceneProps = $props();
	let root: HTMLElement;

	const meta = manifest.find((entry) => entry.meta.id === 'agent-loop')!.meta;
	const PROMPT = 'Fix the failing test';

	function build(ctx: StationContext) {
		const q = <T extends Element>(selector: string): T[] =>
			Array.from(ctx.root.querySelectorAll<T>(selector));
		const timeline = ctx.gsap.timeline();
		const chat = ctx.root.querySelector<HTMLElement>('[data-chat-panel]');
		const loopStage = ctx.root.querySelector<HTMLElement>('[data-loop-stage]');
		const promptChars = q<HTMLElement>('[data-prompt-char]');
		const paths = q<SVGPathElement>('[data-flow]');
		const lines = q<HTMLElement>('[data-code-line]');

		// SSR is the finished article. Full-motion only masks the prompt before
		// replaying it, so a no-JS reader always sees the complete request.
		timeline.set(promptChars, { autoAlpha: 0 });
		promptChars.forEach((char, index) => {
			timeline.to(
				char,
				{ autoAlpha: 1, duration: DUR.micro, ease: EASE.out },
				index * STAGGER.tight
			);
		});
		timeline.to({}, { duration: DUR.settle });

		if (chat) {
			timeline.to(chat, {
				scale: 0.76,
				xPercent: -10,
				yPercent: -2,
				transformOrigin: '50% 50%',
				duration: DUR.settle,
				ease: EASE.out
			});
		}
		if (loopStage) {
			timeline.fromTo(
				loopStage,
				{ autoAlpha: 0, y: 18 },
				{ autoAlpha: 1, y: 0, duration: DUR.beat, ease: EASE.out }
			);
		}

		timeline.set(paths, { attr: { strokeDashoffset: 1 } });
		timeline.to(paths, {
			attr: { strokeDashoffset: 0 },
			duration: DUR.beat,
			ease: EASE.draw,
			stagger: STAGGER.tight
		});
		timeline.set(lines, { opacity: 0.42, backgroundColor: 'transparent' });

		const beats = [
			{ node: 'user', line: '1', fill: 'concept-user-fill' },
			{ node: 'harness', line: '2', fill: 'concept-history-fill' },
			{ node: 'model', line: '2', fill: 'concept-history-fill' },
			{ node: 'tool', line: '3', fill: 'concept-tools-fill' },
			{ node: 'harness', line: '4', fill: 'concept-tool-output-fill' },
			{ node: 'model', line: '5', fill: 'concept-response-fill' },
			{ node: 'harness', line: '6', fill: 'concept-tool-output-fill' }
		];
		for (const beat of beats) {
			const node = ctx.root.querySelector<SVGCircleElement>(`[data-node="${beat.node}"]`);
			const line = ctx.root.querySelector<HTMLElement>(`[data-code-line="${beat.line}"]`);
			if (node) {
				timeline.to(node, { attr: { r: 39 }, duration: DUR.micro, ease: EASE.out });
			}
			if (line) {
				timeline.to(
					line,
					{
						opacity: 1,
						backgroundColor: ctx.color(beat.fill),
						duration: DUR.micro,
						ease: EASE.out
					},
					'<0.1'
				);
			}
			timeline.to({}, { duration: DUR.settle });
			if (node) timeline.to(node, { attr: { r: 32 }, duration: DUR.micro, ease: EASE.out });
			if (line) {
				timeline.to(line, {
					opacity: 0.42,
					backgroundColor: 'transparent',
					duration: DUR.micro,
					ease: EASE.out
				});
			}
		}

		timeline.addLabel('loop-map-birth');
		// Birth of the persistent LoopMap: the station diagram leaves the stage
		// by shrinking toward the same top-right corner.
		if (loopStage) {
			timeline.to(loopStage, {
				scale: 0.34,
				xPercent: 32,
				yPercent: -42,
				transformOrigin: '100% 0%',
				autoAlpha: 0,
				duration: DUR.settle,
				ease: EASE.out
			});
		}
		return timeline;
	}

	onMount(() => {
		const handle: StationHandle = {
			meta,
			sceneEl: root,
			ports: {
				'prompt-out': () => root.querySelector('[data-port="prompt-out"]'),
				'answer-in': () => root.querySelector('[data-port="answer-in"]'),
				'loop-diagram': () => root.querySelector('[data-loop-stage]')
			},
			build,
			applyStatic: () => {}
		};
		register(handle);
	});
</script>

<section bind:this={root} class="scene">
	<StationHead
		number={meta.number}
		title={meta.title}
		accent={meta.accent}
		kicker="Start with one ordinary request. The agent loop is the surrounding routine that keeps a model call useful."
	/>

	<div class="chapter-grid">
		<DiagramPanel
			label="Cold open · a request"
			caption="The words are ordinary. What matters is the loop around the model that decides what happens next."
		>
			<article class="chat-panel" data-chat-panel aria-label="Chat request">
				<div class="chat-panel__bar">
					<span class="chat-panel__dot" aria-hidden="true"></span>
					<span>coding assistant</span>
					<span class="chat-panel__status">ready</span>
				</div>
				<div class="chat-panel__body">
					<p class="chat-panel__label">You</p>
					<div class="prompt-input" role="textbox" aria-label={PROMPT}>
						<input value={PROMPT} readonly tabindex="-1" aria-hidden="true" />
						<span class="prompt-input__text" aria-hidden="true">
							{#each PROMPT.split('') as char}
								<span data-prompt-char>{char}</span>
							{/each}
						</span>
						<span class="prompt-input__caret" aria-hidden="true"></span>
					</div>
					<p class="chat-panel__hint">A person asks. The harness carries the request onward.</p>
				</div>
				<div class="chat-panel__ports" aria-label="Chat handoff ports">
					<div class="port port--out" data-port="prompt-out" aria-hidden="true">
						<span>prompt out</span>
					</div>
					<div class="port port--in" data-port="answer-in" aria-hidden="true">
						<span>answer in</span>
					</div>
				</div>
			</article>
		</DiagramPanel>

		<div class="loop-column" data-loop-stage>
			<LoopDiagram />
		</div>
	</div>

	<p class="station-summary">
		<strong>One request, many moving parts.</strong>
		The model predicts a next step; the harness supplies context, runs tools, and decides whether to ask again or return an answer.
	</p>
</section>

<style>
	.scene {
		position: relative;
		display: flex;
		width: 100%;
		min-height: 100svh;
		flex-direction: column;
		gap: clamp(1.5rem, 4vh, 3rem);
		padding: clamp(2rem, 7vh, 5rem) var(--page-gutter);
		background: var(--c-paper);
		color: var(--c-ink);
	}

	.chapter-grid {
		display: grid;
		grid-template-columns: minmax(17rem, 0.75fr) minmax(0, 1.25fr);
		align-items: start;
		gap: clamp(1rem, 3vw, 3rem);
		width: min(100%, 76rem);
		margin-inline: auto;
	}

	.chat-panel {
		position: relative;
		min-height: 20rem;
		overflow: visible;
		border: 1px solid var(--c-line-strong);
		border-radius: 0.75rem;
		background: var(--c-paper);
		box-shadow: var(--panel-shadow);
	}

	.chat-panel__bar {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.75rem 1rem;
		border-block-end: 1px solid var(--c-line);
		color: var(--c-ink-muted);
		font: 600 0.78rem/1 var(--display);
	}

	.chat-panel__dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: var(--concept-user);
	}

	.chat-panel__status {
		margin-inline-start: auto;
		color: var(--concept-user);
		font-family: var(--mono);
		font-size: 0.68rem;
	}

	.chat-panel__body {
		display: grid;
		gap: 0.6rem;
		padding: 1.35rem 1.25rem 4.5rem;
	}

	.chat-panel__label {
		margin: 0;
		color: var(--c-ink-muted);
		font-size: 0.77rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
 

	.prompt-input {
		position: relative;
		display: flex;
		align-items: center;
		min-height: 3.2rem;
		padding: 0.7rem 0.85rem;
		border: 1px solid var(--concept-user);
		border-radius: 0.5rem;
		background: var(--concept-user-fill);
		color: var(--c-ink);
		font: 500 1.05rem/1.3 var(--display);
	}

	.prompt-input input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		pointer-events: none;
	}

	.prompt-input__text {
		white-space: pre;
	}

	.prompt-input__caret {
		width: 1px;
		height: 1.2em;
		margin-inline-start: 0.15rem;
		background: var(--concept-user);
	}

	.chat-panel__hint {
		margin: 0;
		color: var(--c-ink-muted);
		font-size: 0.88rem;
		line-height: 1.5;
	}

	.chat-panel__ports {
		position: absolute;
		inset: auto 1rem 1rem;
		display: flex;
		justify-content: space-between;
		gap: 0.7rem;
	}

	.port {
		position: relative;
		display: grid;
		width: 8.5rem;
		min-width: 7rem;
		height: 3.6rem;
		place-items: center;
		border: 1px dashed var(--c-line-strong);
		border-radius: 0.5rem;
		background: var(--c-surface);
		color: var(--c-ink-muted);
		font: 500 0.65rem/1 var(--mono);
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.port > span {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		white-space: nowrap;
	}

	.port--out {
		border-color: var(--concept-user);
		background: var(--concept-user-fill);
	}

	.port--in {
		border-color: var(--concept-response);
		background: var(--concept-response-fill);
	}

	.loop-column {
		min-width: 0;
	}


	.station-summary {
		max-width: 68ch;
		margin: 0 auto;
		color: var(--c-ink-muted);
		font-size: 1.03rem;
		line-height: 1.65;
		text-wrap: pretty;
	}

	.station-summary strong {
		color: var(--c-ink);
	}

	@media (max-width: 56rem) {
		.chapter-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 38rem) {
		.scene {
			padding-inline: 1rem;
		}

		.chat-panel__ports {
			position: static;
			padding: 0 1rem 1rem;
		}

		.chat-panel__body {
			padding-block-end: 1.5rem;
		}

		.port {
			width: 50%;
			min-width: 0;
		}
	}
</style>
