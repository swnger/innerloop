<script lang="ts">
	import { onMount } from 'svelte';
	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import Legend from '$lib/components/Legend.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import { DUR, EASE, STAGGER } from '$lib/motion/tokens';
	import { manifest } from '$lib/journey/stations.manifest';
	import type { SceneProps, StationContext } from '$lib/journey/types';

	let { register }: SceneProps = $props();
	let root: HTMLDivElement;
	const station = manifest.find((entry) => entry.meta.id === 'context-window');

	const build = (ctx: StationContext) => {
		const timeline = ctx.gsap.timeline();
		const tank = ctx.root.querySelector<HTMLElement>('[data-tank]');
		const chips = Array.from(ctx.root.querySelectorAll<HTMLElement>('[data-chip]'));
		const strata = Array.from(ctx.root.querySelectorAll<HTMLElement>('[data-stratum]'));
		const fill = ctx.root.querySelector<HTMLElement>('[data-tank-fill]');
		const capacity = ctx.root.querySelector<HTMLElement>('[data-capacity]');
		const stateless = ctx.root.querySelector<HTMLElement>('[data-stateless]');
		const packet = ctx.root.querySelector<HTMLElement>('[data-packet]');

		if (tank) timeline.from(tank, { autoAlpha: 0, y: 18, duration: DUR.beat, ease: EASE.out });
		if (chips.length) {
			timeline.from(
				chips,
				{ autoAlpha: 0, y: -42, scale: 0.7, duration: DUR.micro, ease: EASE.out, stagger: STAGGER.chip },
				`>-=${DUR.beat * 0.45}`,
			);
		}
		if (strata.length) {
			timeline.set(strata, { autoAlpha: 0, y: 16 });
			timeline.to(strata, { autoAlpha: 1, y: 0, duration: DUR.beat, ease: EASE.out, stagger: STAGGER.tight });
		}
		if (fill) {
			timeline.set(fill, { scaleY: 0, transformOrigin: 'bottom center' });
			timeline.to(fill, { scaleY: 1, duration: DUR.settle, ease: EASE.draw });
		}
		if (capacity) {
			timeline.from(capacity, { autoAlpha: 0, y: 10, duration: DUR.beat, ease: EASE.out });
			timeline.to({}, { duration: DUR.beat * 0.7 });
		}
		if (stateless) {
			timeline.from(stateless, { autoAlpha: 0, y: 20, duration: DUR.settle, ease: EASE.out });
		}
		if (packet) {
			timeline.from(packet, { autoAlpha: 0, scale: 0.82, y: 12, duration: DUR.beat, ease: EASE.out });
			timeline.to({}, { duration: DUR.beat * 0.35 });
			timeline.to(packet, { autoAlpha: 0, duration: DUR.beat, ease: EASE.out });
		}
		return timeline;
	};

	onMount(() => {
		if (!station) throw new Error('Missing manifest entry for context-window');
		register({
			meta: station.meta,
			sceneEl: root,
			ports: {
				'tokens-in': () => root.querySelector('[data-port="tokens-in"]'),
				'context-out': () => root.querySelector('[data-port="context-out"]'),
			},
			build,
			applyStatic: () => {},
		});
	});
</script>

<div class="scene" bind:this={root}>
	<StationHead
		number={3}
		title="The context window"
		accent="history"
		kicker="A call carries a bounded packet of text. The model reads that packet on every call — and nothing else."
	/>

	<DiagramPanel
		label="A bounded packet"
		caption="Illustrative diagram: a context window is the text selected for one model call, not a memory that persists between calls."
	>
		<div class="window-layout">
			<div class="explain">
				<p class="lead">Everything the model can read arrives here first.</p>
				<p>
					Tokens pour into an empty window. The stack starts with the system instructions and tool definitions,
					then adds history from this task. More text means less room for what comes next.
				</p>
				<Legend
					items={[
						{ hue: 'system', label: 'system instructions' },
						{ hue: 'tools', label: 'tool definitions' },
						{ hue: 'history', label: 'conversation history' },
					]}
				/>
			</div>

			<div class="tank-wrap">
				<div class="tank-label"><span>one call</span><span>bounded capacity</span></div>
				<div class="tank" data-tank role="group" aria-label="Context strata rising toward a maximum capacity line.">
					<div class="tank__limit" aria-hidden="true"><span>limit</span></div>
					<div class="tank__fill" data-tank-fill aria-hidden="true"></div>
					<div class="strata" aria-label="Context strata">
						<div class="stratum stratum--system" data-stratum>
							<strong>system</strong><span>instructions that set the rules</span>
						</div>
						<div class="stratum stratum--tools" data-stratum>
							<strong>tool definitions</strong><span>the tools the model may call</span>
						</div>
						<div class="stratum stratum--history" data-stratum>
							<strong>history</strong><span>the selected conversation so far</span>
						</div>
					</div>
					<div class="chips" aria-hidden="true">
						{#each Array(14) as _, index}
							<span class="chip" data-chip style={`--chip-x: ${12 + ((index * 29) % 76)}%; --chip-y: ${12 + ((index * 17) % 62)}%;`}></span>
						{/each}
					</div>
				</div>
				<div class="capacity-note" data-capacity>
					<span class="capacity-note__rule" aria-hidden="true"></span>
					<p><strong>Capacity is a harness decision.</strong> Hitting the limit is not model behavior. An over-limit call can simply fail; trimming the oldest history is one common policy — someone chooses what to drop. Chapter 06 returns to that choice.</p>
				</div>
			</div>
		</div>

		<div class="stateless" data-stateless>
			<p class="stateless__eyebrow">The biggest misconception</p>
			<p class="stateless__line">Every call, the model reads all of this and nothing else.</p>
			<p class="stateless__support">It remembers nothing between calls. The next call gets a new packet.</p>
		</div>

	</DiagramPanel>

	<div class="ports" aria-label="Station ports">
		<div class="port" data-port="tokens-in" aria-hidden="true">
			<span class="port__label">tokens in</span>
			<div class="port__dock"><span class="port__dot"></span></div>
		</div>
		<div class="port" data-port="context-out" aria-hidden="true">
			<span class="port__label">context out</span>
			<div class="packet packet--dock" data-packet><span>context</span><i></i><i></i><i></i></div>
		</div>
	</div>
</div>

<style>
	.scene {
		position: relative;
		display: grid;
		place-content: center;
		gap: clamp(1.5rem, 4vh, 3rem);
		min-height: 100svh;
		padding: clamp(2rem, 7vh, 5rem) clamp(1rem, 6vw, 6rem);
		background: var(--c-paper);
		color: var(--c-ink);
	}

	.window-layout {
		display: grid;
		grid-template-columns: minmax(12rem, 0.82fr) minmax(18rem, 1fr);
		align-items: center;
		gap: clamp(2rem, 6vw, 6rem);
		min-height: min(57vh, 34rem);
	}

	.explain {
		display: grid;
		gap: 1rem;
		max-width: 31rem;
		color: var(--c-ink-muted);
		font-size: clamp(0.95rem, 1.2vw, 1.08rem);
		line-height: 1.6;
	}

	.explain p { margin: 0; }
	.explain .lead { color: var(--c-ink); font-family: var(--display); font-size: clamp(1.35rem, 2.4vw, 2rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.12; }

	.tank-wrap { display: grid; gap: 0.75rem; justify-items: stretch; }
	.tank-label { display: flex; justify-content: space-between; color: var(--c-ink-muted); font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.06em; text-transform: uppercase; }
	.tank { position: relative; isolation: isolate; width: min(100%, 25rem); height: clamp(20rem, 51vh, 31rem); margin-inline: auto; overflow: hidden; border: 2px solid var(--c-line-strong); border-radius: 1.4rem 1.4rem 2rem 2rem; background: var(--c-sunken); box-shadow: inset 0 0 0 0.45rem var(--c-surface); }
	.tank__fill { position: absolute; z-index: 1; inset: 17% 0 0; background: var(--concept-history-fill); opacity: 0.72; transform-origin: bottom center; }
	.tank__limit { position: absolute; z-index: 3; top: 17%; right: -0.15rem; left: -0.15rem; border-top: 2px dashed var(--concept-tool-output); color: var(--concept-tool-output); font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.05em; text-align: right; text-transform: uppercase; }
	.tank__limit span { position: relative; top: -1.3rem; right: 0.65rem; background: var(--c-sunken); padding-inline: 0.3rem; }
	.strata { position: absolute; z-index: 2; inset: 18% 0.9rem 0.9rem; display: flex; flex-direction: column-reverse; justify-content: flex-start; gap: 0.38rem; }
	.stratum { display: grid; flex: 1 1 0; gap: 0.15rem; min-height: 4.8rem; padding: 0.72rem 0.85rem; border-left: 0.28rem solid; border-radius: 0.3rem; color: var(--c-ink); }
	.stratum strong { font-size: 0.82rem; font-weight: 700; }
	.stratum span { color: var(--c-ink-muted); font-size: 0.73rem; line-height: 1.3; }
	.stratum--system { border-color: var(--concept-system); background: var(--concept-system-fill); }
	.stratum--tools { border-color: var(--concept-tools); background: var(--concept-tools-fill); }
	.stratum--history { border-color: var(--concept-history); background: var(--concept-history-fill); }
	.chips { position: absolute; z-index: 4; inset: 0; pointer-events: none; }
	.chip { position: absolute; top: var(--chip-y); left: var(--chip-x); width: 0.52rem; height: 0.52rem; border: 1px solid var(--concept-history); border-radius: 0.12rem; background: var(--concept-history-fill); }

	.capacity-note { display: grid; grid-template-columns: 0.28rem 1fr; gap: 0.7rem; align-items: start; max-width: 25rem; margin-inline: auto; color: var(--c-ink-muted); font-size: 0.86rem; line-height: 1.45; }
	.capacity-note p { margin: 0; }
	.capacity-note strong { color: var(--c-ink); }
	.capacity-note__rule { min-height: 100%; border-radius: 0.25rem; background: var(--concept-tool-output); }

	.stateless { display: grid; gap: 0.65rem; max-width: 48rem; margin: clamp(2rem, 7vh, 5rem) auto clamp(1rem, 4vh, 2.5rem); padding: clamp(1.5rem, 4vw, 3rem) 0; border-block: 1px solid var(--c-line-strong); }
	.stateless p { margin: 0; }
	.stateless__eyebrow { color: var(--concept-history); font-family: var(--mono); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
	.stateless__line { max-width: 23ch; color: var(--c-ink); font-family: var(--display); font-size: clamp(1.8rem, 4.5vw, 3.7rem); font-weight: 700; letter-spacing: -0.04em; line-height: 1.04; }
	.stateless__support { color: var(--c-ink-muted); font-size: 1rem; line-height: 1.5; }

	.packet { display: inline-flex; align-items: center; gap: 0.3rem; min-width: 8rem; min-height: 4.2rem; padding: 0.75rem; border: 2px solid var(--concept-history); border-radius: 0.8rem; background: var(--concept-history-fill); box-shadow: 0.35rem 0.35rem 0 var(--c-line); color: var(--c-ink); font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase; }
	.packet--dock { width: 7rem; min-width: 0; min-height: 3.2rem; padding: 0.5rem; }
	.packet span { margin-inline-end: auto; }
	.packet i { width: 0.45rem; height: 1.6rem; border-radius: 0.12rem; background: var(--concept-history); opacity: 0.68; }

	.ports { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: min(100%, 48rem); margin-block-start: clamp(1.5rem, 5vh, 3rem); }
	.port { position: relative; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 0.9rem; width: clamp(10rem, 20vw, 14rem); min-width: 10rem; height: clamp(5rem, 8vw, 7rem); padding: 0.8rem 0.9rem; border: 1px solid var(--c-line-strong); border-radius: 0.75rem; background: var(--c-surface); box-shadow: var(--panel-shadow); color: var(--c-ink-muted); font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; }
	.port__label { align-self: start; }
	.port__dock { display: grid; place-items: center; width: 2.7rem; height: 2.7rem; border: 1px dashed var(--concept-history); border-radius: 0.5rem; background: var(--concept-history-fill); }
	.port__dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--concept-history); }
	@media (max-width: 48rem) {
		.window-layout { grid-template-columns: 1fr; gap: 2rem; }
		.explain { max-width: 42rem; }
		.tank { height: min(29rem, 70vh); }
	}
	@media (max-width: 38rem) {
		.scene { padding-inline: 1rem; }
		.ports { gap: 0.65rem; }
		.port { min-width: 0; width: 50%; }
	}
</style>
