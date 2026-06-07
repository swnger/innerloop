<script lang="ts">
	import { onMount } from 'svelte';

	const SURFACE = '#11151F';
	const LINE = '#1E2533';
	const LINE_B = '#2C3650';
	const PAPER = '#E8E6DF';
	const MUTED = '#8A93A6';
	const FAINT = '#5A6275';
	const COOL = '#38E1C6';
	const WARM = '#FF9D4D';

	const CX = 550;
	const CY = 315;

	type Stop = { key: string; label: string; fx: number; fy: number; z: number; caption: string };
	type CodeLine = { text: string; className?: string; note?: string };

	const STOPS: Stop[] = [
		{
			key: 'whole',
			label: 'Whole cycle',
			fx: 550,
			fy: 315,
			z: 1,
			caption:
				'One turn, in order: the agent appends your input, sends the entire context window to the model, receives generated tokens, then appends them for the next call.'
		},
		{
			key: 'inner',
			label: 'Agent turn',
			fx: 214,
			fy: 353,
			z: 2,
			caption:
				'The user interaction is the first and last line of the same routine. Inside it, the tool loop can call the model several times before returning one answer.'
		},
		{
			key: 'context',
			label: 'Context',
			fx: 538,
			fy: 354,
			z: 2.4,
			caption:
				'Fixed instructions are re-sent unchanged. Conversation, user input, tool output, and model responses are dynamic layers that accumulate during the turn.'
		},
		{
			key: 'llm',
			label: 'Transformer',
			fx: 864,
			fy: 317,
			z: 1.95,
			caption:
				'Tokens become embeddings, pass through repeated decoder blocks with causal self-attention and MLPs, then a final projection scores the next token. Repeat to form a response.'
		}
	];

	const CODE: CodeLine[] = [
		{ text: 'turn(user_message):' },
		{ text: '  context.append(user_message)', className: 'code-input', note: 'input' },
		{ text: '  while True:' },
		{ text: '    response = LLM(context)', className: 'code-call', note: 'send all' },
		{ text: '    context.append(response)', className: 'code-append', note: 'append' },
		{ text: '    if response.tool_call:' },
		{ text: '      result = run_tool(response)', note: 'act' },
		{ text: '      context.append(result)', note: 'loop' },
		{ text: '    else: return response', className: 'code-return', note: 'to user' }
	];

	const STRATA = [
		{ key: 'response', label: 'model response', detail: 'new', y: 266, h: 34, fill: '#30394C', dynamic: true, response: true },
		{ key: 'user', label: 'user input', detail: 'new', y: 302, h: 34, fill: '#2C3C56', dynamic: true, user: true },
		{ key: 'tool', label: 'tool output', detail: 'turn', y: 338, h: 44, fill: '#26344A', dynamic: true },
		{ key: 'history', label: 'conversation', detail: 'history', y: 384, h: 34, fill: '#202B3E', dynamic: true },
		{ key: 'tools', label: 'tool definitions', detail: 'fixed', y: 420, h: 54, fill: '#1B2434', fixed: true },
		{ key: 'system', label: 'system prompt', detail: 'fixed', y: 476, h: 34, fill: '#171D2A', fixed: true }
	];

	const BLOCKS = [
		{ y: 356, label: 'LAYER 1' },
		{ y: 272, label: 'LAYER 2' },
		{ y: 188, label: 'LAYER N' }
	];

	const HL_MAP: Record<string, { x: number; y: number; w: number; h: number; rx: number }> = {
		inner: { x: 38, y: 154, w: 352, h: 380, rx: 20 },
		context: { x: 442, y: 168, w: 188, h: 360, rx: 14 },
		llm: { x: 674, y: 74, w: 382, h: 470, rx: 20 }
	};

	let stageEl: HTMLElement;
	let stop = $state(0);
	let reduced = $state(false);
	let cam = $state({ x: 0, y: 0, z: 1 });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let gsap: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let cameraTween: any;

	const targetOf = (i: number) => {
		const target = STOPS[i];
		return { x: CX - target.z * target.fx, y: CY - target.z * target.fy, z: target.z };
	};

	function go(i: number) {
		stop = (i + STOPS.length) % STOPS.length;
		const target = targetOf(stop);
		if (reduced || !gsap) {
			cam = target;
			return;
		}
		cameraTween?.kill();
		cameraTween = gsap.to(cam, { ...target, duration: 0.9, ease: 'power3.inOut' });
	}

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		reduced = media.matches;
		const onChange = () => {
			reduced = media.matches;
			window.location.reload();
		};
		media.addEventListener('change', onChange);
		cam = targetOf(0);

		let context: { revert: () => void } | undefined;
		let disposed = false;

		Promise.all([import('gsap'), import('gsap/MotionPathPlugin')]).then(([core, motion]) => {
			if (disposed) return;
			gsap = core.gsap ?? core.default;
			const MotionPathPlugin = motion.MotionPathPlugin ?? motion.default;
			gsap.registerPlugin(MotionPathPlugin);
			context = gsap.context(() => {
				const q = gsap.utils.selector(stageEl);
				const lineBase = { opacity: 0.42 };
				gsap.set(q('.code-line'), lineBase);
				gsap.set(q('.flow-chip'), { opacity: 0 });
				gsap.set(q('.user-band, .response-band'), { scaleY: 0, transformOrigin: '50% 100%' });
				gsap.set(q('.transformer-step'), { opacity: 0.32 });
				gsap.set(q('.generated-token'), { opacity: 0.35 });

				if (reduced) {
					gsap.set(q('.user-band, .response-band'), { scaleY: 1 });
					gsap.set(q('.transformer-step, .generated-token'), { opacity: 1 });
					return;
				}

				const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
				tl
					.set(q('.code-line'), lineBase)
					.set(q('.flow-chip'), { opacity: 0 })
					.set(q('.user-band, .response-band'), { scaleY: 0 })
					.set(q('.transformer-step'), { opacity: 0.32 })
					.set(q('.generated-token'), { opacity: 0.35 })
					.to(q('.code-input'), { opacity: 1, duration: 0.25 })
					.set(q('.input-chip'), { opacity: 1 })
					.to(q('.input-chip'), {
						duration: 1,
						ease: 'power1.inOut',
						motionPath: { path: '#input-path', align: '#input-path', alignOrigin: [0.5, 0.5] }
					})
					.to(q('.user-band'), { scaleY: 1, duration: 0.45, ease: 'power2.out' }, '-=0.2')
					.to(q('.input-chip'), { opacity: 0, duration: 0.15 }, '<')
					.to(q('.code-input'), lineBase, '+=0.15')
					.to(q('.code-call'), { opacity: 1, duration: 0.25 })
					.to(q('.tank-shell'), { stroke: PAPER, duration: 0.25, yoyo: true, repeat: 1 })
					.set(q('.context-chip'), { opacity: 1 })
					.to(q('.context-chip'), {
						duration: 1.15,
						ease: 'power1.inOut',
						motionPath: { path: '#context-path', align: '#context-path', alignOrigin: [0.5, 0.5] }
					})
					.to(q('.context-chip'), { opacity: 0, duration: 0.15 })
					.to(q('.embedding-step'), { opacity: 1, duration: 0.35 }, '<')
					.to(q('.block-1'), { opacity: 1, duration: 0.38 })
					.to(q('.block-2'), { opacity: 1, duration: 0.38 })
					.to(q('.block-n'), { opacity: 1, duration: 0.38 })
					.to(q('.logits-step'), { opacity: 1, duration: 0.35 })
					.to(q('.generated-token'), { opacity: 1, duration: 0.25 })
					.set(q('.output-chip'), { opacity: 1 })
					.to(q('.output-chip'), {
						duration: 1.35,
						ease: 'power1.inOut',
						motionPath: { path: '#return-path', align: '#return-path', alignOrigin: [0.5, 0.5] }
					})
					.to(q('.response-band'), { scaleY: 1, duration: 0.45, ease: 'power2.out' }, '-=0.22')
					.to(q('.output-chip'), { opacity: 0, duration: 0.15 }, '<')
					.to(q('.code-call'), lineBase, '<')
					.to(q('.code-append'), { opacity: 1, duration: 0.25 }, '<')
					.to(q('.code-append'), lineBase, '+=0.45')
					.to(q('.code-return'), { opacity: 1, duration: 0.25 })
					.to({}, { duration: 1.4 });
			}, stageEl);
		});

		return () => {
			disposed = true;
			context?.revert();
			media.removeEventListener('change', onChange);
		};
	});

	const current = $derived(STOPS[stop]);
	const camTransform = $derived(`translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`);
	const hl = $derived(HL_MAP[current.key]);
</script>

<section id="machine" class="hero" aria-labelledby="hero-title">
	<div class="intro">
		<p class="eyebrow">The whole machine</p>
		<h1 id="hero-title">One context window.<br />One continuous cycle.</h1>
		<p class="lede">
			Watch a complete model call: input is appended, the whole context is processed by a
			transformer, and generated output returns to become context for the next call.
		</p>
	</div>

	<figure class="stage" class:reduced bind:this={stageEl}>
		<svg
			viewBox="0 0 1100 630"
			role="img"
			aria-label="A coding agent appends user input to a stratified context window, sends the whole context to a decoder-only transformer, and appends the generated response back to the context."
		>
			<defs>
				<marker id="arrow-cool" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
					<path d="M0,0 L10,5 L0,10 z" fill={COOL} />
				</marker>
				<marker id="arrow-warm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
					<path d="M0,0 L10,5 L0,10 z" fill={WARM} />
				</marker>
				<marker id="arrow-faint" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
					<path d="M0,0 L10,5 L0,10 z" fill={FAINT} />
				</marker>
				<pattern id="hero-dots" width="26" height="26" patternUnits="userSpaceOnUse">
					<circle cx="1" cy="1" r="1" fill={LINE} opacity="0.55" />
				</pattern>
				<pattern id="fixed-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<line x1="0" y1="0" x2="0" y2="7" stroke={PAPER} stroke-width="1" opacity="0.05" />
				</pattern>
			</defs>

			<rect width="1100" height="630" fill="url(#hero-dots)" />

			<g style:transform={camTransform} style="transform-box: view-box; transform-origin: 0 0;">
				<!-- Paths stay visible as the static fallback and drive the animated particles. -->
				<path id="input-path" d="M 386 317 L 455 317" fill="none" stroke={COOL} stroke-width="1.25" opacity="0.38" marker-end="url(#arrow-cool)" />
				<path id="context-path" d="M 620 448 C 650 448 665 468 704 468" fill="none" stroke={COOL} stroke-width="1.25" opacity="0.38" marker-end="url(#arrow-cool)" />
				<path id="return-path" d="M 948 154 C 930 105 676 106 620 280" fill="none" stroke={WARM} stroke-width="1.25" opacity="0.38" marker-end="url(#arrow-warm)" />

				<!-- One user turn, with the outer interaction integrated into the routine. -->
				<rect x="42" y="158" width="340" height="370" rx="18" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
				<text x="66" y="190" font-family="var(--mono)" font-size="11" font-weight="600" letter-spacing="0.16em" fill={PAPER}>AGENT · ONE USER TURN</text>
				<text x="66" y="216" font-family="var(--mono)" font-size="10" fill={FAINT}>user_message = "fix the failing test"</text>
				<line x1="66" y1="230" x2="358" y2="230" stroke={LINE} />

				{#each CODE as line, i}
					{@const y = 254 + i * 27}
					<g class="code-line {line.className ?? ''}">
						<text x="66" {y} xml:space="preserve" font-family="var(--mono)" font-size="12.2" fill={i === 0 || i === 2 ? PAPER : MUTED}>{line.text}</text>
						{#if line.note}
							<text x="356" {y} text-anchor="end" font-family="var(--mono)" font-size="9.5" fill={FAINT}>{'# ' + line.note}</text>
						{/if}
					</g>
				{/each}

				<line x1="66" y1="500" x2="358" y2="500" stroke={LINE} />
				<text x="66" y="516" font-family="var(--mono)" font-size="9.5" fill={FAINT}>tool calls re-enter the same while-loop</text>

				<!-- Context window: fixed base plus dynamic per-turn layers. -->
				<text x="536" y="184" text-anchor="middle" font-family="var(--mono)" font-size="11" font-weight="600" letter-spacing="0.12em" fill={PAPER}>CONTEXT WINDOW</text>
				<text x="536" y="202" text-anchor="middle" font-family="var(--mono)" font-size="9" fill={FAINT}>what the model can see · 4.6k / 8k</text>
				<rect class="tank-shell" x="456" y="218" width="160" height="296" rx="9" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
				<line x1="450" y1="238" x2="622" y2="238" stroke={FAINT} stroke-width="1" stroke-dasharray="3 4" />
				<text x="626" y="241" font-family="var(--mono)" font-size="8" fill={FAINT}>max</text>

				{#each STRATA as band}
					<g class:user-band={band.user} class:response-band={band.response}>
						<rect x="461" y={band.y} width="150" height={band.h - 2} rx="3" fill={band.fill} stroke={LINE} stroke-width="0.8" />
						{#if band.fixed}
							<rect x="461" y={band.y} width="150" height={band.h - 2} rx="3" fill="url(#fixed-hatch)" />
						{/if}
						{#if band.response}
							<rect x="461" y={band.y} width="3" height={band.h - 2} fill={WARM} />
						{/if}
						<text x="470" y={band.y + band.h / 2} dominant-baseline="middle" font-family="var(--mono)" font-size="9.5" fill={band.response ? WARM : band.fixed ? MUTED : PAPER}>{band.label}</text>
						<text x="603" y={band.y + band.h / 2} text-anchor="end" dominant-baseline="middle" font-family="var(--mono)" font-size="8" fill={FAINT}>{band.detail}</text>
					</g>
				{/each}

				<path d="M 449 420 h -7 v 88 h 7" fill="none" stroke={FAINT} stroke-width="1" />
				<text x="435" y="468" text-anchor="middle" transform="rotate(-90 435 468)" font-family="var(--mono)" font-size="8" letter-spacing="0.08em" fill={FAINT}>FIXED · EVERY CALL</text>
				<path d="M 449 266 h -7 v 152 h 7" fill="none" stroke={MUTED} stroke-width="1" />
				<text x="435" y="342" text-anchor="middle" transform="rotate(-90 435 342)" font-family="var(--mono)" font-size="8" letter-spacing="0.08em" fill={MUTED}>DYNAMIC · THIS TURN</text>

				<!-- A compact but structurally faithful decoder-only transformer. -->
				<rect x="680" y="80" width="368" height="456" rx="18" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
				<text x="704" y="110" font-family="var(--mono)" font-size="12" font-weight="600" letter-spacing="0.16em" fill={PAPER}>LLM</text>
				<text x="1024" y="110" text-anchor="end" font-family="var(--mono)" font-size="9.5" fill={FAINT}>decoder-only transformer</text>

				<g class="transformer-step logits-step">
					<rect x="730" y="132" width="90" height="42" rx="6" fill="#1B2434" stroke={LINE_B} />
					<text x="775" y="149" text-anchor="middle" font-family="var(--mono)" font-size="8.5" fill={MUTED}>FINAL NORM</text>
					<text x="775" y="163" text-anchor="middle" font-family="var(--mono)" font-size="8.5" fill={MUTED}>+ VOCAB LOGITS</text>
					<line x1="820" y1="153" x2="850" y2="153" stroke={FAINT} marker-end="url(#arrow-faint)" />
					<text x="864" y="136" font-family="var(--mono)" font-size="8" fill={FAINT}>sample next token</text>
				</g>
				<g class="generated-token">
					<rect x="852" y="142" width="78" height="24" rx="5" fill="rgba(255,157,77,0.12)" stroke={WARM} />
					<text x="891" y="155" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="10" font-weight="600" fill={WARM}>patch</text>
				</g>

				{#each BLOCKS as block, i}
					<g class="transformer-step block-{i === 0 ? '1' : i === 1 ? '2' : 'n'}">
						<rect x="730" y={block.y} width="274" height="66" rx="7" fill="#171D2A" stroke={LINE_B} />
						<text x="746" y={block.y + 14} font-family="var(--mono)" font-size="7.5" font-weight="600" fill={FAINT}>{block.label}</text>
						<line x1="748" y1={block.y + 20} x2="748" y2={block.y + 56} stroke={MUTED} stroke-width="1.5" />
						<rect x="766" y={block.y + 8} width="112" height="22" rx="4" fill="#202B3E" stroke={LINE} />
						<text x="822" y={block.y + 20} text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="8.2" fill={MUTED}>CAUSAL ATTENTION</text>
						<rect x="766" y={block.y + 36} width="112" height="22" rx="4" fill="#26344A" stroke={LINE} />
						<text x="822" y={block.y + 48} text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="8.2" fill={MUTED}>FEED-FORWARD MLP</text>
						<path d={`M 886 ${block.y + 19} h 28 v 28 h -28`} fill="none" stroke={FAINT} stroke-width="1" />
						<text x="926" y={block.y + 36} font-family="var(--mono)" font-size="7.5" fill={FAINT}>ADD + NORM</text>
						<path d={`M 748 ${block.y + 56} C 704 ${block.y + 56}, 704 ${block.y + 10}, 748 ${block.y + 10}`} fill="none" stroke={FAINT} stroke-width="1" stroke-dasharray="3 3" />
						<text x="970" y={block.y + 56} text-anchor="end" font-family="var(--mono)" font-size="7" fill={FAINT}>residual stream</text>
					</g>
				{/each}

				<text x="866" y="260" text-anchor="middle" font-family="var(--mono)" font-size="14" fill={FAINT}>⋮</text>
				<g class="transformer-step embedding-step">
					<rect x="730" y="450" width="274" height="50" rx="7" fill="#1B2434" stroke={LINE_B} />
					<text x="748" y="470" font-family="var(--mono)" font-size="8.5" fill={MUTED}>TOKEN + POSITION EMBEDDINGS</text>
					<text x="748" y="487" font-family="var(--mono)" font-size="8" fill={FAINT}>system · tools · history · user · tool output</text>
				</g>
				<path d="M 716 474 L 730 474" fill="none" stroke={COOL} stroke-width="1.2" marker-end="url(#arrow-cool)" />
				<path d="M 867 450 L 867 424" fill="none" stroke={FAINT} marker-end="url(#arrow-faint)" />
				<path d="M 867 356 L 867 338" fill="none" stroke={FAINT} marker-end="url(#arrow-faint)" />
				<path d="M 867 272 L 867 254" fill="none" stroke={FAINT} marker-end="url(#arrow-faint)" />
				<path d="M 867 188 L 820 174" fill="none" stroke={FAINT} marker-end="url(#arrow-faint)" />
				<text x="1024" y="520" text-anchor="end" font-family="var(--mono)" font-size="8.5" fill={FAINT}>same weights · repeated for each generated token</text>

				<!-- Animated particles. Token text never exposes tokenizer whitespace markers. -->
				<g class="flow-chip input-chip" style="filter: drop-shadow(var(--glow-cool));">
					<rect x="-26" y="-10" width="52" height="20" rx="5" fill="rgba(56,225,198,0.12)" stroke={COOL} />
					<text y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="9" font-weight="600" fill={COOL}>input</text>
				</g>
				<g class="flow-chip context-chip" style="filter: drop-shadow(var(--glow-cool));">
					<rect x="-38" y="-18" width="76" height="36" rx="5" fill="rgba(56,225,198,0.1)" stroke={COOL} />
					<line x1="-27" y1="-8" x2="25" y2="-8" stroke={COOL} opacity="0.65" />
					<line x1="-27" y1="0" x2="20" y2="0" stroke={COOL} opacity="0.5" />
					<line x1="-27" y1="8" x2="28" y2="8" stroke={COOL} opacity="0.35" />
					<text y="29" text-anchor="middle" font-family="var(--mono)" font-size="8" fill={COOL}>whole context</text>
				</g>
				<g class="flow-chip output-chip" style="filter: drop-shadow(var(--glow-warm));">
					<rect x="-27" y="-10" width="54" height="20" rx="5" fill="rgba(255,157,77,0.12)" stroke={WARM} />
					<text y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="9" font-weight="600" fill={WARM}>patch</text>
				</g>

				{#if hl}
					<rect x={hl.x} y={hl.y} width={hl.w} height={hl.h} rx={hl.rx} fill="none" stroke={PAPER} stroke-width="1.3" stroke-dasharray="5 6" opacity="0.5" />
				{/if}
			</g>
		</svg>

		<figcaption class="caption">
			<span class="eyebrow caption-label">{current.label}</span>
			<span class="caption-text">{current.caption}</span>
		</figcaption>
	</figure>

	<nav class="stops" aria-label="Diagram views">
		<button class="arrow" onclick={() => go(stop - 1)} aria-label="Previous view">‹</button>
		<div class="stop-list">
			{#each STOPS as item, i}
				<button class="stop" class:active={i === stop} onclick={() => go(i)}>{item.label}</button>
			{/each}
		</div>
		<button class="arrow" onclick={() => go(stop + 1)} aria-label="Next view">›</button>
	</nav>

	<p class="disclaimer note">
		Illustrative: layer count, token counts, and contents are simplified. The transformer structure and
		context flow are representative; reduced-motion shows the same argument without the sequence.
	</p>
</section>

<style>
	.hero {
		max-width: 72rem;
		margin: 0 auto;
		padding: clamp(2rem, 6vw, 4.5rem) clamp(1rem, 4vw, 2rem) 4rem;
	}

	.intro {
		max-width: 44rem;
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

	.stop,
	.arrow {
		font-family: var(--mono);
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--muted);
		cursor: pointer;
	}

	.stop {
		font-size: 0.74rem;
		letter-spacing: 0.04em;
		padding: 0.5rem 0.85rem;
		border-radius: 22px;
	}

	.arrow {
		font-size: 1rem;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stop:hover,
	.arrow:hover {
		border-color: var(--line-bright);
		color: var(--paper);
		transform: translateY(-1px);
	}

	.stop.active {
		border-color: var(--line-bright);
		background: var(--line-bright);
		color: var(--paper);
	}

	.note {
		margin-top: 1.4rem;
		max-width: 48rem;
	}

	@media (max-width: 700px) {
		.hero {
			padding-inline: 0.75rem;
		}

		.caption {
			padding-inline: 1rem;
		}

		.stops {
			padding-inline: 0.25rem;
		}
	}
</style>
