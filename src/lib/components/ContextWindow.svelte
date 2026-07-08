<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { STEP_ROOT_MARGIN } from '$lib/animation/chapterMotion';
	import {
		CONTEXT_BANDS as B,
		CONTEXT_LEGEND_KEYS,
		CONTEXT_STEPS as STEPS,
		CONTEXT_TOKEN_BUDGET as MAX,
		type ContextBandKey,
		type ContextStep as Step
	} from '$lib/content/contextWindow';
	import { chapterNumberFor } from '$lib/content/loopPath';
	import { loop } from '$lib/loop.svelte';

	/* ============================================================
	   Station: context window.
	   A liquid tank that mediates between the agent and the LLM.
	   Strata = what's in the window (system prompt, tool defs, user
	   prompt, tool outputs, model replies). It fills as the inner
	   loop runs, is sent to the model whole every call, and overflows
	   when it passes the budget — the oldest content falls out.
	   Sticky graphic + scrolling steps; degrades to static + prose.
	============================================================ */

	const SURFACE = 'var(--diagram-surface)',
		LINE = 'var(--line)',
		LINE_B = 'var(--line-bright)';
	const PAPER = 'var(--paper)',
		MUTED = 'var(--muted)',
		FAINT = 'var(--faint)';
	const COOL = 'var(--cool)',
		WARM = 'var(--warm)';

	const CHAPTER_NUMBER = chapterNumberFor('context');

	const VX = 64,
		VW = 196,
		FLOOR = 420,
		MAXY = 68;
	const scale = (FLOOR - MAXY) / MAX;

	const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));

	let activeStep = $state(0);
	let rootEl: HTMLElement;
	let figureEl: HTMLElement;
	let stepsEl: HTMLElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let gsap: any;
	let gsapReady = $state(false);
	let activation = 0;

	// Enhanced = the pinned 2D camera world is mounted. Then the chapter parks
	// at one viewport height and its steps are a scroll-driven conveyor (in from
	// the bottom, out the top) instead of a tall document-flow scrolly — so the
	// loop spine stays flat through this station.
	const enhanced = $derived(gsapReady && loop.worldEnhanced);

	const step = $derived(STEPS[activeStep] as Step);
	const layoutFor = (target: Step) => {
		let acc = 0;
		return target.bands.map((k) => {
			const b = B[k];
			const h = b.tok * scale;
			const y = FLOOR - acc - h;
			acc += h;
			const lit = target.highlight === 'all' || (target.highlight as readonly ContextBandKey[]).includes(k);
			return { ...b, h, y, lit, isNew: target.entered.includes(k) };
		});
	};
	const laid = $derived(layoutFor(step));
	const used = $derived(step.bands.reduce((a, k) => a + B[k].tok, 0));
	const surfaceY = $derived(Math.max(MAXY - 6, FLOOR - used * scale));
	const fixedTop = FLOOR - (B.system.tok + B.tools.tok) * scale;
	const LEGEND = CONTEXT_LEGEND_KEYS.map((key) => B[key]);
	const surfaceFor = (target: Step) =>
		Math.max(MAXY - 6, FLOOR - target.bands.reduce((a, k) => a + B[k].tok, 0) * scale);

	// Right-column steps as a vertical conveyor: active card centered, the rest
	// parked one mask-height above/below. Advancing scrolls the next card in from
	// the bottom and the previous out the top; the world coordinate never moves.
	function layoutConveyor(index: number, animate: boolean) {
		if (!gsap || !stepsEl) return;
		const cards = Array.from(stepsEl.querySelectorAll<HTMLElement>('.ctx-step'));
		const slide = (stepsEl.clientHeight || 480) * 0.9;
		cards.forEach((card, i) => {
			const target = { y: (i - index) * slide, autoAlpha: i === index ? 1 : 0 };
			if (animate) gsap.to(card, { ...target, duration: 0.62, ease: 'power3.out', overwrite: true });
			else gsap.set(card, target);
		});
	}

	async function activateStep(nextIndex: number) {
		if (nextIndex === activeStep) return;
		const run = ++activation;
		const previous = STEPS[activeStep] as Step;
		const next = STEPS[nextIndex] as Step;
		const previousLayout = layoutFor(previous);
		const previousMap = new Map(previousLayout.map((band) => [band.key, band]));
		const removed = previous.bands.filter((key) => !next.bands.includes(key));

		if (gsap && removed.length) {
			const nodes = removed
				.map((key) => figureEl.querySelector<SVGGElement>(`[data-band="${key}"]`))
				.filter(Boolean);
			if (nodes.length) {
				await new Promise<void>((resolve) => {
					gsap.to(nodes, { y: 70, opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: resolve });
				});
			}
		}

		if (run !== activation) return;
		activeStep = nextIndex;
		await tick();
		if (run !== activation || !gsap) return;

		const nextLayout = layoutFor(next);
		const duration = 0.62;
		const timeline = gsap.timeline({ defaults: { duration, ease: 'power2.inOut' } });

		for (const band of nextLayout) {
			const group = figureEl.querySelector<SVGGElement>(`[data-band="${band.key}"]`);
			if (!group) continue;
			const prior = previousMap.get(band.key);
			const fromY = prior?.y ?? band.y + band.h / 2;
			const fromHeight = prior ? Math.max(0, prior.h - 2) : 0;
			const toHeight = Math.max(0, band.h - 2);
			const direction = band.kind === 'response' ? 45 : -45;
			const body = group.querySelector<SVGRectElement>('.band-body');
			const hatch = group.querySelector<SVGRectElement>('.band-hatch');
			const accent = group.querySelector<SVGRectElement>('.band-accent');
			const label = group.querySelector<SVGTextElement>('.band-label');
			const count = group.querySelector<SVGTextElement>('.band-count');

			timeline.fromTo(
				group,
				{ x: prior ? 0 : direction, y: 0, opacity: prior ? (prior.lit ? 1 : 0.4) : 0 },
				{ x: 0, y: 0, opacity: band.lit ? 1 : 0.4 },
				0
			);
			for (const rect of [body, hatch, accent].filter(Boolean)) {
				timeline.fromTo(
					rect,
					{ attr: { y: fromY, height: fromHeight } },
					{ attr: { y: band.y, height: toHeight } },
					0
				);
			}
			for (const text of [label, count].filter(Boolean)) {
				timeline.fromTo(
					text,
					{ attr: { y: fromY + (prior?.h ?? 0) / 2 } },
					{ attr: { y: band.y + band.h / 2 } },
					0
				);
			}
		}

		const oldSurface = surfaceFor(previous);
		const newSurface = surfaceFor(next);
		timeline.fromTo(
			figureEl.querySelector('.ctx-liquid'),
			{ attr: { y: oldSurface, height: FLOOR - oldSurface } },
			{ attr: { y: newSurface, height: FLOOR - newSurface } },
			0
		);
		timeline.fromTo(
			figureEl.querySelector('.ctx-surface'),
			{ attr: { y1: oldSurface, y2: oldSurface } },
			{ attr: { y1: newSurface, y2: newSurface } },
			0
		);
		timeline.fromTo(
			figureEl.querySelector('.dynamic-bracket'),
			{ attr: { d: `M ${VX - 8} ${oldSurface} h -7 v ${Math.max(0, fixedTop - oldSurface)} h 7` } },
			{ attr: { d: `M ${VX - 8} ${newSurface} h -7 v ${Math.max(0, fixedTop - newSurface)} h 7` } },
			0
		);

		if (enhanced) {
			layoutConveyor(nextIndex, true);
		} else {
			const prose = Array.from(rootEl.querySelectorAll<HTMLElement>('.ctx-step'));
			gsap.to(prose, { opacity: 0.32, duration: 0.35, overwrite: true });
			gsap.to(prose[nextIndex], { opacity: 1, duration: 0.35, overwrite: true });
		}
	}

	onMount(() => {
		let disposed = false;
		import('gsap').then((module) => {
			if (disposed) return;
			gsap = module.gsap ?? module.default;
			gsapReady = true;
		});
		return () => {
			disposed = true;
		};
	});

	// Pick the step driver by mode. Base/fallback: an IntersectionObserver over
	// the tall document-flow list drives which step is active and fades prose.
	// Enhanced: the steps are a fixed-height conveyor whose position is set here
	// and animated by activateStep; the frac effect below advances the index.
	$effect(() => {
		if (!gsapReady) return;
		const isEnhanced = enhanced;
		const index = untrack(() => activeStep);
		const prose = Array.from(rootEl.querySelectorAll<HTMLElement>('.ctx-step'));

		if (isEnhanced) {
			gsap.set(prose, { clearProps: 'opacity' });
			layoutConveyor(index, false);
			return () => gsap.set(prose, { clearProps: 'transform,opacity,visibility' });
		}

		gsap.set(prose, { clearProps: 'transform,visibility', opacity: 0.32 });
		gsap.set(prose[index], { opacity: 1 });
		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const i = Number((entry.target as HTMLElement).dataset.i);
					if (!Number.isNaN(i)) void activateStep(i);
				}
			},
			{ rootMargin: STEP_ROOT_MARGIN, threshold: 0 }
		);
		prose.forEach((element) => io.observe(element));
		return () => io.disconnect();
	});

	// Enhanced only: map this station's dwell frac to a step index. The page
	// publishes frac 0→1 across the parked camera dwell; each threshold advances
	// the conveyor + tank fill, scrubbable both directions.
	$effect(() => {
		if (!enhanced) return;
		const { stop, frac } = loop.stationProgress;
		if (stop !== 'context') return;
		const index = Math.min(STEPS.length - 1, Math.max(0, Math.floor(frac * STEPS.length)));
		void activateStep(index);
	});
</script>

<section bind:this={rootEl} id="context" class="ctx" data-chapter={CHAPTER_NUMBER} aria-labelledby="ctx-title">
	<div class="ctx-head chapter-head">
		<p class="eyebrow">Chapter {CHAPTER_NUMBER} · the mediator</p>
		<h2 id="ctx-title">The context window is the model’s entire world.</h2>
		<p class="ctx-intro">
			Between the agent and the LLM sits a tank. The agent fills it; the whole thing is handed to the
			model on every call; the reply is poured back in. It has a bottom — and a top.
		</p>
	</div>

	<div class="ctx-scrolly">
		<figure class="ctx-sticky" bind:this={figureEl}>
			<svg viewBox="0 0 560 470" role="img" aria-label="A context window drawn as a tank filling with labeled layers — system prompt and tool definitions at the base, then user prompt, tool outputs and model responses — rising toward a maximum budget line.">
				<defs>
					<linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stop-color="var(--liquid)" stop-opacity="0.25" />
						<stop offset="1" stop-color="var(--liquid)" stop-opacity="0" />
					</linearGradient>
					<pattern id="ctx-fixed-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
						<line x1="0" y1="0" x2="0" y2="7" stroke={PAPER} stroke-width="1" opacity="0.06" />
					</pattern>
				</defs>

				<!-- gauge -->
				<text x={VX} y="34" font-family="var(--mono)" font-size="13" fill={MUTED}>
					<tspan fill={step.overflow ? WARM : PAPER} font-weight="600">{fmt(used)}</tspan><tspan fill={FAINT}> / {fmt(MAX)} tokens</tspan>
				</text>

				<!-- vessel -->
				<rect x={VX} y={MAXY - 18} width={VW} height={FLOOR - (MAXY - 18)} rx="10" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
				<rect class="ctx-liquid" x={VX} y={surfaceY} width={VW} height={FLOOR - surfaceY} fill="url(#liquid)" />

				<!-- max line -->
				<line x1={VX - 6} y1={MAXY} x2={VX + VW + 6} y2={MAXY} stroke={step.overflow ? WARM : FAINT} stroke-width="1.25" stroke-dasharray="4 4" />
				<text x={VX + VW + 10} y={MAXY + 4} font-family="var(--mono)" font-size="11" fill={step.overflow ? WARM : FAINT}>max</text>

				<!-- live strata -->
				{#each laid as b (b.key)}
					<g data-band={b.key} opacity={b.lit ? 1 : 0.4}>
						<rect
							class="band-body"
							x={VX + 4}
							width={VW - 8}
							rx="3"
							y={b.y}
							height={Math.max(0, b.h - 2)}
							fill={b.fill}
							stroke={b.isNew ? b.accent : LINE}
							stroke-width={b.isNew ? 1.4 : 0.8}
							style:filter={b.isNew
								? 'drop-shadow(0 2px 4px oklch(0.25 0.02 260 / 0.18))'
								: 'none'}
						/>
						{#if b.kind === 'fixed'}
							<rect class="band-hatch" x={VX + 4} y={b.y} width={VW - 8} height={Math.max(0, b.h - 2)} rx="3" fill="url(#ctx-fixed-hatch)" />
						{/if}
						<rect class="band-accent" x={VX + 4} y={b.y} width="3" height={Math.max(0, b.h - 2)} fill={b.accent} opacity={b.isNew ? 1 : 0.6} />
						{#if b.h >= 17}
							<text class="band-label" x={VX + 14} y={b.y + b.h / 2} dominant-baseline="middle" font-family="var(--mono)" font-size="11" fill={b.accent}>{b.label}</text>
							<text class="band-count" x={VX + VW - 10} y={b.y + b.h / 2} text-anchor="end" dominant-baseline="middle" font-family="var(--mono)" font-size="10" fill={FAINT}>{fmt(b.tok)}</text>
						{/if}
					</g>
				{/each}

				<!-- liquid surface -->
				<line class="ctx-surface" x1={VX + 2} y1={surfaceY} x2={VX + VW - 2} y2={surfaceY} stroke={PAPER} stroke-width="1.25" opacity="0.45" />

				<!-- fixed/dynamic structure -->
				<path d={`M ${VX - 8} ${fixedTop} h -7 v ${FLOOR - fixedTop} h 7`} fill="none" stroke={FAINT} />
				<text x={VX - 20} y={(fixedTop + FLOOR) / 2} text-anchor="middle" transform={`rotate(-90 ${VX - 20} ${(fixedTop + FLOOR) / 2})`} font-family="var(--mono)" font-size="9" letter-spacing="0.08em" fill={FAINT}>FIXED · EVERY CALL</text>
				<path class="dynamic-bracket" d={`M ${VX - 8} ${surfaceY} h -7 v ${Math.max(0, fixedTop - surfaceY)} h 7`} fill="none" stroke={MUTED} />

				<!-- persistent color key -->
				<text x="316" y="74" font-family="var(--mono)" font-size="11" font-weight="600" letter-spacing="0.1em" fill={PAPER}>WHAT IS IN THE WINDOW</text>
				<text x="316" y="100" font-family="var(--mono)" font-size="9" letter-spacing="0.1em" fill={FAINT}>FIXED · RE-SENT UNCHANGED</text>
				{#each LEGEND.slice(0, 2) as item, i}
					<rect x="316" y={113 + i * 28} width="18" height="18" rx="3" fill={item.fill} stroke={LINE_B} />
					<rect x="316" y={113 + i * 28} width="18" height="18" rx="3" fill="url(#ctx-fixed-hatch)" />
					<rect x="316" y={113 + i * 28} width="3" height="18" fill={item.accent} />
					<text x="344" y={123 + i * 28} dominant-baseline="middle" font-family="var(--mono)" font-size="10" fill={item.accent}>{item.label}</text>
				{/each}
				<text x="316" y="184" font-family="var(--mono)" font-size="9" letter-spacing="0.1em" fill={MUTED}>DYNAMIC · CHANGES BY TURN</text>
				{#each LEGEND.slice(2) as item, i}
					<rect x="316" y={197 + i * 32} width="18" height="18" rx="3" fill={item.fill} stroke={LINE_B} />
					<rect x="316" y={197 + i * 32} width="3" height="18" fill={item.accent} />
					<text x="344" y={207 + i * 32} dominant-baseline="middle" font-family="var(--mono)" font-size="10" fill={item.accent}>{item.label}</text>
				{/each}
				<text x="316" y="350" font-family="var(--mono)" font-size="9.5" fill={FAINT}>Fixed = prompt scaffolding</text>
				<text x="316" y="369" font-family="var(--mono)" font-size="9.5" fill={FAINT}>Dynamic = task state and outputs</text>

				<!-- the window is read by the model, whole, every call -->
				<text x={VX + VW / 2} y="448" text-anchor="middle" font-family="var(--mono)" font-size="11" fill={FAINT}>sent to the model whole · every call</text>
			</svg>

			<figcaption class="ctx-note mono">{step.note}</figcaption>
		</figure>

		<ol class="ctx-steps" bind:this={stepsEl}>
			{#each STEPS as s, i}
				<li class="ctx-step" data-i={i} aria-current={i === activeStep ? 'step' : undefined}>
					<span class="step-n mono">0{i + 1}</span>
					<h3>{s.title}</h3>
					<p>{s.body}</p>
				</li>
			{/each}
		</ol>
	</div>

	<p class="disclaimer ctx-disclaimer">
		Illustrative: token counts and the budget shown are made up, and real windows are far larger. The
		behaviors are real — the fixed base re-sent each call, the window growing as the loop runs, and
		the oldest content being evicted past the limit.
	</p>
</section>

<style>
	.ctx {
		position: relative;
		width: 100%;
		margin: clamp(4rem, 12vw, 9rem) 0 0;
		padding: clamp(2rem, 4vw, 3rem) var(--page-gutter) 0;
		border-top: 1px solid var(--line);
	}

	.ctx-head h2 {
		/* size/colour come from the shared .chapter-head rules; keep the gap
		   before the intro paragraph */
		margin-bottom: 1rem;
	}

	.ctx-intro {
		font-size: clamp(1.05rem, 2.4vw, 1.2rem);
		color: var(--muted);
		max-width: var(--reading);
	}

	.ctx-scrolly {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(20rem, 0.65fr);
		gap: clamp(1.5rem, 5vw, 4rem);
		margin-top: clamp(1.5rem, 5vw, 3rem);
		align-items: start;
	}

	.ctx-sticky {
		position: sticky;
		top: 8vh;
		margin: 0;
		width: 100%;
		max-width: min(100%, calc((92svh - 4rem) * 1.191));
		padding: 1.25rem;
		border: 1px solid var(--line);
		border-top: 2px solid var(--brand);
		border-radius: 3px;
		background: var(--panel-gradient);
		box-shadow: var(--panel-shadow);
	}

	.ctx-sticky svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.ctx-note {
		margin-top: 0.5rem;
		font-size: 0.74rem;
		letter-spacing: 0.04em;
		color: var(--muted);
		text-align: center;
	}

	.ctx-steps {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.ctx-step {
		min-height: 48vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		max-width: 34rem;
		opacity: 0.32;
	}

	.ctx-step:first-child {
		min-height: 36vh;
		justify-content: flex-end;
		padding-bottom: 6vh;
	}

	.ctx-step:last-child {
		min-height: 58vh;
	}

	.ctx-step:first-child {
		opacity: 1;
	}

	.step-n {
		font-size: 0.8rem;
		color: var(--brand-strong);
		letter-spacing: 0.1em;
	}

	.ctx-step h3 {
		font-family: var(--display);
		font-weight: 400;
		font-size: clamp(1.5rem, 3.4vw, 2.1rem);
		margin: 0.4rem 0 0.7rem;
		color: var(--paper);
	}

	.ctx-step p {
		font-size: clamp(1.02rem, 2.3vw, 1.18rem);
		color: var(--muted);
		line-height: 1.6;
	}

	.ctx-disclaimer {
		margin: 2rem 0 0;
		max-width: 48rem;
	}

	@media (max-width: 760px) {
		.ctx-scrolly {
			grid-template-columns: 1fr;
			gap: 0;
		}
		.ctx-sticky {
			top: auto;
			position: sticky;
			top: 4vh;
			margin-bottom: 2rem;
			z-index: 1;
		}
		.ctx-step {
			min-height: 44vh;
		}
		.ctx-step:first-child {
			min-height: 24vh;
		}
	}

	/* Without JS the observer never runs: reveal every step so the prose still reads. */
	:global(html.no-js) .ctx-step {
		opacity: 1;
		min-height: auto;
		margin-bottom: 2rem;
	}

	/* Enhanced world: the chapter parks at one pinned viewport height. Head on
	   top, tank + step conveyor share the middle, disclaimer at the foot. The
	   station never scrolls its world coordinate, so the loop spine stays flat
	   through it; the steps are absolutely stacked and JS runs the conveyor. */
	:global(html[data-loop-world='enhanced']) .ctx {
		height: var(--world-viewport, 100svh);
		margin: 0;
		padding: clamp(0.75rem, 2vh, 1.75rem) var(--page-gutter);
		border-top: none;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-sizing: border-box;
	}
	:global(html[data-loop-world='enhanced']) .ctx-head,
	:global(html[data-loop-world='enhanced']) .ctx-disclaimer {
		flex: none;
	}
	:global(html[data-loop-world='enhanced']) .ctx-head h2 {
		font-size: clamp(1.7rem, 3vw, 2.5rem);
		margin-bottom: 0.5rem;
	}
	:global(html[data-loop-world='enhanced']) .ctx-intro {
		font-size: clamp(0.98rem, 1.7vw, 1.1rem);
		max-width: 62ch;
	}
	:global(html[data-loop-world='enhanced']) .ctx-disclaimer {
		margin: clamp(0.5rem, 1.4vh, 1rem) 0 0;
		font-size: 0.78rem;
	}
	:global(html[data-loop-world='enhanced']) .ctx-scrolly {
		flex: 1;
		min-height: 0;
		margin-top: clamp(0.5rem, 1.6vh, 1.25rem);
		align-items: center;
	}
	:global(html[data-loop-world='enhanced']) .ctx-sticky {
		align-self: center;
		max-width: min(100%, calc((var(--world-viewport, 80svh) - 20rem) * 1.191));
	}
	:global(html[data-loop-world='enhanced']) .ctx-steps {
		position: relative;
		height: 100%;
		align-self: stretch;
		overflow: hidden;
	}
	:global(html[data-loop-world='enhanced']) .ctx-step {
		position: absolute;
		inset: 0;
		min-height: 0;
		max-width: 34rem;
		padding: 0;
		justify-content: center;
		opacity: 0;
	}
</style>
