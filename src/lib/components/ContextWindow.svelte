<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	/* ============================================================
	   Chapter 07 — The Context Window (PRD §7, §10)
	   A liquid tank that mediates between the agent and the LLM.
	   Strata = what's in the window (system prompt, tool defs, user
	   prompt, tool outputs, model replies). It fills as the inner
	   loop runs, is sent to the model whole every call, and overflows
	   when it passes the budget — the oldest content falls out.
	   Sticky graphic + scrolling steps; degrades to static + prose.
	============================================================ */

	const SURFACE = '#11151F',
		LINE = '#1E2533',
		LINE_B = '#2C3650';
	const PAPER = '#E8E6DF',
		MUTED = '#8A93A6',
		FAINT = '#5A6275';
	const COOL = '#38E1C6',
		WARM = '#FF9D4D';

	type Kind = 'fixed' | 'user' | 'tool' | 'response';
	type Band = { key: string; label: string; tok: number; kind: Kind; fill: string };

	const B: Record<string, Band> = {
		system: { key: 'system', label: 'system prompt', tok: 450, kind: 'fixed', fill: '#171D2A' },
		tools: { key: 'tools', label: 'tool definitions', tok: 2100, kind: 'fixed', fill: '#1B2230' },
		user: { key: 'user', label: 'user prompt', tok: 80, kind: 'user', fill: '#232C40' },
		toolout1: { key: 'toolout1', label: 'tool output', tok: 1240, kind: 'tool', fill: '#28324B' },
		response1: { key: 'response1', label: 'LLM response', tok: 320, kind: 'response', fill: '#2E394F' },
		toolout2: { key: 'toolout2', label: 'tool output', tok: 1500, kind: 'tool', fill: '#28324B' },
		response2: { key: 'response2', label: 'LLM response', tok: 380, kind: 'response', fill: '#2E394F' },
		toolout3: { key: 'toolout3', label: 'tool output', tok: 1700, kind: 'tool', fill: '#28324B' },
		response3: { key: 'response3', label: 'LLM response', tok: 300, kind: 'response', fill: '#2E394F' }
	};
	const accentOf = (k: Kind) => (k === 'tool' ? COOL : k === 'response' ? WARM : null);

	type Step = {
		title: string;
		body: string;
		bands: string[]; // bottom → top
		highlight: 'all' | string[];
		entered: string[];
		note: string;
		overflow?: boolean;
	};

	const STEPS: Step[] = [
		{
			title: 'A window, mid-task',
			body: 'Pause the agent halfway through a turn and look at what the model is actually handed. It is this stack — and nothing else. No database, no memory of past chats. Just these layers.',
			bands: ['system', 'tools', 'user', 'toolout1', 'response1'],
			highlight: 'all',
			entered: [],
			note: 'everything the model can “see” right now'
		},
		{
			title: 'Some of it never changes',
			body: 'The system prompt and the tool definitions sit at the bottom of every window. They are re-sent on every single call — a fixed cost you pay before any of your actual content fits.',
			bands: ['system', 'tools', 'user', 'toolout1', 'response1'],
			highlight: ['system', 'tools'],
			entered: [],
			note: 'fixed base · re-sent every call'
		},
		{
			title: 'The loop keeps adding',
			body: 'Each turn of the inner loop writes more in: the result of the tool it just ran, then the model’s reply, appended on top. The window is how one step remembers the last.',
			bands: ['system', 'tools', 'user', 'toolout1', 'response1'],
			highlight: ['toolout1', 'response1'],
			entered: ['response1'],
			note: 'tool result observed → reply appended'
		},
		{
			title: 'It fills up',
			body: 'Do that a few times and the stack climbs toward the line. Every tool result and every reply is more tokens — and tokens are the budget for cost, speed, and how much the model can still take in.',
			bands: ['system', 'tools', 'user', 'toolout1', 'response1', 'toolout2', 'response2', 'toolout3'],
			highlight: 'all',
			entered: ['toolout2', 'response2', 'toolout3'],
			note: 'every turn costs more tokens'
		},
		{
			title: 'Past the limit, things fall out',
			body: 'The window is finite. Push past the budget and the oldest content is dropped to make room — the model simply stops being able to see it. That is why a long agent run can “forget” what it did early on.',
			bands: ['system', 'tools', 'user', 'response1', 'toolout2', 'response2', 'toolout3', 'response3'],
			highlight: 'all',
			entered: ['response3'],
			note: 'reached 8.1k / 8k → oldest evicted',
			overflow: true
		}
	];

	// vessel geometry
	const VX = 64,
		VW = 196,
		FLOOR = 420,
		MAXY = 68,
		MAX = 8000;
	const scale = (FLOOR - MAXY) / MAX;

	const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));

	let activeStep = $state(0);
	let reduced = $state(false);

	const step = $derived(STEPS[activeStep]);
	const prevBands = $derived(activeStep > 0 ? STEPS[activeStep - 1].bands : STEPS[0].bands);

	const laid = $derived.by(() => {
		let acc = 0;
		return step.bands.map((k) => {
			const b = B[k];
			const h = b.tok * scale;
			const y = FLOOR - acc - h;
			acc += h;
			const lit = step.highlight === 'all' || step.highlight.includes(k);
			return { ...b, h, y, lit, isNew: step.entered.includes(k) };
		});
	});
	// bands that existed last step but are gone now → evicted (fall out)
	const evicted = $derived(prevBands.filter((k) => !step.bands.includes(k)).map((k) => B[k]));
	const used = $derived(step.bands.reduce((a, k) => a + B[k].tok, 0));
	const surfaceY = $derived(Math.max(MAXY - 6, FLOOR - used * scale));

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reduced = mq.matches;
		const onChange = () => (reduced = mq.matches);
		mq.addEventListener('change', onChange);

		const els = Array.from(document.querySelectorAll<HTMLElement>('.ctx-step'));
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						const i = Number((e.target as HTMLElement).dataset.i);
						if (!Number.isNaN(i)) activeStep = i;
					}
				}
			},
			{ rootMargin: '-45% 0px -45% 0px', threshold: 0 }
		);
		els.forEach((el) => io.observe(el));
		return () => {
			io.disconnect();
			mq.removeEventListener('change', onChange);
		};
	});
</script>

<section class="ctx" aria-labelledby="ctx-title">
	<div class="ctx-head">
		<p class="eyebrow">Chapter 07 · the mediator</p>
		<h2 id="ctx-title">The context window is the model’s entire world.</h2>
		<p class="ctx-intro">
			Between the agent and the LLM sits a tank. The agent fills it; the whole thing is handed to the
			model on every call; the reply is poured back in. It has a bottom — and a top.
		</p>
	</div>

	<div class="ctx-scrolly">
		<figure class="ctx-sticky" class:reduced>
			<svg viewBox="0 0 560 470" role="img" aria-label="A context window drawn as a tank filling with labeled layers — system prompt and tool definitions at the base, then user prompt, tool outputs and model responses — rising toward a maximum budget line.">
				<defs>
					<linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stop-color="#2C3650" stop-opacity="0.25" />
						<stop offset="1" stop-color="#2C3650" stop-opacity="0" />
					</linearGradient>
				</defs>

				<!-- gauge -->
				<text x={VX} y="34" font-family="var(--mono)" font-size="13" fill={MUTED}>
					<tspan fill={step.overflow ? WARM : PAPER} font-weight="600">{fmt(used)}</tspan><tspan fill={FAINT}> / {fmt(MAX)} tokens</tspan>
				</text>

				<!-- vessel -->
				<rect x={VX} y={MAXY - 18} width={VW} height={FLOOR - (MAXY - 18)} rx="10" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
				<rect x={VX} y={surfaceY} width={VW} height={FLOOR - surfaceY} fill="url(#liquid)" style:transition={reduced ? 'none' : 'y .6s cubic-bezier(.5,0,.2,1), height .6s cubic-bezier(.5,0,.2,1)'} />

				<!-- max line -->
				<line x1={VX - 6} y1={MAXY} x2={VX + VW + 6} y2={MAXY} stroke={step.overflow ? WARM : FAINT} stroke-width="1.25" stroke-dasharray="4 4" />
				<text x={VX + VW + 10} y={MAXY + 4} font-family="var(--mono)" font-size="11" fill={step.overflow ? WARM : FAINT}>max</text>

				<!-- evicted bands fall out the bottom -->
				{#each evicted as e (e.key)}
					<g out:fly={{ y: 90, duration: reduced ? 0 : 700, opacity: 0 }}>
						<rect x={VX + 4} y={FLOOR - e.tok * scale - 2} width={VW - 8} height={e.tok * scale} rx="3" fill={e.fill} stroke={FAINT} stroke-width="1" opacity="0.5" />
						<text x={VX + 14} y={FLOOR - e.tok * scale / 2 - 2} dominant-baseline="middle" font-family="var(--mono)" font-size="11" fill={FAINT} text-decoration="line-through">{e.label}</text>
					</g>
				{/each}

				<!-- live strata -->
				{#each laid as b (b.key)}
					{@const accent = accentOf(b.kind)}
					<g
						in:fly={{ x: b.kind === 'response' ? 60 : -60, duration: reduced ? 0 : 600, opacity: 0 }}
						opacity={b.lit ? 1 : 0.4}
						style:transition={reduced ? 'none' : 'opacity .5s ease'}
					>
						<rect
							x={VX + 4}
							width={VW - 8}
							rx="3"
							y={b.y}
							height={Math.max(0, b.h - 2)}
							fill={b.fill}
							stroke={b.isNew && accent ? accent : LINE}
							stroke-width={b.isNew && accent ? 1.4 : 0.8}
							style:transition={reduced ? 'none' : 'y .6s cubic-bezier(.5,0,.2,1), height .6s cubic-bezier(.5,0,.2,1)'}
							style:filter={b.isNew && accent ? `drop-shadow(0 0 8px ${accent}66)` : 'none'}
						/>
						{#if accent}
							<rect x={VX + 4} y={b.y} width="3" height={Math.max(0, b.h - 2)} fill={accent} opacity={b.isNew ? 1 : 0.55} style:transition={reduced ? 'none' : 'y .6s cubic-bezier(.5,0,.2,1), height .6s cubic-bezier(.5,0,.2,1)'} />
						{/if}
						{#if b.h >= 17}
							<text x={VX + 14} y={b.y + b.h / 2} dominant-baseline="middle" font-family="var(--mono)" font-size="11" fill={b.kind === 'fixed' ? MUTED : PAPER} style:transition={reduced ? 'none' : 'y .6s cubic-bezier(.5,0,.2,1)'}>{b.label}</text>
							<text x={VX + VW - 10} y={b.y + b.h / 2} text-anchor="end" dominant-baseline="middle" font-family="var(--mono)" font-size="10" fill={FAINT} style:transition={reduced ? 'none' : 'y .6s cubic-bezier(.5,0,.2,1)'}>{fmt(b.tok)}</text>
						{/if}
					</g>
				{/each}

				<!-- liquid surface -->
				<line x1={VX + 2} y1={surfaceY} x2={VX + VW - 2} y2={surfaceY} stroke={PAPER} stroke-width="1.25" opacity="0.45" style:transition={reduced ? 'none' : 'y .6s cubic-bezier(.5,0,.2,1)'} />

				<!-- the window is read by the model, whole, every call -->
				<text x={VX + VW / 2} y="448" text-anchor="middle" font-family="var(--mono)" font-size="11" fill={FAINT}>sent to the model whole · every call</text>
			</svg>

			<figcaption class="ctx-note mono">{step.note}</figcaption>
		</figure>

		<ol class="ctx-steps">
			{#each STEPS as s, i}
				<li class="ctx-step" class:active={i === activeStep} data-i={i}>
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
		max-width: 70rem;
		margin: clamp(4rem, 12vw, 9rem) auto 0;
		padding: 0 clamp(1rem, 4vw, 2rem);
	}

	.ctx-head {
		max-width: 46rem;
	}

	.eyebrow {
		color: var(--muted);
	}

	.ctx-head h2 {
		font-size: clamp(1.9rem, 4.6vw, 2.9rem);
		margin: 0.5rem 0 1rem;
		max-width: 20ch;
	}

	.ctx-intro {
		font-size: clamp(1.05rem, 2.4vw, 1.2rem);
		color: var(--muted);
		max-width: var(--reading);
	}

	.ctx-scrolly {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(1.5rem, 5vw, 4rem);
		margin-top: clamp(1.5rem, 5vw, 3rem);
		align-items: start;
	}

	.ctx-sticky {
		position: sticky;
		top: 8vh;
		margin: 0;
		padding: 1.25rem;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: linear-gradient(180deg, #0c1019, var(--surface));
		box-shadow: 0 30px 60px -40px rgba(0, 0, 0, 0.8);
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
		min-height: 64vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		max-width: 34rem;
		opacity: 0.32;
		transition: opacity 0.4s ease;
	}

	.ctx-step:first-child {
		min-height: 42vh;
		justify-content: flex-end;
		padding-bottom: 6vh;
	}

	.ctx-step:last-child {
		min-height: 70vh;
	}

	.ctx-step.active {
		opacity: 1;
	}

	.step-n {
		font-size: 0.8rem;
		color: var(--cool);
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
			min-height: 52vh;
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
</style>
