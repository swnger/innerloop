<script lang="ts">
	import { onMount } from 'svelte';

	/* ============================================================
	   The Inner Loop — Hero "system diagram" (PRD §6.1)
	   • AGENT (left): the tool-calling loop shown as pseudo-code. A
	     cycling band steps the while-body (think → act → observe).
	   • CONTEXT WINDOW (middle): the mediator. A stratified tank that
	     both sides write into — the agent packs context in, the model's
	     reply is appended back — and which is handed to the LLM whole on
	     every call. Sized against a finite budget (PRD §7, §10).
	   • LLM (right): the next-token distribution — context in, every
	     candidate token scored, the top one emitted, repeat.
	   • Tokens are particles: COOL written in, WARM appended back.
	     These two accents are the ONLY saturated colors on the page.
	   • Camera = discrete stops. Click-driven here for robustness;
	     production binds the same stops to scroll (PRD §6.1, §11).
	============================================================ */

	// Palette mirrored as SVG-safe hex (presentation attrs don't reliably take var()).
	const SURFACE = '#11151F',
		LINE = '#1E2533',
		LINE_B = '#2C3650';
	const PAPER = '#E8E6DF',
		MUTED = '#8A93A6',
		FAINT = '#5A6275';
	const COOL = '#38E1C6',
		WARM = '#FF9D4D';

	const CX = 500,
		CY = 310;

	type Stop = { key: string; label: string; fx: number; fy: number; z: number; caption: string };

	const STOPS: Stop[] = [
		{
			key: 'whole',
			label: 'Whole machine',
			fx: 500,
			fy: 310,
			z: 1,
			caption:
				'A prompt comes in on the left, the agent works, and a reply goes back out. The LLM on the right gets consulted along the way.'
		},
		{
			key: 'inner',
			label: 'The inner loop',
			fx: 350,
			fy: 384,
			z: 2.05,
			caption:
				'Inside one turn the agent runs a loop in code: call the model, and while it keeps asking for tools, run them and feed the results back — until it returns an answer. That while-loop is the site’s namesake.'
		},
		{
			key: 'llm',
			label: 'The LLM',
			fx: 790,
			fy: 386,
			z: 1.95,
			caption:
				'The model doesn’t look anything up. Given the context, it scores every possible next token, picks one, and repeats — building the reply one token at a time.'
		},
		{
			key: 'context',
			label: 'The context window',
			fx: 583,
			fy: 382,
			z: 2.0,
			caption:
				'The model has no memory — between the two sides sits the context window. The agent packs it (system prompt, tools, history, tool results); the whole stack is sent to the model each call; the reply is appended back. It’s finite, so what fits is the budget.'
		}
	];

	// the agent's tool-calling loop, as pseudo-code
	const CODE: { t: string; key?: boolean; dim?: boolean; note?: string }[] = [
		{ t: 'run(prompt):' },
		{ t: '  ctx = [system, prompt]', dim: true },
		{ t: '  while not done:', key: true },
		{ t: '    reply = LLM(ctx)', dim: true, note: 'think' },
		{ t: '    if reply.tool_call:', dim: true },
		{ t: '      out = run_tool(reply)', dim: true, note: 'act' },
		{ t: '      ctx += out', dim: true, note: 'observe' },
		{ t: '    else:', dim: true },
		{ t: '      return reply', dim: true, note: '→ user' }
	];
	const CODE_Y0 = 268,
		CODE_STEP = 24;

	// the LLM's next-token distribution (illustrative)
	const DIST = [
		{ tok: '▁the', p: 0.42 },
		{ tok: '▁a', p: 0.17 },
		{ tok: '▁my', p: 0.06 }
	];
	const OUT = ['▁open', '▁the', 'file'];

	const chipW = (tok: string) => Math.max(26, tok.replace('▁', '_').length * 8 + 14);

	// --- context-window tank (illustrative token sizes) ----------------------
	const STRAT_FILL: Record<string, string> = {
		system: '#171D2A',
		tools: '#1B2230',
		user: '#212A3D',
		toolout: '#27314A',
		reply: '#2C3650'
	};
	const T_X = 534,
		T_W = 98,
		T_TOP = 320,
		T_CAP = 338,
		T_FLOOR = 458;
	const HERO_STRATA = [
		{ key: 'system', label: 'system', tok: '0.4k', h: 15, fixed: true },
		{ key: 'tools', label: 'tool defs', tok: '2.1k', h: 30, fixed: true },
		{ key: 'user', label: 'user', tok: '0.1k', h: 12 },
		{ key: 'toolout', label: 'tool out', tok: '1.2k', h: 20 },
		{ key: 'reply', label: 'response', tok: '0.3k', h: 14, response: true }
	];
	let _acc = 0;
	const heroBands = HERO_STRATA.map((s) => {
		const bottom = T_FLOOR - _acc;
		_acc += s.h;
		return { ...s, top: bottom - s.h, bottom };
	});
	const fillLine = T_FLOOR - _acc;

	// output-row chip x positions (left-to-right), plus trailing caret
	let ox = 716;
	const outPos = OUT.map((t) => {
		const w = Math.max(24, t.replace('▁', '_').length * 6.6 + 12);
		const c = ox + w / 2;
		ox += w + 6;
		return { x: c, w };
	});
	const caretX = ox + 2;

	const HL_MAP: Record<string, { x: number; y: number; w: number; h: number; rx: number }> = {
		inner: { x: 178, y: 208, w: 344, h: 340, rx: 20 },
		llm: { x: 634, y: 240, w: 312, h: 290, rx: 20 },
		context: { x: 522, y: 300, w: 122, h: 172, rx: 12 }
	};

	// --- camera state ---------------------------------------------------------
	let stop = $state(0);
	let reduced = $state(false);
	let cam = $state({ x: 0, y: 0, z: 1 });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let gsap: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let tween: any;

	const targetOf = (i: number) => {
		const t = STOPS[i];
		return { x: CX - t.z * t.fx, y: CY - t.z * t.fy, z: t.z };
	};

	function go(i: number) {
		stop = (i + STOPS.length) % STOPS.length;
		const t = targetOf(stop);
		if (reduced || !gsap) {
			cam = t;
			return;
		}
		tween?.kill();
		tween = gsap.to(cam, { ...t, duration: 0.95, ease: 'power3.inOut' });
	}

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reduced = mq.matches;
		const onChange = () => (reduced = mq.matches);
		mq.addEventListener('change', onChange);
		import('gsap').then((m) => {
			gsap = (m as { gsap?: unknown }).gsap ?? m.default;
		});
		cam = targetOf(0);
		return () => mq.removeEventListener('change', onChange);
	});

	const current = $derived(STOPS[stop]);
	const camTransform = $derived(`translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`);
	const hl = $derived(HL_MAP[current.key]);
</script>

<!-- a token particle on a motion path (cool = written in, warm = appended back) -->
{#snippet flowChip(
	tok: string,
	accent: string,
	fillc: string,
	glow: string,
	path: string,
	dur: string,
	begin: string,
	restX: number,
	restY: number
)}
	{@const w = chipW(tok) * 0.8}
	{#if reduced}
		<g transform="translate({restX}, {restY})" opacity="0.9">
			<rect x={-w / 2} y="-8" width={w} height="16" rx="4" fill={fillc} stroke={accent} stroke-width="1" />
			<text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="9" font-weight="600" fill={accent}>{tok}</text>
		</g>
	{:else}
		<g opacity="0" style="filter: drop-shadow({glow});">
			<rect x={-w / 2} y="-8" width={w} height="16" rx="4" fill={fillc} stroke={accent} stroke-width="1" />
			<text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="9" font-weight="600" fill={accent}>{tok}</text>
			<animateMotion {dur} {begin} repeatCount="indefinite" {path} />
			<animate attributeName="opacity" {dur} {begin} repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.16;0.82;1" />
		</g>
	{/if}
{/snippet}

<section id="machine" class="hero" aria-labelledby="hero-title">
	<div class="intro">
		<p class="eyebrow">The whole machine</p>
		<h1 id="hero-title">
			One prompt loop,<br />one tool loop inside it.
		</h1>
		<p class="lede">
			Zoom into the agent to read its loop as code, into the window to see what the model is handed,
			or into the model to watch it score the next token. Tokens carry everything between them.
		</p>
	</div>

	<figure class="stage" class:reduced>
		<svg
			viewBox="0 0 1000 620"
			role="img"
			aria-label="System diagram: a user and agent on the left with a nested prompt-and-tool loop, a context window in the middle, and the LLM on the right scoring next tokens, with tokens flowing between them."
		>
			<defs>
				<marker
					id="arw"
					viewBox="0 0 10 10"
					refX="8"
					refY="5"
					markerWidth="6"
					markerHeight="6"
					orient="auto-start-reverse"
				>
					<path d="M0,0 L10,5 L0,10 z" fill={FAINT} />
				</marker>
				<pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
					<circle cx="1" cy="1" r="1" fill={LINE} opacity="0.55" />
				</pattern>
			</defs>

			<!-- blueprint dot-grid behind the stage -->
			<rect x="0" y="0" width="1000" height="620" fill="url(#dots)" />

			<g
				style:transform={camTransform}
				style:transition={reduced ? 'none' : undefined}
				style="transform-box: view-box; transform-origin: 0 0;"
			>
				<!-- USER + outer prompt loop -->
				<g>
					<circle cx="92" cy="150" r="26" fill={SURFACE} stroke={LINE_B} stroke-width="1.4" />
					<text x="92" y="151" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="11" font-weight="600" fill={MUTED}>YOU</text>
					<path d="M 118 134 C 150 120, 172 120, 192 150" fill="none" stroke={FAINT} stroke-width="1.6" marker-end="url(#arw)" />
					<text x="158" y="108" text-anchor="middle" font-family="var(--mono)" font-size="11" fill={FAINT}>prompt</text>
					<path d="M 192 196 C 168 226, 140 214, 118 178" fill="none" stroke={FAINT} stroke-width="1.6" marker-end="url(#arw)" />
					<text x="150" y="236" text-anchor="middle" font-family="var(--mono)" font-size="11" fill={FAINT}>reply</text>
					<text x="150" y="262" text-anchor="middle" font-family="var(--mono)" font-size="10.5" letter-spacing="0.04em" fill={FAINT}>user-facing prompt loop · outer</text>
				</g>

				<!-- AGENT panel + pseudo-code -->
				<rect x="182" y="212" width="336" height="334" rx="18" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
				<text x="350" y="236" text-anchor="middle" font-family="var(--mono)" font-size="12" font-weight="600" letter-spacing="0.16em" fill={PAPER}>AGENT</text>

				<!-- cycling band: think → act → observe -->
				{#if !reduced}
					<rect x="196" width="312" height="21" rx="4" fill={LINE_B} opacity="0.55" y="325">
						<animate
							attributeName="y"
							dur="6s"
							repeatCount="indefinite"
							calcMode="discrete"
							values="325;349;373;397;325"
							keyTimes="0;0.25;0.5;0.75;1"
						/>
					</rect>
				{:else}
					<rect x="196" y="349" width="312" height="21" rx="4" fill={LINE_B} opacity="0.55" />
				{/if}

				{#each CODE as ln, i}
					{@const y = CODE_Y0 + i * CODE_STEP}
					<text
						x="200"
						{y}
						xml:space="preserve"
						font-family="var(--mono)"
						font-size="12.5"
						font-weight={ln.key ? 600 : 400}
						fill={ln.dim ? MUTED : PAPER}
					>{ln.t}</text>
					{#if ln.note}
						<text x="508" {y} text-anchor="end" font-family="var(--mono)" font-size="10.5" fill={FAINT}>{'# ' + ln.note}</text>
					{/if}
				{/each}
				<text x="336" y="316" font-family="var(--mono)" font-size="10.5" font-weight="600" fill={PAPER}>← the inner loop</text>

				<!-- tools -->
				<text x="200" y="502" font-family="var(--mono)" font-size="11" fill={FAINT}>tools:</text>
				{#each ['read_file', 'run', 'search'] as t, i}
					{@const prev = ['read_file', 'run', 'search'].slice(0, i).reduce((a, s) => a + (s.length * 6.6 + 16) + 8, 250)}
					{@const w = t.length * 6.6 + 16}
					<g transform="translate({prev + w / 2}, 498)">
						<rect x={-w / 2} y="-9" width={w} height="18" rx="9" fill={SURFACE} stroke={LINE} stroke-width="1" />
						<text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="9.5" fill={MUTED}>{t}</text>
					</g>
				{/each}

				<!-- ============ CONTEXT WINDOW — the mediator ============ -->
				<text x="583" y="299" text-anchor="middle" font-family="var(--mono)" font-size="10" letter-spacing="0.08em" fill={MUTED}>CONTEXT WINDOW</text>
				<text x="583" y="311" text-anchor="middle" font-family="var(--mono)" font-size="8.5" fill={FAINT}>4.2k / 8k tokens</text>

				<!-- vessel -->
				<rect x={T_X} y={T_TOP} width={T_W} height={T_FLOOR - T_TOP + 4} rx="7" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
				<!-- max (budget) line -->
				<line x1={T_X} y1={T_CAP} x2={T_X + T_W} y2={T_CAP} stroke={FAINT} stroke-width="1" stroke-dasharray="2 3" />
				<text x={T_X + T_W + 5} y={T_CAP + 3} font-family="var(--mono)" font-size="7" fill={FAINT}>max</text>

				<!-- strata -->
				{#each heroBands as b}
					<rect x={T_X + 3} y={b.top} width={T_W - 6} height={b.h - 1.5} rx="2" fill={STRAT_FILL[b.key]} stroke={LINE} stroke-width="0.75" />
					{#if b.response}
						<rect x={T_X + 3} y={b.top} width="2.5" height={b.h - 1.5} fill={WARM} />
					{/if}
					<text x={T_X + 10} y={b.top + b.h / 2} dominant-baseline="middle" font-family="var(--mono)" font-size="7.5" fill={b.response ? WARM : b.fixed ? MUTED : PAPER}>{b.label}</text>
					<text x={T_X + T_W - 6} y={b.top + b.h / 2} text-anchor="end" dominant-baseline="middle" font-family="var(--mono)" font-size="7" fill={FAINT}>{b.tok}</text>
				{/each}
				<!-- current fill level -->
				<line x1={T_X} y1={fillLine} x2={T_X + T_W} y2={fillLine} stroke={LINE_B} stroke-width="1.25" />

				<!-- the window is handed to the model whole, every call -->
				<path d="M {T_X + T_W} 396 L 636 396" fill="none" stroke={FAINT} stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#arw)" />
				<text x="583" y="478" text-anchor="middle" font-family="var(--mono)" font-size="8" fill={FAINT}>sent whole → each call</text>

				<!-- cool: the agent writes context in -->
				<text x="500" y="342" text-anchor="middle" font-family="var(--mono)" font-size="9" fill={COOL}>write →</text>
				{@render flowChip('user', COOL, 'rgba(56,225,198,0.12)', 'var(--glow-cool)', 'M 519 358 Q 534 356 ' + (T_X + 18) + ' ' + (fillLine - 14), '3.4s', '0s', T_X + 16, fillLine - 14)}
				{@render flowChip('logs', COOL, 'rgba(56,225,198,0.12)', 'var(--glow-cool)', 'M 519 358 Q 534 356 ' + (T_X + 18) + ' ' + (fillLine - 14), '3.4s', '1.5s', T_X + 16, fillLine - 14)}

				<!-- warm: the model’s reply is appended back -->
				<text x="666" y="342" text-anchor="middle" font-family="var(--mono)" font-size="9" fill={WARM}>← append</text>
				{@render flowChip('▁open', WARM, 'rgba(255,157,77,0.12)', 'var(--glow-warm)', 'M 637 358 Q 622 356 ' + (T_X + T_W - 18) + ' ' + (fillLine - 14), '3.4s', '0.8s', T_X + T_W - 16, fillLine - 14)}
				{@render flowChip('file', WARM, 'rgba(255,157,77,0.12)', 'var(--glow-warm)', 'M 637 358 Q 622 356 ' + (T_X + T_W - 18) + ' ' + (fillLine - 14), '3.4s', '2.3s', T_X + T_W - 16, fillLine - 14)}

				<!-- LLM panel + next-token distribution -->
				<rect x="638" y="244" width="304" height="282" rx="18" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
				<text x="790" y="270" text-anchor="middle" font-family="var(--mono)" font-size="12" font-weight="600" letter-spacing="0.16em" fill={PAPER}>LLM</text>
				<text x="790" y="289" text-anchor="middle" font-family="var(--serif)" font-size="11.5" font-style="italic" fill={MUTED}>scores every possible next token</text>
				<text x="656" y="314" font-family="var(--mono)" font-size="10" fill={FAINT}>given the context, the next token is likely:</text>

				<rect x="650" y="322" width="288" height="23" rx="5" fill={LINE_B} opacity="0.5" />
				{#each DIST as d, i}
					{@const y = 334 + i * 27}
					{@const w = chipW(d.tok)}
					{@const barW = d.p * 175}
					<g transform="translate({662 + w / 2}, {y})">
						<rect x={-w / 2} y="-11" width={w} height="22" rx="5" fill="rgba(255,157,77,0.12)" stroke={WARM} stroke-width="1" />
						<text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="11" font-weight="600" fill={WARM}>{d.tok}</text>
					</g>
					<rect x="752" y={y - 5} width={barW} height="10" rx="3" fill={i === 0 ? WARM : LINE_B} />
					<text x="902" y={y + 1} text-anchor="end" dominant-baseline="middle" font-family="var(--mono)" font-size="11" fill={MUTED}>{d.p.toFixed(2)}</text>
					{#if i === 0}
						<text x="920" y={y + 1} text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="12" font-weight="600" fill={WARM}>✓</text>
					{/if}
				{/each}
				<text x="705" y="412" text-anchor="middle" font-family="var(--mono)" font-size="12" fill={FAINT}>⋯</text>

				<line x1="652" y1="448" x2="928" y2="448" stroke={LINE} stroke-width="1" />
				<text x="656" y="476" font-family="var(--mono)" font-size="10.5" fill={FAINT}>output:</text>
				{#each OUT as t, i}
					{@const p = outPos[i]}
					<g transform="translate({p.x}, 472)">
						<rect x={-p.w / 2} y="-11" width={p.w} height="22" rx="5" fill="rgba(255,157,77,0.12)" stroke={WARM} stroke-width="1" />
						<text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="11" font-weight="600" fill={WARM}>{t}</text>
					</g>
				{/each}
				<rect x={caretX} y="460" width="4" height="24" rx="1" fill={WARM} class:blink={!reduced} />
				<text x="790" y="506" text-anchor="middle" font-family="var(--mono)" font-size="10" fill={FAINT}>one token at a time</text>

				<!-- focus spotlight (bright-line, never an accent) -->
				{#if hl}
					<rect
						x={hl.x}
						y={hl.y}
						width={hl.w}
						height={hl.h}
						rx={hl.rx}
						fill="none"
						stroke={PAPER}
						stroke-width="1.5"
						stroke-dasharray="5 6"
						opacity="0.5"
						style:transition={reduced ? 'none' : 'opacity .5s ease'}
					/>
				{/if}
			</g>
		</svg>

		<figcaption class="caption">
			<span class="eyebrow caption-label">{current.label}</span>
			<span class="caption-text">{current.caption}</span>
		</figcaption>
	</figure>

	<!-- camera stops -->
	<nav class="stops" aria-label="Diagram views">
		<button class="arrow" onclick={() => go(stop - 1)} aria-label="Previous view">‹</button>
		<div class="stop-list">
			{#each STOPS as st, i}
				<button class="stop" class:active={i === stop} onclick={() => go(i)}>{st.label}</button>
			{/each}
		</div>
		<button class="arrow" onclick={() => go(stop + 1)} aria-label="Next view">›</button>
	</nav>

	<p class="disclaimer note">
		Illustrative: token counts and probabilities are made up, and zoom is click-driven in this
		preview. In the full guide these same discrete camera stops are triggered by scroll, and the
		token flow honors reduced-motion.
	</p>
</section>

<style>
	.hero {
		max-width: 64rem;
		margin: 0 auto;
		padding: clamp(2rem, 6vw, 4.5rem) clamp(1rem, 4vw, 2rem) 4rem;
	}

	.intro {
		max-width: 42rem;
	}

	.eyebrow {
		color: var(--cool);
	}

	#hero-title {
		font-size: clamp(2.4rem, 7vw, 4rem);
		margin: 0.5rem 0 0.9rem;
	}

	.lede {
		font-size: clamp(1.1rem, 2.6vw, 1.3rem);
		color: var(--muted);
		max-width: var(--reading);
	}

	.stage {
		margin: clamp(1.6rem, 4vw, 2.4rem) 0 0;
		border: 1px solid var(--line);
		border-radius: 18px;
		overflow: hidden;
		background: linear-gradient(180deg, #0c1019, var(--surface));
		box-shadow:
			0 30px 60px -40px rgba(0, 0, 0, 0.8),
			inset 0 1px 0 rgba(232, 230, 223, 0.03);
	}

	.stage svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.caption {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		flex-wrap: wrap;
		padding: 1rem 1.2rem;
		border-top: 1px solid var(--line);
		min-height: 64px;
	}

	.caption-label {
		color: var(--paper);
		white-space: nowrap;
	}

	.caption-text {
		font-family: var(--serif);
		font-size: 1rem;
		line-height: 1.55;
		color: var(--muted);
		flex: 1;
		min-width: 16rem;
	}

	.stops {
		margin-top: 1.1rem;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.stop-list {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.stop {
		font-family: var(--mono);
		font-size: 0.74rem;
		letter-spacing: 0.04em;
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--muted);
		padding: 0.5rem 0.85rem;
		border-radius: 22px;
		cursor: pointer;
		transition:
			border-color 0.18s ease,
			color 0.18s ease,
			transform 0.18s ease;
	}

	.stop:hover {
		border-color: var(--line-bright);
		color: var(--paper);
		transform: translateY(-1px);
	}

	.stop.active {
		border-color: var(--line-bright);
		background: var(--line-bright);
		color: var(--paper);
	}

	.arrow {
		font-family: var(--mono);
		font-size: 1rem;
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--muted);
		width: 34px;
		height: 34px;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			border-color 0.18s ease,
			color 0.18s ease;
	}

	.arrow:hover {
		border-color: var(--line-bright);
		color: var(--paper);
	}

	.note {
		margin-top: 1.4rem;
		max-width: 44rem;
	}

	:global(.blink) {
		animation: il-blink 1.05s steps(1) infinite;
	}

	@keyframes il-blink {
		0%,
		45% {
			opacity: 1;
		}
		55%,
		100% {
			opacity: 0.12;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.blink) {
			animation: none;
		}
	}
</style>
