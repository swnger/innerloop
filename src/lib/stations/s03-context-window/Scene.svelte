<script lang="ts">
	import { onMount } from 'svelte';
	import DiagramPanel from '$lib/components/DiagramPanel.svelte';
	import Legend from '$lib/components/Legend.svelte';
	import StationHead from '$lib/components/StationHead.svelte';
	import { DUR, EASE, STAGGER } from '$lib/motion/tokens';
	import { manifest } from '$lib/journey/stations.manifest';
	import type { ConceptHue, SceneProps, StationContext } from '$lib/journey/types';

	let { register }: SceneProps = $props();
	let root: HTMLDivElement;
	const station = manifest.find((entry) => entry.meta.id === 'context-window');

	const chipHash = (index: number) => Math.imul(index, 2654435761) >>> 0;
	const chipJitter = (index: number) => 0.85 + 0.3 * ((chipHash(index) % 1000) / 1000);

	/**
	 * The tank maps tokens to height: BUDGET tokens span the strata box, so the
	 * limit line is a real quantity, not a decoration. Counts are illustrative.
	 */
	const BUDGET = 8000;
	const fmt = (n: number) =>
		n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);

	type BandGroup = 'base' | 'turn1' | 'turn2' | 'attempt';
	type Band = { key: string; label: string; tok: number; hue: ConceptHue; group: BandGroup };

	// Bottom → top. Base strata arrive with the packet; turn bands are what the
	// loop appends; the "attempt" turn is the one that breaches the budget.
	const BANDS: Band[] = [
		{ key: 'system', label: 'system prompt', tok: 600, hue: 'system', group: 'base' },
		{ key: 'tools', label: 'tool definitions', tok: 1500, hue: 'tools', group: 'base' },
		{ key: 'history', label: 'conversation history', tok: 900, hue: 'history', group: 'base' },
		{ key: 'user', label: 'user input', tok: 500, hue: 'user', group: 'base' },
		{ key: 'tool1', label: 'tool output', tok: 1100, hue: 'tool-output', group: 'turn1' },
		{ key: 'reply1', label: 'model reply', tok: 450, hue: 'response', group: 'turn1' },
		{ key: 'tool2', label: 'tool output', tok: 1250, hue: 'tool-output', group: 'turn2' },
		{ key: 'reply2', label: 'model reply', tok: 450, hue: 'response', group: 'turn2' },
		{ key: 'tool3', label: 'tool output', tok: 1300, hue: 'tool-output', group: 'attempt' },
		{ key: 'reply3', label: 'model reply', tok: 450, hue: 'response', group: 'attempt' }
	];

	const layout = (() => {
		let acc = 0;
		return BANDS.map((band) => {
			const bottom = (acc / BUDGET) * 100;
			acc += band.tok;
			return { ...band, bottom, height: (band.tok / BUDGET) * 100 };
		});
	})();

	const tokensThrough = (groups: BandGroup[]) =>
		BANDS.filter((band) => groups.includes(band.group)).reduce((sum, band) => sum + band.tok, 0);
	const USED_BASE = tokensThrough(['base']);
	const USED_TURN1 = tokensThrough(['base', 'turn1']);
	const USED_TURN2 = tokensThrough(['base', 'turn1', 'turn2']);
	const ATTEMPTED = tokensThrough(['base', 'turn1', 'turn2', 'attempt']);
	const EVICTED = BANDS.find((band) => band.key === 'history')?.tok ?? 0;
	const SETTLED = ATTEMPTED - EVICTED;
	const EVICT_PCT = (EVICTED / BUDGET) * 100;
	const fillScale = (used: number) => Math.min(1, used / BUDGET);

	// Narration under the tank; enhancement-only (the capacity note carries the
	// same story in prose for static readers).
	const NOTES = [
		'each turn appends a tool result and a model reply',
		`attempted ${fmt(ATTEMPTED)} / ${fmt(BUDGET)} — over budget`,
		`oldest history evicted · ${fmt(SETTLED)} remains`
	];

	const build = (ctx: StationContext) => {
		const timeline = ctx.gsap.timeline();
		const q = (selector: string) => ctx.root.querySelector<HTMLElement>(selector);
		const tank = q('[data-tank]');
		const chips = Array.from(ctx.root.querySelectorAll<HTMLElement>('[data-chip]'));
		const tankContents = q('[data-tank-contents]');
		const fill = q('[data-fill]');
		const limit = q('[data-limit]');
		const gaugeEl = q('[data-gauge]');
		const capacity = q('[data-capacity]');
		const stateless = q('[data-stateless]');
		const underline = q('[data-stateless-underline]');
		const packet = q('[data-packet]');
		const explain = q('.explain');
		const notes = NOTES.map((_, index) => q(`[data-note="${index}"]`));
		const bandEl = (key: string) => q(`[data-band="${key}"]`);
		const baseBands = layout
			.filter((band) => band.group === 'base')
			.map((band) => bandEl(band.key))
			.filter((el): el is HTMLElement => Boolean(el));
		const historyBand = bandEl('history');
		const historyBottom = layout.find((band) => band.key === 'history')?.bottom ?? 0;
		const survivors = layout.filter((band) => band.bottom > historyBottom);

		const warm = ctx.color('concept-tool-output');
		const inkMuted = ctx.color('c-ink-muted');

		// Rest state: assert every property this timeline ever touches at t0.
		// Stylesheet defaults cannot recover once GSAP leaves an inline value
		// behind (e.g. after the orchestrator's invalidate/replay), so the
		// timeline itself must own the pristine state of its whole cast.
		for (const band of layout) {
			const el = bandEl(band.key);
			if (!el) continue;
			const entrance =
				band.group === 'base' ? { y: 12, x: 0 } : { y: 0, x: band.hue === 'tool-output' ? -44 : 44 };
			timeline.set(el, { autoAlpha: 0, bottom: `${band.bottom}%`, ...entrance }, 0);
		}
		if (chips.length) timeline.set(chips, { autoAlpha: 0, y: -42, scale: 0.7 }, 0);
		if (tankContents) timeline.set(tankContents, { scaleY: 1, transformOrigin: 'bottom center' }, 0);
		if (fill) timeline.set(fill, { scaleY: 0, transformOrigin: 'bottom center' }, 0);
		if (limit) timeline.set(limit, { borderTopColor: inkMuted, color: inkMuted }, 0);
		if (gaugeEl) timeline.set(gaugeEl, { color: inkMuted }, 0);
		for (const note of notes) if (note) timeline.set(note, { autoAlpha: 0, y: 6 }, 0);
		if (explain) timeline.set(explain, { autoAlpha: 1, y: 0 }, 0);
		if (capacity) timeline.set(capacity, { autoAlpha: 0, y: 10 }, 0);
		if (stateless) timeline.set(stateless, { autoAlpha: 0, y: 20 }, 0);
		if (underline) timeline.set(underline, { scaleX: 0, transformOrigin: 'left center' }, 0);
		if (packet) timeline.set(packet, { autoAlpha: 0, scale: 0.82, y: 12 }, 0);

		const gauge = { v: 0 };
		const writeGauge = () => {
			if (gaugeEl) gaugeEl.textContent = `${fmt(Math.round(gauge.v))} / ${fmt(BUDGET)} tokens`;
		};
		// Every value tween is fromTo with explicit ends so master.invalidate()
		// cannot corrupt it; chained tweens on one target skip immediateRender
		// so construction only paints each element's true initial state.
		const gaugeRun = (from: number, to: number, at: number, duration: number = DUR.settle) =>
			timeline.fromTo(
				gauge,
				{ v: from },
				{ v: to, duration, ease: EASE.draw, onUpdate: writeGauge, immediateRender: from === 0 },
				at
			);
		const fillRun = (from: number, to: number, at: number, duration: number = DUR.settle) => {
			if (!fill) return;
			timeline.fromTo(
				fill,
				{ scaleY: from, transformOrigin: 'bottom center' },
				{ scaleY: to, duration, ease: EASE.draw, immediateRender: from === 0 },
				at
			);
		};
		const impulse = () => {
			if (!tankContents) return;
			timeline.to(tankContents, { scaleY: 0.985, duration: DUR.micro * 0.5, ease: EASE.out });
			timeline.to(tankContents, { scaleY: 1, duration: DUR.micro * 0.5, ease: EASE.out });
		};
		const noteSwap = (hide: number, show: number) => {
			const out = notes[hide];
			const enter = notes[show];
			if (out) {
				timeline.fromTo(
					out,
					{ autoAlpha: 1, y: 0 },
					{ autoAlpha: 0, y: -6, duration: DUR.micro, ease: EASE.out, immediateRender: false }
				);
			}
			if (enter) {
				timeline.fromTo(
					enter,
					{ autoAlpha: 0, y: 6 },
					{ autoAlpha: 1, y: 0, duration: DUR.micro, ease: EASE.out },
					'<0.05'
				);
			}
		};
		const landTurn = (toolKey: string, replyKey: string) => {
			const tool = bandEl(toolKey);
			const reply = bandEl(replyKey);
			const at = timeline.duration();
			if (tool) {
				timeline.fromTo(
					tool,
					{ autoAlpha: 0, x: -44 },
					{ autoAlpha: 1, x: 0, duration: DUR.beat, ease: EASE.out },
					at
				);
			}
			if (reply) {
				timeline.fromTo(
					reply,
					{ autoAlpha: 0, x: 44 },
					{ autoAlpha: 1, x: 0, duration: DUR.beat, ease: EASE.out },
					at + DUR.beat * 0.45
				);
			}
			return at;
		};

		// 0 · gauge starts empty the moment the station is on stage
		gaugeRun(0, 0, 0, 0.001);

		// 1 · the vessel arrives
		if (tank) {
			timeline.fromTo(
				tank,
				{ autoAlpha: 0, y: 18 },
				{ autoAlpha: 1, y: 0, duration: DUR.beat, ease: EASE.out }
			);
		}

		// 2 · raw tokens rain in
		if (chips.length) {
			// Hash-ranked drops keep the rain irregular without breaking scrub determinism.
			const chipOrder = chips
				.map((element, order) => ({ element, index: Number(element.dataset.chipIndex ?? order) }))
				.sort((a, b) => chipHash(a.index) - chipHash(b.index) || a.index - b.index);
			const chipStart = timeline.duration() - DUR.beat * 0.45;
			chipOrder.forEach(({ element, index }, order) => {
				timeline.fromTo(
					element,
					{ autoAlpha: 0, y: -42, scale: 0.7 },
					{ autoAlpha: 1, y: 0, scale: 1, duration: DUR.micro * chipJitter(index), ease: EASE.out },
					chipStart + order * STAGGER.chip
				);
			});
		}

		// 3 · the packet settles into strata; the rain dissolves into the layers
		const baseAt = timeline.duration() + DUR.micro;
		if (baseBands.length) {
			timeline.fromTo(
				baseBands,
				{ autoAlpha: 0, y: 12 },
				{ autoAlpha: 1, y: 0, duration: DUR.beat, stagger: 0.14, ease: EASE.out },
				baseAt
			);
		}
		if (chips.length) {
			timeline.fromTo(
				chips,
				{ autoAlpha: 1 },
				{ autoAlpha: 0, duration: DUR.beat, stagger: STAGGER.tight, ease: EASE.out, immediateRender: false },
				baseAt + 0.1
			);
		}
		fillRun(0, fillScale(USED_BASE), baseAt);
		gaugeRun(0, USED_BASE, baseAt);
		timeline.to({}, { duration: DUR.micro }, baseAt + DUR.beat + 0.14 * 3);
		impulse();
		if (notes[0]) {
			timeline.fromTo(
				notes[0],
				{ autoAlpha: 0, y: 6 },
				{ autoAlpha: 1, y: 0, duration: DUR.micro, ease: EASE.out }
			);
		}

		// 4 · the loop keeps adding: two turns land on top
		const turn1At = landTurn('tool1', 'reply1');
		fillRun(fillScale(USED_BASE), fillScale(USED_TURN1), turn1At, DUR.beat * 1.2);
		gaugeRun(USED_BASE, USED_TURN1, turn1At, DUR.beat * 1.2);
		impulse();

		const turn2At = landTurn('tool2', 'reply2');
		fillRun(fillScale(USED_TURN1), fillScale(USED_TURN2), turn2At, DUR.beat * 1.2);
		gaugeRun(USED_TURN1, USED_TURN2, turn2At, DUR.beat * 1.2);
		impulse();
		timeline.to({}, { duration: DUR.beat * 0.5 });

		// 5 · one turn too many: the stack breaches the budget
		noteSwap(0, 1);
		const breachAt = landTurn('tool3', 'reply3');
		fillRun(fillScale(USED_TURN2), 1, breachAt, DUR.beat * 1.2);
		gaugeRun(USED_TURN2, ATTEMPTED, breachAt, DUR.beat * 1.2);
		if (limit) {
			timeline.fromTo(
				limit,
				{ borderTopColor: inkMuted, color: inkMuted },
				{ borderTopColor: warm, color: warm, duration: DUR.beat, ease: EASE.out },
				breachAt + DUR.beat * 0.4
			);
		}
		if (gaugeEl) {
			timeline.fromTo(
				gaugeEl,
				{ color: inkMuted },
				{ color: warm, duration: DUR.beat, ease: EASE.out },
				breachAt + DUR.beat * 0.4
			);
		}
		impulse();
		timeline.to({}, { duration: DUR.beat * 0.6 });

		// 6 · the harness makes room: the oldest layer falls out the bottom
		const evictAt = timeline.duration();
		if (historyBand) {
			timeline.fromTo(
				historyBand,
				{ y: 0, autoAlpha: 1 },
				{ y: 200, autoAlpha: 0, duration: DUR.settle, ease: 'power2.in', immediateRender: false },
				evictAt
			);
		}
		for (const [index, band] of survivors.entries()) {
			const el = bandEl(band.key);
			if (!el) continue;
			timeline.fromTo(
				el,
				{ bottom: `${band.bottom}%` },
				{
					bottom: `${band.bottom - EVICT_PCT}%`,
					duration: DUR.settle,
					ease: EASE.travel,
					immediateRender: false
				},
				evictAt + 0.25 + index * 0.03
			);
		}
		fillRun(1, fillScale(SETTLED), evictAt + 0.25);
		gaugeRun(ATTEMPTED, SETTLED, evictAt + 0.25);
		if (limit) {
			timeline.fromTo(
				limit,
				{ borderTopColor: warm, color: warm },
				{ borderTopColor: inkMuted, color: inkMuted, duration: DUR.beat, ease: EASE.out, immediateRender: false },
				evictAt + 0.45
			);
		}
		if (gaugeEl) {
			timeline.fromTo(
				gaugeEl,
				{ color: warm },
				{ color: inkMuted, duration: DUR.beat, ease: EASE.out, immediateRender: false },
				evictAt + 0.45
			);
		}
		noteSwap(1, 2);
		impulse();
		timeline.to({}, { duration: DUR.beat * 0.4 });

		// 7 · payoff prose, then the chapter's claim and the outgoing packet
		if (capacity) {
			timeline.fromTo(
				capacity,
				{ autoAlpha: 0, y: 10 },
				{ autoAlpha: 1, y: 0, duration: DUR.beat, ease: EASE.out }
			);
			timeline.to({}, { duration: DUR.beat * 0.7 });
		}
		if (explain) {
			timeline.fromTo(
				explain,
				{ autoAlpha: 1, y: 0 },
				{ autoAlpha: 0, y: -12, duration: DUR.micro, ease: EASE.out, immediateRender: false }
			);
		}
		if (stateless) {
			timeline.fromTo(
				stateless,
				{ autoAlpha: 0, y: 20 },
				{ autoAlpha: 1, y: 0, duration: DUR.settle, ease: EASE.out }
			);
		}
		if (underline) {
			timeline.fromTo(
				underline,
				{ scaleX: 0 },
				{ scaleX: 1, duration: DUR.settle, ease: EASE.draw, immediateRender: false }
			);
		}
		if (packet) {
			timeline.fromTo(
				packet,
				{ autoAlpha: 0, scale: 0.82, y: 12 },
				{ autoAlpha: 1, scale: 1, y: 0, duration: DUR.beat, ease: EASE.out }
			);
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
					Tokens pour into an empty window. The stack starts with the system prompt, tool definitions,
					history, and your message — then every loop turn appends a tool result and a model reply on
					top. More text means less room for what comes next.
				</p>
				<Legend
					items={[
						{ hue: 'system', label: 'system prompt' },
						{ hue: 'tools', label: 'tool definitions' },
						{ hue: 'history', label: 'conversation history' },
						{ hue: 'user', label: 'user input' },
						{ hue: 'tool-output', label: 'tool output' },
						{ hue: 'response', label: 'model reply' },
					]}
				/>
			</div>

			<div class="tank-wrap">
				<div class="tank-label">
					<span>one call</span>
					<span class="tank-gauge" data-gauge>{fmt(USED_TURN2)} / {fmt(BUDGET)} tokens</span>
				</div>
				<div
					class="tank"
					data-tank
					role="group"
					aria-label="Context strata rising toward a budget line as the loop appends tool outputs and replies; past the limit, the oldest layer is evicted."
				>
					<div class="tank__limit" data-limit aria-hidden="true"><span>limit</span></div>
					<div class="tank__contents" data-tank-contents aria-hidden="true">
						<div class="tank__fill" data-fill style="transform: scaleY({fillScale(USED_TURN2)})"></div>
						<div class="strata">
							{#each layout as band (band.key)}
								<div
									class={`band band--${band.hue}`}
									class:band--attempt={band.group === 'attempt'}
									data-band={band.key}
									data-stratum={band.group === 'attempt' ? undefined : ''}
									style={`--band-bottom: ${band.bottom}%; --band-height: ${band.height}%;`}
								>
									<strong>{band.label}</strong><span>{fmt(band.tok)}</span>
								</div>
							{/each}
						</div>
						<div class="chips">
							{#each Array(14) as _, index}
								<span class="chip" data-chip data-chip-index={index} style={`--chip-x: ${12 + ((index * 29) % 76)}%; --chip-y: ${12 + ((index * 17) % 62)}%;`}></span>
							{/each}
						</div>
					</div>
				</div>
				<div class="tank-note" aria-hidden="true">
					{#each NOTES as note, index (note)}
						<span data-note={index} class:tank-note--warm={index === 1}>{note}</span>
					{/each}
				</div>
				<div class="capacity-note" data-capacity>
					<span class="capacity-note__rule" aria-hidden="true"></span>
					<p><strong>Capacity is a harness decision.</strong> Hitting the limit is not model behavior. An over-limit call can simply fail; trimming the oldest history is one common policy — someone chooses what to drop. Chapter 06 returns to that choice.</p>
				</div>
			</div>
		<div class="stateless" data-stateless>
			<p class="stateless__eyebrow">The biggest misconception</p>
			<p class="stateless__line">Every call, the model reads <span class="stateless__claim">all of this and nothing else<span class="stateless__underline" data-stateless-underline aria-hidden="true"></span></span>.</p>
			<p class="stateless__support">It remembers nothing between calls. The next call gets a new packet.</p>
		</div>

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
		position: relative;
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
	.tank-gauge { font-variant-numeric: tabular-nums; }
	.tank { position: relative; isolation: isolate; width: min(100%, 25rem); height: clamp(20rem, 51vh, 31rem); margin-inline: auto; overflow: hidden; border: 2px solid var(--c-line-strong); border-radius: 1.4rem 1.4rem 2rem 2rem; background: var(--c-sunken); box-shadow: inset 0 0 0 0.45rem var(--c-surface); }
	.tank__contents { position: absolute; z-index: 1; inset: 0; pointer-events: none; transform-origin: bottom center; }
	.tank__fill { position: absolute; z-index: 1; inset: 17% 0 0; background: var(--concept-history-fill); opacity: 0.72; transform-origin: bottom center; }
	.tank__limit { position: absolute; z-index: 3; top: 17%; right: -0.15rem; left: -0.15rem; border-top: 2px dashed var(--c-ink-muted); color: var(--c-ink-muted); font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.05em; text-align: right; text-transform: uppercase; }
	.tank__limit span { position: relative; top: -1.3rem; right: 0.65rem; background: var(--c-sunken); padding-inline: 0.3rem; }
	.strata { position: absolute; z-index: 2; inset: 18% 0.9rem 0.9rem; }

	/* Bands are token-proportional: bottom/height come from the counts above,
	   so landings and the eviction shift are pure percentage tweens. */
	.band {
		position: absolute;
		right: 0;
		bottom: var(--band-bottom);
		left: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		height: max(0.7rem, calc(var(--band-height) - 3px));
		padding-inline: 0.6rem 0.55rem;
		overflow: hidden;
		border-left: 0.28rem solid;
		border-radius: 0.3rem;
		color: var(--c-ink);
		font-family: var(--mono);
		white-space: nowrap;
	}

	.band strong { overflow: hidden; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.02em; text-overflow: ellipsis; }
	.band span { color: var(--c-ink-muted); font-size: 0.62rem; font-variant-numeric: tabular-nums; }
	.band--system { border-color: var(--concept-system); background: var(--concept-system-fill); }
	.band--tools { border-color: var(--concept-tools); background: var(--concept-tools-fill); }
	.band--history { border-color: var(--concept-history); background: var(--concept-history-fill); }
	.band--user { border-color: var(--concept-user); background: var(--concept-user-fill); }
	.band--tool-output { border-color: var(--concept-tool-output); background: var(--concept-tool-output-fill); }
	.band--response { border-color: var(--concept-response); background: var(--concept-response-fill); }
	/* The breaching turn only exists in the enhanced choreography; static and
	   compact readers see the tank resting just under budget. */
	.band--attempt { opacity: 0; }

	.chips { position: absolute; z-index: 4; inset: 0; }
	.chip { position: absolute; top: var(--chip-y); left: var(--chip-x); width: 0.52rem; height: 0.52rem; border: 1px solid var(--concept-history); border-radius: 0.12rem; background: var(--concept-history-fill); }

	.tank-note { position: relative; height: 1.1rem; margin-inline: auto; width: min(100%, 25rem); color: var(--c-ink-muted); font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.04em; text-align: center; }
	.tank-note span { position: absolute; inset: 0; opacity: 0; }
	.tank-note--warm { color: var(--concept-tool-output); }

	.capacity-note { display: grid; grid-template-columns: 0.28rem 1fr; gap: 0.7rem; align-items: start; max-width: 25rem; margin-inline: auto; color: var(--c-ink-muted); font-size: 0.86rem; line-height: 1.45; }
	.capacity-note p { margin: 0; }
	.capacity-note strong { color: var(--c-ink); }
	.capacity-note__rule { min-height: 100%; border-radius: 0.25rem; background: var(--concept-tool-output); }

	.stateless { display: grid; gap: 0.65rem; max-width: 48rem; margin: clamp(2rem, 7vh, 5rem) auto clamp(1rem, 4vh, 2.5rem); padding: clamp(1.5rem, 4vw, 3rem) 0; border-block: 1px solid var(--c-line-strong); }
	.stateless p { margin: 0; }
	.stateless__eyebrow { color: var(--concept-history); font-family: var(--mono); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
	.stateless__claim { position: relative; }
	.stateless__underline { position: absolute; right: 0; bottom: -0.16em; left: 0; height: 0.12rem; border-radius: 999px; background: var(--concept-history); transform: scaleX(1); transform-origin: left center; }
	.stateless__line { max-width: 23ch; color: var(--c-ink); font-family: var(--display); font-size: clamp(1.8rem, 4.5vw, 3.7rem); font-weight: 700; letter-spacing: -0.04em; line-height: 1.04; }
	.stateless__support { color: var(--c-ink-muted); font-size: 1rem; line-height: 1.5; }

	.packet { display: inline-flex; align-items: center; gap: 0.3rem; min-width: 8rem; min-height: 4.2rem; padding: 0.75rem; border: 2px solid var(--concept-history); border-radius: 0.8rem; background: var(--concept-history-fill); box-shadow: 0.35rem 0.35rem 0 var(--c-line); color: var(--c-ink); font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase; }
	.packet--dock { width: 7rem; max-width: 100%; min-width: 0; min-height: 3.2rem; padding: 0.5rem; }
	.packet span { margin-inline-end: auto; }
	.packet i { width: 0.45rem; height: 1.6rem; border-radius: 0.12rem; background: var(--concept-history); opacity: 0.68; }

	.ports { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: min(100%, 48rem); margin-block-start: clamp(1.5rem, 5vh, 3rem); }
	.port { position: relative; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 0.9rem; width: clamp(10rem, 20vw, 14rem); min-width: 10rem; height: clamp(5rem, 8vw, 7rem); padding: 0.8rem 0.9rem; border: 1px solid var(--c-line-strong); border-radius: 0.75rem; background: var(--c-surface); box-shadow: var(--panel-shadow); color: var(--c-ink-muted); font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; }
	.port__label { align-self: start; }
	.port__dock { display: grid; place-items: center; width: 2.7rem; height: 2.7rem; border: 1px dashed var(--concept-history); border-radius: 0.5rem; background: var(--concept-history-fill); }
	.port__dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--concept-history); }

	:global(.journey[data-journey='enhanced']) .scene {
		gap: clamp(0.75rem, 1.5vh, 1.25rem);
		height: 100svh;
		min-height: 100svh;
		overflow: hidden;
		padding-block: clamp(1rem, 3vh, 2rem);
	}

	:global(.journey[data-journey='enhanced']) .window-layout {
		min-height: 0;
	}

	:global(.journey[data-journey='enhanced']) .tank {
		height: min(40vh, 22rem);
	}

	:global(.journey[data-journey='enhanced']) .stateless {
		position: absolute;
		top: 18%;
		left: 0;
		width: calc(45% - 1rem);
		margin: 0;
		padding: 1rem 0;
	}

	:global(.journey[data-journey='enhanced']) .stateless__line {
		font-size: clamp(1.65rem, 3vw, 2.5rem);
	}

	:global(.journey[data-journey='enhanced']) .ports {
		position: absolute;
		right: var(--page-gutter);
		bottom: 2%;
		left: var(--page-gutter);
		margin: 0 auto;
	}
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
