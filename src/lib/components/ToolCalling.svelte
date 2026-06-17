<script lang="ts">
	import { onMount, tick } from 'svelte';

	/* ============================================================
	   Chapter 05 — Tool calling ("the hands")
	   The question: how can an LLM call tools on my machine if it
	   can only output text? Answer: it can't. It only ever emits
	   tokens. A "tool call" is just text in an agreed-upon shape;
	   the agent/harness parses it, runs the real function, and
	   feeds the result back. The model never crosses the line.

	   1. Handoff — the warm "model response" band from Ch.4's tank
	      lifts out and unfolds into a JSON tool call (one-shot on
	      entry: the transition into the chapter).
	   2. Exchange — reader-stepped sticky stage: the full round trip
	      agent ⇄ LLM, with a YOUR MACHINE box only the agent touches.
	   3. MCP — a sticky tank that grows as servers register tools,
	      showing the context-window cost (callback to Ch.4).
	   Degrades to static + prose without JS.
	============================================================ */

	const COOL = 'var(--cool)',
		WARM = 'var(--warm)',
		PAPER = 'var(--paper)',
		MUTED = 'var(--muted)',
		FAINT = 'var(--faint)',
		LINE = 'var(--line)',
		LINE_B = 'var(--line-bright)',
		BRAND = 'var(--brand-strong)',
		SURFACE = 'var(--diagram-surface)';

	/* ---- 2 · the exchange: one round trip, slowed down ---- */
	type Lit = 'agent' | 'llm' | 'machine' | 'both';
	type Accent = 'cool' | 'warm' | 'brand' | 'tools';
	type Stage = {
		k: string;
		title: string;
		body: string;
		dir: 'in' | 'out' | 'down' | null; // chip travel
		lit: Lit;
		cardLabel: string;
		accent: Accent;
		card: string[];
		note: string;
		valid?: boolean;
		boundary?: boolean;
	};

	const STAGES: Stage[] = [
		{
			k: 'the menu',
			title: 'First, the model is handed a menu',
			body: 'Before the turn, every tool is described to the model as a JSON schema — a name, what it does, and the exact shape of its arguments. This menu rides along in the context window, sent on every call.',
			dir: 'in',
			lit: 'llm',
			cardLabel: 'TOOL DEFINITION · part of the context',
			accent: 'tools',
			card: [
				'{ "name": "run_shell",',
				'  "description": "Run a shell command,',
				'                  return its output",',
				'  "input_schema": {',
				'    "type": "object",',
				'    "properties": {',
				'      "command": { "type": "string" } },',
				'    "required": ["command"] } }'
			],
			note: 'the model never saw your machine — only this description of it'
		},
		{
			k: 'it writes a tool call',
			title: 'The model writes a tool call — as text',
			body: 'It does the only thing it can do: predict tokens (Chapter 3). Here those tokens spell a small, structured block naming a tool and its arguments. Nothing has run. It is text in the shape the schema described.',
			dir: 'out',
			lit: 'llm',
			cardLabel: 'MODEL OUTPUT · just predicted tokens',
			accent: 'warm',
			card: ['{', '  "name": "run_shell",', '  "input": { "command": "pytest -q" }', '}'],
			note: 'a "tool call" is not an action — it is a request, written in text'
		},
		{
			k: 'the agent reads it',
			title: 'The agent reads and checks it',
			body: 'The harness — your code, not the model — recognises the block, parses the JSON, and validates it against the schema. The model has stopped; the loop has the wheel now.',
			dir: null,
			lit: 'agent',
			cardLabel: 'AGENT · parse + validate against schema',
			accent: 'brand',
			card: ['{', '  "name": "run_shell",', '  "input": { "command": "pytest -q" }', '}', '', '✓ valid · matches run_shell schema'],
			note: 'the agent is the interpreter — it decides what the text means',
			valid: true
		},
		{
			k: 'the agent runs it',
			title: 'The agent runs it — on your machine',
			body: 'Now the agent actually executes the command: it opens a shell, runs it, reads the output. This is the step the model can never do. The model only emitted text; everything that touches your machine is the harness.',
			dir: 'down',
			lit: 'machine',
			cardLabel: 'YOUR MACHINE · the agent executes',
			accent: 'cool',
			card: ['$ pytest -q', '....                       [100%]', '1 passed in 0.42s'],
			note: 'the model never crosses this line — it has no shell, no files, no network',
			boundary: true
		},
		{
			k: 'the result goes back',
			title: 'The result is fed back — as text',
			body: 'The agent wraps the output as a tool result and appends it to the context, then calls the model again. To the model it is just more tokens to read, paired to the call it made.',
			dir: 'in',
			lit: 'llm',
			cardLabel: 'TOOL RESULT · appended to the context',
			accent: 'cool',
			card: ['{', '  "type": "tool_result",', '  "output": "1 passed in 0.42s"', '}'],
			note: 'observe → the loop feeds the world back to the model, in the only format it reads'
		},
		{
			k: 'this time, an answer',
			title: 'This time it answers — no tool call',
			body: 'With the result in context, the model predicts plain text instead of another tool block. The agent sees no tool call, stops looping, and returns the answer to you. Think → act → observe, closed.',
			dir: 'out',
			lit: 'agent',
			cardLabel: 'MODEL OUTPUT · plain text → returned to you',
			accent: 'warm',
			card: ['"The test passes now — the bug', ' was a missing null check."'],
			note: 'no tool call → the loop ends and the turn returns (Chapter 1)'
		}
	];

	const ACCENT: Record<Accent, string> = { cool: COOL, warm: WARM, brand: BRAND, tools: 'var(--cat-tools)' };

	let activeStage = $state(0);
	const stage = $derived(STAGES[activeStage]);
	const agentLit = $derived(stage.lit === 'agent' || stage.lit === 'both' || stage.lit === 'machine');
	const llmLit = $derived(stage.lit === 'llm' || stage.lit === 'both');
	const machineLit = $derived(stage.lit === 'machine');

	// Chapter 1's agent routine, reused verbatim so the loop reads as the same
	// machine. The detail view to the right is a zoom into run_tool()/has_tool_call.
	const CODE = [
		{ t: 'turn(user_message):', head: true },
		{ t: '  context.append(user_message)' },
		{ t: '  while True:', head: true },
		{ t: '    response = LLM(context)' },
		{ t: '    context.append(response)' },
		{ t: '    if not response.has_tool_call:' },
		{ t: '      return response' },
		{ t: '    out = run_tool(response.tool_call)' },
		{ t: '    context.append(out)' }
	];
	// per stage: which routine line is live, and whether the detail is a zoom-in
	const STAGE_CODE = [
		{ line: 3, zoom: false },
		{ line: 3, zoom: false },
		{ line: 5, zoom: true },
		{ line: 7, zoom: true },
		{ line: 8, zoom: true },
		{ line: 6, zoom: false }
	];
	const codeLine = $derived(STAGE_CODE[activeStage].line);
	const zoom = $derived(STAGE_CODE[activeStage].zoom);
	const codeY = $derived(202 + STAGE_CODE[activeStage].line * 16);

	/* ---- 3 · MCP: the tank, growing ---- */
	const VX = 70,
		VW = 150,
		FLOOR = 420,
		MAXY = 70,
		MAX = 8000;
	const mscale = (FLOOR - MAXY) / MAX;
	const BASE = { system: 450, history: 600, user: 450 };
	const TOOLDEF = [600, 1700, 3400, 6800];

	type McpStep = { title: string; body: string; servers: number; note: string };
	const MCP: McpStep[] = [
		{
			title: 'Without MCP, tools are wired in by hand',
			body: 'Every tool you want the agent to have, you define yourself — name, description, schema — and register it in code. Useful, but it does not scale past a handful.',
			servers: 0,
			note: 'a small, hand-picked menu'
		},
		{
			title: 'MCP is a standard plug for tools',
			body: 'An MCP server advertises a list of tools — each with a name, description, and JSON schema. The agent connects, asks for the list, and registers them all automatically. No bespoke wiring per tool.',
			servers: 2,
			note: 'tools/list → schemas register themselves into the context'
		},
		{
			title: 'Every tool rides in the window',
			body: 'Those schemas land in the tool-definitions layer — which is fixed and re-sent to the model on every single call (Chapter 4). Connect more servers and the layer keeps growing.',
			servers: 4,
			note: 'fixed cost · paid on every call, before any of your work'
		},
		{
			title: 'So be careful what you plug in',
			body: 'A dozen MCP servers can spend thousands of tokens before you have said a word — crowding the budget and pushing toward the limit. And a longer menu makes the model likelier to reach for the wrong tool. Connect deliberately; prune what you do not use.',
			servers: 6,
			note: 'attempted 8.3k / 8k → the menu alone is breaching the budget'
		}
	];

	const SERVERS = [
		{ name: 'filesystem', tools: 6 },
		{ name: 'github', tools: 11 },
		{ name: 'postgres', tools: 4 },
		{ name: 'slack', tools: 8 },
		{ name: 'gmail', tools: 7 },
		{ name: 'sentry', tools: 5 }
	];

	let activeMcp = $state(0);
	const mcp = $derived(MCP[activeMcp]);
	const toolUsed = $derived(BASE.system + BASE.history + BASE.user + TOOLDEF[activeMcp]);
	const overflow = $derived(toolUsed > MAX);
	const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));

	function mcpLayout(i: number) {
		const t = TOOLDEF[i];
		const hSys = BASE.system * mscale,
			hTool = t * mscale,
			hHist = BASE.history * mscale,
			hUser = BASE.user * mscale;
		const ySys = FLOOR - hSys;
		const yTool = ySys - hTool;
		const yHist = yTool - hHist;
		const yUser = yHist - hUser;
		const surface = Math.max(MAXY - 6, yUser);
		return { hSys, hTool, hHist, hUser, ySys, yTool, yHist, yUser, surface };
	}
	const lay = $derived(mcpLayout(activeMcp));

	let exchangeEl: HTMLElement;
	let mcpEl: HTMLElement;
	let handoffEl: HTMLElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let gsap: any;
	let stageRun = 0;
	let mcpRun = 0;

	const motionPath = (path: string) => ({ motionPath: { path, align: path, alignOrigin: [0.5, 0.5] } });

	async function goStage(i: number) {
		if (i === activeStage && i !== 0) return;
		const run = ++stageRun;
		activeStage = i;
		await tick();
		if (run !== stageRun || !gsap) return;

		const q = gsap.utils.selector(exchangeEl);
		// dim the prose, light the active step
		const prose = Array.from(document.querySelectorAll<HTMLElement>('.tc-step'));
		gsap.to(prose, { opacity: 0.3, duration: 0.3, overwrite: true });
		if (prose[i]) gsap.to(prose[i], { opacity: 1, duration: 0.3, overwrite: true });

		// card swaps instantly (reactive); fade for polish
		gsap.fromTo(q('.ex-card'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });

		// travelling chip on the rail
		const s = STAGES[i];
		if (s.dir === 'in') {
			gsap.set(q('.chip-cool'), { opacity: 1 });
			gsap.fromTo(q('.chip-cool'), { opacity: 1 }, { duration: 0.9, ease: 'power1.inOut', ...motionPath('#ex-cool'), onComplete: () => gsap.set(q('.chip-cool'), { opacity: 0 }) });
		} else if (s.dir === 'out') {
			gsap.set(q('.chip-warm'), { opacity: 1 });
			gsap.fromTo(q('.chip-warm'), { opacity: 1 }, { duration: 0.9, ease: 'power1.inOut', ...motionPath('#ex-warm'), onComplete: () => gsap.set(q('.chip-warm'), { opacity: 0 }) });
		} else if (s.dir === 'down') {
			gsap.set(q('.chip-act'), { opacity: 1 });
			gsap.fromTo(q('.chip-act'), { opacity: 1 }, { duration: 0.8, ease: 'power1.inOut', ...motionPath('#ex-act'), onComplete: () => gsap.set(q('.chip-act'), { opacity: 0 }) });
		}

		// soft pop on the active actor's outline
		const target = s.lit === 'machine' ? '.box-machine .box-shell' : s.lit === 'llm' ? '.box-llm .box-shell' : '.box-agent .box-shell';
		gsap.fromTo(q(target), { strokeWidth: 2.4 }, { strokeWidth: 1.5, duration: 0.6, ease: 'power2.out' });

		// boundary flare on the "run" stage
		if (s.boundary) {
			gsap.fromTo(q('.ex-boundary'), { opacity: 0.3 }, { opacity: 1, duration: 0.4, yoyo: true, repeat: 1 });
		}
	}

	async function goMcp(i: number) {
		if (i === activeMcp && i !== 0) return;
		const run = ++mcpRun;
		const prev = mcpLayout(activeMcp);
		activeMcp = i;
		await tick();
		if (run !== mcpRun || !gsap) return;

		const next = mcpLayout(i);
		const q = gsap.utils.selector(mcpEl);
		const tl = gsap.timeline({ defaults: { duration: 0.6, ease: 'power2.inOut' } });
		tl.fromTo(q('.tk-tool'), { attr: { y: prev.yTool, height: prev.hTool } }, { attr: { y: next.yTool, height: next.hTool } }, 0)
			.fromTo(q('.tk-tool-stripe'), { attr: { y: prev.yTool, height: prev.hTool } }, { attr: { y: next.yTool, height: next.hTool } }, 0)
			.fromTo(q('.tk-tool-label'), { attr: { y: prev.yTool + prev.hTool / 2 } }, { attr: { y: next.yTool + next.hTool / 2 } }, 0)
			.fromTo(q('.tk-hist'), { attr: { y: prev.yHist } }, { attr: { y: next.yHist } }, 0)
			.fromTo(q('.tk-user'), { attr: { y: prev.yUser } }, { attr: { y: next.yUser } }, 0)
			.fromTo(q('.tk-surface'), { attr: { y1: prev.surface, y2: prev.surface } }, { attr: { y1: next.surface, y2: next.surface } }, 0);

		const prose = Array.from(document.querySelectorAll<HTMLElement>('.tc-mcp-step'));
		gsap.to(prose, { opacity: 0.3, duration: 0.3, overwrite: true });
		if (prose[i]) gsap.to(prose[i], { opacity: 1, duration: 0.3, overwrite: true });

		// new server cards drop in
		gsap.fromTo(q('.mcp-server'), { opacity: 0.15, x: 10 }, { opacity: (idx: number) => (idx < MCP[i].servers ? 1 : 0.15), x: 0, duration: 0.5, stagger: 0.06 });

		if (i === MCP.length - 1) {
			gsap.fromTo(q('.tk-maxline'), { opacity: 0.5 }, { opacity: 1, duration: 0.3, yoyo: true, repeat: 3 });
		}
	}

	onMount(() => {
		let io: IntersectionObserver | undefined;
		let mio: IntersectionObserver | undefined;
		let hio: IntersectionObserver | undefined;
		let disposed = false;

		Promise.all([import('gsap'), import('gsap/MotionPathPlugin')]).then(([core, mp]) => {
			if (disposed) return;
			gsap = core.gsap ?? core.default;
			gsap.registerPlugin(mp.MotionPathPlugin ?? mp.default);

			// initial step emphasis
			gsap.set('.tc-step', { opacity: 0.3 });
			gsap.set('.tc-step:first-child', { opacity: 1 });
			gsap.set('.tc-mcp-step', { opacity: 0.3 });
			gsap.set('.tc-mcp-step:first-child', { opacity: 1 });
			gsap.set([exchangeEl.querySelector('.chip-cool'), exchangeEl.querySelector('.chip-warm'), exchangeEl.querySelector('.chip-act')], { opacity: 0 });

			io = new IntersectionObserver(
				(entries) => {
					for (const e of entries) {
						if (!e.isIntersecting) continue;
						const n = Number((e.target as HTMLElement).dataset.i);
						if (!Number.isNaN(n)) void goStage(n);
					}
				},
				{ rootMargin: '-45% 0px -45% 0px', threshold: 0 }
			);
			document.querySelectorAll('.tc-step').forEach((el) => io?.observe(el));

			mio = new IntersectionObserver(
				(entries) => {
					for (const e of entries) {
						if (!e.isIntersecting) continue;
						const n = Number((e.target as HTMLElement).dataset.i);
						if (!Number.isNaN(n)) void goMcp(n);
					}
				},
				{ rootMargin: '-45% 0px -45% 0px', threshold: 0 }
			);
			document.querySelectorAll('.tc-mcp-step').forEach((el) => mio?.observe(el));

			// handoff: one-shot transition into the chapter
			const playHandoff = () => {
				const q = gsap.utils.selector(handoffEl);
				const tl = gsap.timeline();
				tl.from(q('.ho-tank'), { opacity: 0, duration: 0.5, ease: 'power2.out' })
					.from(q('.ho-band'), { opacity: 0, x: -12, duration: 0.4, stagger: 0.06 }, '<0.1')
					.to(q('.ho-band-response'), { duration: 0.4 }) // beat
					.set(q('.ho-chip'), { opacity: 1 })
					.to(q('.ho-chip'), { duration: 1.0, ease: 'power1.inOut', ...motionPath('#ho-path') })
					.to(q('.ho-chip'), { opacity: 0, duration: 0.2 })
					.from(q('.ho-card'), { opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(1.6)' }, '<')
					.from(q('.ho-card-line'), { opacity: 0, y: 6, duration: 0.3, stagger: 0.05 }, '<0.15')
					.from('.tc-eyebrow', { opacity: 0, y: 12, duration: 0.4 }, '<0.1')
					.from('.tc-title', { opacity: 0, y: 16, duration: 0.5 }, '<0.1')
					.from('.tc-lede', { opacity: 0, y: 16, duration: 0.5 }, '<0.15');
			};
			hio = new IntersectionObserver(
				(entries) => {
					for (const e of entries) {
						if (e.isIntersecting) {
							playHandoff();
							hio?.disconnect();
						}
					}
				},
				{ rootMargin: '0px 0px -35% 0px', threshold: 0 }
			);
			hio.observe(handoffEl);
		});

		return () => {
			disposed = true;
			io?.disconnect();
			mio?.disconnect();
			hio?.disconnect();
		};
	});
</script>

<section id="tools" class="tc" data-chapter="05" aria-labelledby="tc-title">
	<!-- 1 · HANDOFF — pick the model-response band out of Ch.4's tank, unfold it -->
	<div class="tc-handoff" bind:this={handoffEl}>
		<figure class="tc-frame ho-frame">
			<svg viewBox="0 0 1000 420" role="img" aria-label="A context-window tank from the previous chapter; its warm 'model response' band lifts out and unfolds into a JSON tool call.">
				<defs>
					<pattern id="ho-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
						<line x1="0" y1="0" x2="0" y2="7" stroke={PAPER} stroke-width="1" opacity="0.06" />
					</pattern>
				</defs>

				<!-- the tank, echoed from Chapter 4 -->
				<g class="ho-tank">
					<text x="150" y="40" text-anchor="middle" font-family="var(--mono)" font-size="11" font-weight="600" letter-spacing="0.12em" fill={MUTED}>CONTEXT WINDOW</text>
					<text x="150" y="56" text-anchor="middle" font-family="var(--mono)" font-size="9" fill={FAINT}>from Chapter 4</text>
					<rect x="75" y="70" width="150" height="290" rx="8" fill={SURFACE} stroke={LINE_B} stroke-width="1.4" />
					<!-- strata bottom→top -->
					<g class="ho-band"><rect x="79" y="316" width="142" height="40" rx="3" fill="var(--cat-system-fill)" /><rect x="79" y="316" width="142" height="40" rx="3" fill="url(#ho-hatch)" /><rect x="79" y="316" width="3" height="40" fill="var(--cat-system)" /><text x="89" y="338" font-family="var(--mono)" font-size="9" fill="var(--cat-system)">system</text></g>
					<g class="ho-band"><rect x="79" y="262" width="142" height="50" rx="3" fill="var(--cat-tools-fill)" /><rect x="79" y="262" width="142" height="50" rx="3" fill="url(#ho-hatch)" /><rect x="79" y="262" width="3" height="50" fill="var(--cat-tools)" /><text x="89" y="290" font-family="var(--mono)" font-size="9" fill="var(--cat-tools)">tool definitions</text></g>
					<g class="ho-band"><rect x="79" y="208" width="142" height="50" rx="3" fill="var(--cat-history-fill)" /><rect x="79" y="208" width="3" height="50" fill="var(--cat-history)" /><text x="89" y="236" font-family="var(--mono)" font-size="9" fill="var(--cat-history)">history</text></g>
					<g class="ho-band"><rect x="79" y="166" width="142" height="38" rx="3" fill="var(--cat-user-fill)" /><rect x="79" y="166" width="3" height="38" fill="var(--cat-user)" /><text x="89" y="188" font-family="var(--mono)" font-size="9" fill="var(--cat-user)">user input</text></g>
					<g class="ho-band ho-band-response"><rect x="79" y="112" width="142" height="50" rx="3" fill="var(--cat-response-fill)" stroke={WARM} stroke-width="1.4" style="filter: drop-shadow(var(--glow-warm))" /><rect x="79" y="112" width="3" height="50" fill={WARM} /><text x="89" y="134" font-family="var(--mono)" font-size="9" fill={WARM}>model response</text><text x="89" y="150" font-family="var(--mono)" font-size="8.5" fill={FAINT}>tool call</text></g>
				</g>

				<!-- the unfolded tool call -->
				<g class="ho-card">
					<rect x="470" y="120" width="430" height="190" rx="6" fill="var(--surface)" stroke={WARM} stroke-width="1.2" />
					<rect x="470" y="120" width="430" height="26" rx="6" fill="var(--warm-soft)" />
					<text class="ho-card-line" x="486" y="137" font-family="var(--mono)" font-size="10.5" font-weight="600" letter-spacing="0.06em" fill={WARM}>WHAT THE MODEL ACTUALLY EMITTED — TEXT</text>
					<text class="ho-card-line" x="490" y="176" font-family="var(--mono)" font-size="14" fill={PAPER}>{'{'}</text>
					<text class="ho-card-line" x="490" y="202" font-family="var(--mono)" font-size="14" fill={PAPER}>  "name": "run_shell",</text>
					<text class="ho-card-line" x="490" y="228" font-family="var(--mono)" font-size="14" fill={PAPER}>  "input": {'{'} "command": "pytest -q" {'}'}</text>
					<text class="ho-card-line" x="490" y="254" font-family="var(--mono)" font-size="14" fill={PAPER}>{'}'}</text>
					<text class="ho-card-line" x="490" y="290" font-family="var(--mono)" font-size="10.5" fill={FAINT}>characters. not a command — a request for one.</text>
				</g>

				<!-- the band's journey -->
				<path id="ho-path" d="M 225 137 C 340 110, 380 200, 470 200" fill="none" stroke={WARM} stroke-width="1.1" opacity="0.22" stroke-dasharray="3 4" />
				<g class="ho-chip" style="filter: drop-shadow(var(--glow-warm))">
					<rect x="-34" y="-12" width="68" height="24" rx="5" fill="var(--warm-soft)" stroke={WARM} />
					<text y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="9" font-weight="600" fill={WARM}>tool call</text>
				</g>
			</svg>
		</figure>

		<div class="tc-head">
			<p class="eyebrow tc-eyebrow">Chapter 05 · the hands</p>
			<h2 id="tc-title" class="tc-title">It only writes text.<br />So who runs the command?</h2>
			<p class="tc-lede">
				The model has no shell, no files, no network — it can only emit tokens (Chapter 3). Yet
				agents run commands, edit files, hit APIs. The trick is that a “tool call” is just text in an
				agreed shape, and something else does the running.
			</p>
		</div>
	</div>

	<!-- 2 · THE EXCHANGE — reader-stepped round trip -->
	<div class="tc-scrolly">
		<figure class="tc-frame tc-sticky" bind:this={exchangeEl}>
			<svg viewBox="0 0 1000 600" role="img" aria-label="An agent on the left and an LLM on the right exchange text across a channel. The agent owns a YOUR MACHINE box (shell, files, network); a dashed boundary marks that the model never crosses into it. A central card shows the message currently on the wire as the round trip steps through schema, tool call, parse, run, result, and answer.">
				<defs>
					<marker id="tc-cool" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={COOL} /></marker>
					<marker id="tc-warm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={WARM} /></marker>
				</defs>

				<!-- rails -->
				<path id="ex-cool" d="M 330 215 C 470 195, 540 195, 668 205" fill="none" stroke={COOL} stroke-width="1.1" opacity="0.3" marker-end="url(#tc-cool)" />
				<path id="ex-warm" d="M 668 250 C 540 270, 470 270, 332 260" fill="none" stroke={WARM} stroke-width="1.1" opacity="0.3" marker-end="url(#tc-warm)" />
				<text x="500" y="188" text-anchor="middle" font-family="var(--mono)" font-size="8.5" fill={FAINT}>context in →</text>
				<text x="500" y="286" text-anchor="middle" font-family="var(--mono)" font-size="8.5" fill={FAINT}>← text out</text>
				<!-- internal "run" rail: agent → machine -->
				<path id="ex-act" d="M 170 360 C 170 392, 170 408, 170 432" fill="none" stroke={COOL} stroke-width="1.1" opacity="0.3" marker-end="url(#tc-cool)" />

				<!-- AGENT -->
				<g class="box-agent" style:opacity={agentLit ? 1 : 0.5}>
					<rect class="box-shell" x="40" y="120" width="260" height="240" rx="10" fill={SURFACE} stroke={agentLit ? LINE_B : LINE} stroke-width="1.5" />
					<text x="60" y="148" font-family="var(--mono)" font-size="11" font-weight="600" letter-spacing="0.14em" fill={PAPER}>AGENT · ONE TURN</text>
					<text x="282" y="148" text-anchor="end" font-family="var(--mono)" font-size="8.5" fill={FAINT}>↺ Chapter 1</text>
					<text x="60" y="164" font-family="var(--mono)" font-size="8.5" fill={FAINT}>the same routine, line by line</text>
					<line x1="60" y1="176" x2="280" y2="176" stroke={LINE} />
					<rect class="ex-codehi" x="54" y={codeY - 11} width="248" height="15" rx="2" fill="var(--brand-soft)" />
					{#each CODE as ln, i}
						<text x="60" y={202 + i * 16} font-family="var(--mono)" font-size="9" font-weight={i === codeLine ? 600 : 400} fill={i === codeLine ? BRAND : ln.head ? PAPER : MUTED} xml:space="preserve">{ln.t}</text>
					{/each}
				</g>

				<!-- YOUR MACHINE -->
				<g class="box-machine" style:opacity={machineLit ? 1 : 0.45}>
					<rect class="box-shell" x="40" y="432" width="260" height="118" rx="10" fill={machineLit ? 'var(--cat-tool-fill)' : SURFACE} stroke={machineLit ? COOL : LINE} stroke-width="1.5" style:filter={machineLit ? 'drop-shadow(var(--glow-cool))' : 'none'} />
					<text x="60" y="458" font-family="var(--mono)" font-size="11" font-weight="600" letter-spacing="0.14em" fill={machineLit ? COOL : MUTED}>YOUR MACHINE</text>
					<text x="60" y="484" font-family="var(--mono)" font-size="10" fill={machineLit ? PAPER : FAINT}>$ shell</text>
					<text x="150" y="484" font-family="var(--mono)" font-size="10" fill={machineLit ? PAPER : FAINT}>▤ files</text>
					<text x="60" y="508" font-family="var(--mono)" font-size="10" fill={machineLit ? PAPER : FAINT}>⇅ network</text>
					<text x="150" y="508" font-family="var(--mono)" font-size="10" fill={machineLit ? PAPER : FAINT}>⚙ processes</text>
					<text x="60" y="532" font-family="var(--mono)" font-size="9" fill={FAINT}>only the agent can reach here</text>
				</g>

				<!-- LLM -->
				<g class="box-llm" style:opacity={llmLit ? 1 : 0.5}>
					<rect class="box-shell" x="700" y="120" width="260" height="240" rx="10" fill={SURFACE} stroke={llmLit ? LINE_B : LINE} stroke-width="1.5" />
					<text x="720" y="150" font-family="var(--mono)" font-size="12" font-weight="600" letter-spacing="0.16em" fill={PAPER}>LLM</text>
					<text x="940" y="150" text-anchor="end" font-family="var(--mono)" font-size="9" fill={FAINT}>Chapter 3</text>
					<line x1="720" y1="162" x2="940" y2="162" stroke={LINE} />
					<text x="720" y="190" font-family="var(--mono)" font-size="10.5" fill={MUTED}>reads tokens →</text>
					<text x="720" y="214" font-family="var(--mono)" font-size="10.5" fill={MUTED}>predicts tokens →</text>
					<text x="720" y="244" font-family="var(--mono)" font-size="13" fill={PAPER}>text in · text out</text>
					<text x="720" y="286" font-family="var(--mono)" font-size="9.5" fill={FAINT}>no shell. no files.</text>
					<text x="720" y="304" font-family="var(--mono)" font-size="9.5" fill={FAINT}>no network. no memory.</text>
					<text x="720" y="332" font-family="var(--mono)" font-size="9.5" fill={MUTED}>it can only ever emit text</text>
				</g>

				<!-- the boundary the model never crosses -->
				<line class="ex-boundary" x1="640" y1="96" x2="640" y2="566" stroke={WARM} stroke-width="1.3" stroke-dasharray="5 5" opacity="0.55" />
				<text class="ex-boundary" x="654" y="556" font-family="var(--mono)" font-size="9" letter-spacing="0.06em" fill={WARM} opacity="0.8">the model never crosses this line ↑</text>

				<!-- zoom cue: the detail card is the inside of the live routine line -->
				<g class="ex-zoom" style:opacity={zoom ? 1 : 0}>
					<path d={`M 304 ${codeY} C 332 ${codeY}, 344 326, 356 326`} fill="none" stroke="var(--cat-tools)" stroke-width="1" stroke-dasharray="3 3" />
					<text x="316" y={codeY - 6} font-family="var(--mono)" font-size="8" letter-spacing="0.04em" fill="var(--cat-tools)">zoom in ↓</text>
				</g>

				<!-- the message on the wire -->
				<g class="ex-card">
					<rect x="358" y="318" width="284" height="218" rx="6" fill="var(--surface)" stroke={ACCENT[stage.accent]} stroke-width="1.2" />
					<rect x="358" y="318" width="4" height="218" fill={ACCENT[stage.accent]} />
					<rect x="358" y="318" width="284" height="24" fill={SURFACE} />
					<text x="374" y="334" font-family="var(--mono)" font-size="9" font-weight="600" letter-spacing="0.04em" fill={ACCENT[stage.accent]}>{stage.cardLabel}</text>
					<line x1="358" y1="342" x2="642" y2="342" stroke={LINE} />
					{#each stage.card as line, li}
						<text x="374" y={364 + li * 20} font-family="var(--mono)" font-size="10.5" fill={line.startsWith('✓') ? COOL : PAPER} xml:space="preserve">{line}</text>
					{/each}
				</g>

				<!-- travelling chips -->
				<g class="chip-cool" style="filter: drop-shadow(var(--glow-cool))"><rect x="-30" y="-11" width="60" height="22" rx="5" fill="var(--cool-soft)" stroke={COOL} /><text y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="8.5" font-weight="600" fill={COOL}>context</text></g>
				<g class="chip-warm" style="filter: drop-shadow(var(--glow-warm))"><rect x="-30" y="-11" width="60" height="22" rx="5" fill="var(--warm-soft)" stroke={WARM} /><text y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="8.5" font-weight="600" fill={WARM}>text</text></g>
				<g class="chip-act" style="filter: drop-shadow(var(--glow-cool))"><rect x="-22" y="-11" width="44" height="22" rx="5" fill="var(--cool-soft)" stroke={COOL} /><text y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="8.5" font-weight="600" fill={COOL}>run</text></g>
			</svg>
			<figcaption class="tc-note mono">{stage.note}</figcaption>
		</figure>

		<ol class="tc-steps">
			{#each STAGES as s, i}
				<li class="tc-step" data-i={i} aria-current={i === activeStage ? 'step' : undefined}>
					<span class="step-n mono">0{i + 1} · {s.k}</span>
					<h3>{s.title}</h3>
					<p>{s.body}</p>
				</li>
			{/each}
		</ol>
	</div>

	<div class="tc-seam" aria-hidden="true"><span class="seam-line"></span><span class="seam-tick"></span><span class="seam-line"></span></div>

	<!-- 3 · MCP -->
	<div class="tc-mcp-head">
		<p class="eyebrow">scaling the menu · MCP</p>
		<h2>One plug, many tools — and a hidden bill.</h2>
		<p class="tc-mcp-intro">
			MCP (the Model Context Protocol) is a standard way for outside services to hand an agent a list
			of tools. It makes adding capabilities trivial — which is exactly why it is easy to overload the
			context window.
		</p>
	</div>

	<div class="tc-scrolly tc-mcp-scrolly">
		<figure class="tc-frame tc-sticky" bind:this={mcpEl}>
			<svg viewBox="0 0 560 470" role="img" aria-label="A context-window tank. As MCP servers connect on the right, their tool schemas register into the tool-definitions layer, which grows until it breaches the budget line.">
				<defs>
					<pattern id="mcp-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
						<line x1="0" y1="0" x2="0" y2="7" stroke={PAPER} stroke-width="1" opacity="0.06" />
					</pattern>
				</defs>

				<!-- gauge -->
				<text x={VX} y="40" font-family="var(--mono)" font-size="12" fill={MUTED}>
					<tspan fill={overflow ? WARM : PAPER} font-weight="600">{fmt(toolUsed)}</tspan><tspan fill={FAINT}> / {fmt(MAX)} tokens</tspan>
				</text>

				<!-- vessel -->
				<rect x={VX} y={MAXY - 16} width={VW} height={FLOOR - (MAXY - 16)} rx="9" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
				<!-- max line -->
				<line class="tk-maxline" x1={VX - 6} y1={MAXY} x2={VX + VW + 6} y2={MAXY} stroke={overflow ? WARM : FAINT} stroke-width="1.2" stroke-dasharray="4 4" />
				<text x={VX + VW + 10} y={MAXY + 4} font-family="var(--mono)" font-size="10" fill={overflow ? WARM : FAINT}>max</text>

				<!-- strata -->
				<g>
					<rect class="tk-sys" x={VX + 4} y={lay.ySys} width={VW - 8} height={lay.hSys} rx="3" fill="var(--cat-system-fill)" /><rect x={VX + 4} y={lay.ySys} width="3" height={lay.hSys} fill="var(--cat-system)" />
					<!-- tool definitions: the growing band -->
					<rect class="tk-tool" x={VX + 4} y={lay.yTool} width={VW - 8} height={lay.hTool} rx="3" fill="var(--cat-tools-fill)" stroke="var(--cat-tools)" stroke-width="1" />
					<rect x={VX + 4} y={lay.yTool} width={VW - 8} height={lay.hTool} rx="3" fill="url(#mcp-hatch)" class="tk-tool-hatch" style="pointer-events:none" />
					<rect class="tk-tool-stripe" x={VX + 4} y={lay.yTool} width="3" height={lay.hTool} fill="var(--cat-tools)" />
					<text class="tk-tool-label" x={VX + 13} y={lay.yTool + lay.hTool / 2} dominant-baseline="middle" font-family="var(--mono)" font-size="10" fill="var(--cat-tools)">tool definitions</text>
					<rect class="tk-hist" x={VX + 4} y={lay.yHist} width={VW - 8} height={lay.hHist} rx="3" fill="var(--cat-history-fill)" /><rect class="tk-hist-stripe" x={VX + 4} y={lay.yHist} width="3" height={lay.hHist} fill="var(--cat-history)" />
					<rect class="tk-user" x={VX + 4} y={lay.yUser} width={VW - 8} height={lay.hUser} rx="3" fill="var(--cat-user-fill)" /><rect class="tk-user-stripe" x={VX + 4} y={lay.yUser} width="3" height={lay.hUser} fill="var(--cat-user)" />
				</g>
				<line class="tk-surface" x1={VX + 2} y1={lay.surface} x2={VX + VW - 2} y2={lay.surface} stroke={PAPER} stroke-width="1.2" opacity="0.4" />

				<!-- fixed bracket on tool definitions -->
				<path d={`M ${VX - 8} ${FLOOR - lay.hSys - lay.hTool} h -7 v ${lay.hTool} h 7`} fill="none" stroke={FAINT} />
				<text x={VX - 20} y={FLOOR - lay.hSys - lay.hTool / 2} text-anchor="middle" transform={`rotate(-90 ${VX - 20} ${FLOOR - lay.hSys - lay.hTool / 2})`} font-family="var(--mono)" font-size="8" letter-spacing="0.06em" fill={FAINT}>FIXED · EVERY CALL</text>

				<!-- MCP servers -->
				<text x="300" y="36" font-family="var(--mono)" font-size="10.5" font-weight="600" letter-spacing="0.1em" fill={PAPER}>MCP SERVERS</text>
				<text x="300" y="52" font-family="var(--mono)" font-size="9" fill={FAINT}>each advertises tools · name + schema</text>
				{#each SERVERS as srv, i}
					<g class="mcp-server" style:opacity={i < mcp.servers ? 1 : 0.15}>
						<rect x="300" y={66 + i * 40} width="210" height="32" rx="4" fill="var(--surface-raised)" stroke={i < mcp.servers ? 'var(--cat-tools)' : LINE} stroke-width="1" />
						<text x="312" y={86 + i * 40} font-family="var(--mono)" font-size="10.5" fill={i < mcp.servers ? PAPER : FAINT}>{srv.name}</text>
						<text x="498" y={86 + i * 40} text-anchor="end" font-family="var(--mono)" font-size="9" fill={i < mcp.servers ? 'var(--cat-tools)' : FAINT}>+{srv.tools} tools</text>
						{#if i < mcp.servers}
							<path d={`M 300 ${82 + i * 40} C 270 ${82 + i * 40}, 250 ${FLOOR - lay.hSys - lay.hTool / 2}, ${VX + VW + 4} ${FLOOR - lay.hSys - lay.hTool / 2}`} fill="none" stroke="var(--cat-tools)" stroke-width="0.8" opacity="0.28" />
						{/if}
					</g>
				{/each}

				<text x="300" y="438" font-family="var(--mono)" font-size="9.5" fill={FAINT}>tools/list → schemas register into</text>
				<text x="300" y="454" font-family="var(--mono)" font-size="9.5" fill={FAINT}>the fixed tool-definitions layer</text>
			</svg>
			<figcaption class="tc-note mono">{mcp.note}</figcaption>
		</figure>

		<ol class="tc-steps tc-mcp-steps">
			{#each MCP as s, i}
				<li class="tc-mcp-step" data-i={i} aria-current={i === activeMcp ? 'step' : undefined}>
					<span class="step-n mono">0{i + 1}</span>
					<h3>{s.title}</h3>
					<p>{s.body}</p>
				</li>
			{/each}
		</ol>
	</div>

	<!-- close + go deeper -->
	<div class="tc-outro">
		<p class="tc-outro-line">
			The model only ever emits text. The harness turns some of that text into actions, runs them,
			and feeds the results back. So the real lever is not the model — it is <em>what you put in
			front of it.</em>
		</p>

		<details class="deeper">
			<summary><span class="mono">Go deeper</span> — how the harness actually spots a tool call</summary>
			<div class="deeper-body">
				<p>
					The plain JSON shown here is a teaching simplification. In practice the model providers train
					the model to emit a tool call as a dedicated, structured block, and the API hands it back
					as typed data — e.g. a <span class="mono">tool_use</span> block carrying a
					<span class="mono">name</span>, an <span class="mono">input</span> object, and an id, with the
					response marked <span class="mono">stop_reason: "tool_use"</span>. The harness loops:
					call the model → if it asked for a tool, run it and append a
					<span class="mono">tool_result</span> with the matching id → call again → stop when the model
					replies with no tool call. The model can also request several tools at once (parallel tool
					calls). Either way the principle holds: the model produces text-shaped output; your code does
					the doing.
				</p>
			</div>
		</details>

		<details class="deeper">
			<summary><span class="mono">Go deeper</span> — MCP is more than tools</summary>
			<div class="deeper-body">
				<p>
					An MCP server can expose <em>tools</em> (actions), but also <em>resources</em> (read-only
					context the agent can pull in) and <em>prompts</em> (reusable templates). The agent
					discovers tools with a <span class="mono">tools/list</span> call and invokes one with
					<span class="mono">tools/call</span>, over a transport such as stdio (a local process) or
					HTTP. Because every connected tool’s schema is part of the fixed context, a good rule is the
					same as the chapter’s: connect what the task needs, and turn the rest off.
				</p>
			</div>
		</details>

		<p class="disclaimer tc-disclaimer">
			Illustrative: the JSON shapes, token counts, and tool list are simplified and made up. The
			behaviours are real — the model only emits text, the harness parses it and runs the tool, the
			result is fed back as text, and every connected tool’s schema is re-sent to the model on every
			call.
		</p>
	</div>
</section>

<style>
	.tc {
		position: relative;
		width: 100%;
		margin: clamp(4rem, 12vw, 9rem) 0 0;
		padding: clamp(2rem, 4vw, 3rem) var(--page-gutter) 0;
		border-top: 1px solid var(--line);
	}
	.tc::before {
		content: '';
		position: absolute;
		top: -1px;
		left: var(--page-gutter);
		width: clamp(5rem, 12vw, 9rem);
		height: 3px;
		background: var(--brand);
	}

	/* shared instrument frame */
	.tc-frame {
		margin: 0;
		width: 100%;
		padding: 1.1rem;
		border: 1px solid var(--line);
		border-top: 2px solid var(--brand);
		border-radius: 3px;
		background: var(--panel-gradient);
		box-shadow: var(--panel-shadow);
	}
	.tc-frame svg {
		display: block;
		width: 100%;
		height: auto;
	}

	/* 1 · handoff */
	.tc-handoff {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr);
		gap: clamp(1.5rem, 5vw, 4rem);
		align-items: center;
	}
	.ho-frame {
		max-width: min(100%, 56rem);
	}
	.tc-head {
		max-width: 34rem;
	}
	.tc-eyebrow {
		color: var(--brand-strong);
	}
	.tc-title {
		font-size: clamp(1.9rem, 4.6vw, 3rem);
		margin: 0.5rem 0 1rem;
		line-height: 1.04;
	}
	.tc-lede {
		font-size: clamp(1.05rem, 2.4vw, 1.2rem);
		color: var(--muted);
		max-width: var(--reading);
	}

	/* 2 + 3 · scrolly */
	.tc-scrolly {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(19rem, 0.6fr);
		gap: clamp(1.5rem, 5vw, 4rem);
		margin-top: clamp(2rem, 6vw, 4rem);
		align-items: start;
	}
	.tc-sticky {
		position: sticky;
		top: 7vh;
		max-width: min(100%, calc((92svh - 4rem) * 1.6));
	}
	.tc-mcp-scrolly .tc-sticky {
		max-width: min(100%, calc((92svh - 4rem) * 1.191));
	}
	.tc-note {
		margin-top: 0.5rem;
		font-size: 0.72rem;
		letter-spacing: 0.03em;
		color: var(--muted);
		text-align: center;
	}

	.tc-steps {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.tc-step,
	.tc-mcp-step {
		min-height: 52vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		max-width: 32rem;
		opacity: 0.3;
	}
	.tc-step:first-child,
	.tc-mcp-step:first-child {
		min-height: 38vh;
		justify-content: flex-end;
		padding-bottom: 5vh;
		opacity: 1;
	}
	.tc-step:last-child,
	.tc-mcp-step:last-child {
		min-height: 60vh;
	}
	.step-n {
		font-size: 0.78rem;
		color: var(--brand-strong);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.tc-step h3,
	.tc-mcp-step h3 {
		font-family: var(--display);
		font-weight: 400;
		font-size: clamp(1.45rem, 3.2vw, 2rem);
		margin: 0.35rem 0 0.7rem;
		color: var(--paper);
	}
	.tc-step p,
	.tc-mcp-step p {
		font-size: clamp(1rem, 2.2vw, 1.16rem);
		color: var(--muted);
		line-height: 1.6;
	}

	/* seam */
	.tc-seam {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin: clamp(3rem, 9vw, 6rem) 0 0;
	}
	.tc-seam .seam-line {
		height: 1px;
		flex: 1;
		background: var(--line);
		transform-origin: center;
	}
	.tc-seam .seam-tick {
		width: 9px;
		height: 9px;
		flex: 0 0 auto;
		border: 1.5px solid var(--brand);
		transform: rotate(45deg);
	}

	.tc-mcp-head {
		max-width: 46rem;
		margin-top: clamp(2.5rem, 7vw, 4.5rem);
	}
	.tc-mcp-head .eyebrow {
		color: var(--brand-strong);
	}
	.tc-mcp-head h2 {
		font-size: clamp(1.8rem, 4.4vw, 2.8rem);
		margin: 0.5rem 0 1rem;
		max-width: 20ch;
	}
	.tc-mcp-intro {
		font-size: clamp(1.02rem, 2.3vw, 1.18rem);
		color: var(--muted);
		max-width: var(--reading);
	}

	/* outro + expanders */
	.tc-outro {
		margin: clamp(3rem, 9vw, 6rem) 0 0;
		max-width: 48rem;
	}
	.tc-outro-line {
		font-family: var(--display);
		font-size: clamp(1.5rem, 3.6vw, 2.3rem);
		line-height: 1.18;
		color: var(--paper);
		margin-bottom: 2rem;
	}
	.tc-outro-line em {
		font-style: italic;
		color: var(--brand-strong);
	}

	.deeper {
		border: 1px solid var(--line);
		border-radius: 3px;
		background: var(--surface);
		padding: 0.85rem 1.1rem;
		margin: 0.9rem 0;
	}
	.deeper > summary {
		cursor: pointer;
		color: var(--muted);
		font-size: 0.95rem;
		list-style: none;
	}
	.deeper > summary::-webkit-details-marker {
		display: none;
	}
	.deeper > summary::before {
		content: '+ ';
		color: var(--brand-strong);
		font-family: var(--mono);
	}
	.deeper[open] > summary::before {
		content: '– ';
	}
	.deeper > summary .mono {
		color: var(--brand-strong);
		letter-spacing: 0.04em;
	}
	.deeper-body {
		margin-top: 0.8rem;
		color: var(--muted);
		font-size: 1rem;
		line-height: 1.62;
	}
	.deeper-body .mono {
		color: var(--paper);
		font-size: 0.92em;
	}
	.deeper-body em {
		font-style: italic;
		color: var(--paper);
	}

	.tc-disclaimer {
		margin: 2rem 0 0;
		max-width: 48rem;
	}

	@media (max-width: 860px) {
		.tc-handoff {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}
	@media (max-width: 760px) {
		.tc-scrolly {
			grid-template-columns: 1fr;
			gap: 0;
		}
		.tc-sticky {
			position: sticky;
			top: 4vh;
			margin-bottom: 2rem;
			z-index: 1;
		}
		.tc-step,
		.tc-mcp-step {
			min-height: 46vh;
		}
		.tc-step:first-child,
		.tc-mcp-step:first-child {
			min-height: 22vh;
		}
	}

	/* Without JS the observers never run: reveal everything statically. */
	:global(html.no-js) .tc-step,
	:global(html.no-js) .tc-mcp-step {
		opacity: 1;
		min-height: auto;
		margin-bottom: 2rem;
	}
	:global(html.no-js) .ho-chip {
		display: none;
	}
</style>
