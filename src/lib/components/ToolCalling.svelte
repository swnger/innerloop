<script lang="ts">
    import { onMount, tick } from "svelte";

    /* ============================================================
	   Chapter 05 — Tool calling ("the hands")
	   The question: how can an LLM call tools on my machine if it
	   can only output text? Answer: it can't. It only ever emits
	   tokens. A "tool call" is just text in an agreed-upon shape;
	   the agent/harness parses it, runs the real function, and
	   feeds the result back. The model never crosses the line.

	   1. Transition — the violet tool-definition band from Ch.4's tank
	      detaches into a schema box; the model then emits text shaped
	      by that contract (one-shot on entry).
	   2. Exchange — reader-stepped sticky stage: the full round trip
	      agent ⇄ LLM, with a YOUR MACHINE box only the agent touches.
	   3. MCP — a sticky tank that grows as servers register tools,
	      showing the context-window cost (callback to Ch.4).
	   Degrades to static + prose without JS.
	============================================================ */

    const COOL = "var(--cool)",
        WARM = "var(--warm)",
        PAPER = "var(--paper)",
        MUTED = "var(--muted)",
        FAINT = "var(--faint)",
        LINE = "var(--line)",
        LINE_B = "var(--line-bright)",
        BRAND = "var(--brand-strong)",
        SURFACE = "var(--diagram-surface)";

    const RUN_SHELL_SCHEMA = [
        '{ "name": "run_shell",',
        '  "description": "Run a shell command,',
        '                  return its output",',
        '  "input_schema": {',
        '    "type": "object",',
        '    "properties": {',
        '      "command": { "type": "string" } },',
        '    "required": ["command"] } }',
    ];
    const RUN_SHELL_CALL = [
        "{",
        '  "name": "run_shell",',
        '  "input": { "command": "pytest -q" }',
        "}",
    ];

    /* ---- 2 · the exchange: one round trip, slowed down ---- */
    type Lit = "agent" | "llm" | "machine" | "both";
    type Accent = "cool" | "warm" | "brand" | "tools";
    type Stage = {
        k: string;
        title: string;
        body: string;
        dir: "in" | "out" | "down" | null; // chip travel
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
            k: "the menu",
            title: "First, the model is handed a menu",
            body: "Before the turn, every tool is described to the model as a JSON schema — a name, what it does, and the contract its arguments must satisfy. This menu rides along in the context window, sent on every call.",
            dir: "in",
            lit: "llm",
            cardLabel: "TOOL DEFINITION · part of the context",
            accent: "tools",
            card: RUN_SHELL_SCHEMA,
            note: "the model never saw your machine — only this description of it",
        },
        {
            k: "it writes a tool call",
            title: "The model writes a tool call — as text",
            body: "It does the only thing it can do: predict tokens (Chapter 3). Here those tokens spell a small, structured block naming a tool and its arguments. Nothing has run. The text matches the schema contract.",
            dir: "out",
            lit: "llm",
            cardLabel: "MODEL OUTPUT · just predicted tokens",
            accent: "warm",
            card: RUN_SHELL_CALL,
            note: 'a "tool call" is not an action — it is a request, written in text',
        },
        {
            k: "the agent reads it",
            title: "The agent reads and checks it",
            body: "The harness — your code, not the model — recognises the block, parses the JSON, and validates it against the schema. The model has stopped; the loop has the wheel now.",
            dir: null,
            lit: "agent",
            cardLabel: "AGENT · parse + validate against schema",
            accent: "brand",
            card: [
                "{",
                '  "name": "run_shell",',
                '  "input": { "command": "pytest -q" }',
                "}",
                "",
                "✓ valid · matches run_shell schema",
            ],
            note: "the agent is the interpreter — it decides what the text means",
            valid: true,
        },
        {
            k: "the agent runs it",
            title: "The agent runs it — on your machine",
            body: "Now the agent actually executes the command: it opens a shell, runs it, reads the output. This is the step the model can never do. The model only emitted text; everything that touches your machine is the harness.",
            dir: "down",
            lit: "machine",
            cardLabel: "YOUR MACHINE · the agent executes",
            accent: "cool",
            card: [
                "$ pytest -q",
                "....                       [100%]",
                "1 passed in 0.42s",
            ],
            note: "the model never crosses this line — it has no shell, no files, no network",
            boundary: true,
        },
        {
            k: "the result goes back",
            title: "The result is fed back — as text",
            body: "The agent wraps the output as a tool result and appends it to the context, then calls the model again. To the model it is just more tokens to read, paired to the call it made.",
            dir: "in",
            lit: "llm",
            cardLabel: "TOOL RESULT · appended to the context",
            accent: "cool",
            card: [
                "{",
                '  "type": "tool_result",',
                '  "output": "1 passed in 0.42s"',
                "}",
            ],
            note: "observe → the loop feeds the world back to the model, in the only format it reads",
        },
        {
            k: "this time, an answer",
            title: "This time it answers — no tool call",
            body: "With the result in context, the model predicts plain text instead of another tool block. The agent sees no tool call, stops looping, and returns the answer to you. Think → act → observe, closed.",
            dir: "out",
            lit: "agent",
            cardLabel: "MODEL OUTPUT · plain text → returned to you",
            accent: "warm",
            card: [
                '"The test passes now — the bug',
                ' was a missing null check."',
            ],
            note: "no tool call → the loop ends and the turn returns (Chapter 1)",
        },
    ];

    const ACCENT: Record<Accent, string> = {
        cool: COOL,
        warm: WARM,
        brand: BRAND,
        tools: "var(--cat-tools)",
    };

    let activeStage = $state(0);
    const stage = $derived(STAGES[activeStage]);
    const agentLit = $derived(
        stage.lit === "agent" ||
            stage.lit === "both" ||
            stage.lit === "machine",
    );
    const llmLit = $derived(stage.lit === "llm" || stage.lit === "both");
    const machineLit = $derived(stage.lit === "machine");

    // Chapter 1's agent routine, reused verbatim so the loop reads as the same
    // machine. The detail view to the right is a zoom into run_tool()/has_tool_call.
    const CODE = [
        { t: "turn(user_message):", head: true },
        { t: "  context.append(user_message)" },
        { t: "  while True:", head: true },
        { t: "    response = LLM(context)" },
        { t: "    context.append(response)" },
        { t: "    if not response.has_tool_call:" },
        { t: "      return response" },
        { t: "    out = run_tool(response.tool_call)" },
        { t: "    context.append(out)" },
    ];
    // per stage: which routine line is live, and whether the detail is a zoom-in
    const STAGE_CODE = [
        { line: 3, zoom: false },
        { line: 3, zoom: false },
        { line: 5, zoom: true },
        { line: 7, zoom: true },
        { line: 8, zoom: true },
        { line: 6, zoom: false },
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

    type McpStep = {
        title: string;
        body: string;
        servers: number;
        note: string;
    };
    const MCP: McpStep[] = [
        {
            title: "Without MCP, tools are wired in by hand",
            body: "Every tool you want the agent to have, you define yourself — name, description, schema — and register it in code. Useful, but it does not scale past a handful.",
            servers: 0,
            note: "a small, hand-picked menu",
        },
        {
            title: "MCP is a standard plug for tools",
            body: "An MCP server advertises a list of tools — each with a name, description, and JSON schema. The agent connects, asks for the list, and registers them all automatically. No bespoke wiring per tool.",
            servers: 2,
            note: "tools/list → schemas register themselves into the context",
        },
        {
            title: "Every tool rides in the window",
            body: "Those schemas land in the tool-definitions layer — which is fixed and re-sent to the model on every single call (Chapter 4). Connect more servers and the layer keeps growing.",
            servers: 4,
            note: "fixed cost · paid on every call, before any of your work",
        },
        {
            title: "So be careful what you plug in",
            body: "A dozen MCP servers can spend thousands of tokens before you have said a word — crowding the budget and pushing toward the limit. And a longer menu makes the model likelier to reach for the wrong tool. Connect deliberately; prune what you do not use.",
            servers: 6,
            note: "attempted 8.3k / 8k → the menu alone is breaching the budget",
        },
    ];

    const SERVERS = [
        { name: "filesystem", tools: 6 },
        { name: "github", tools: 11 },
        { name: "postgres", tools: 4 },
        { name: "slack", tools: 8 },
        { name: "gmail", tools: 7 },
        { name: "sentry", tools: 5 },
    ];

    let activeMcp = $state(0);
    const mcp = $derived(MCP[activeMcp]);
    const toolUsed = $derived(
        BASE.system + BASE.history + BASE.user + TOOLDEF[activeMcp],
    );
    const overflow = $derived(toolUsed > MAX);
    const fmt = (n: number) =>
        n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);

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
        return {
            hSys,
            hTool,
            hHist,
            hUser,
            ySys,
            yTool,
            yHist,
            yUser,
            surface,
        };
    }
    const lay = $derived(mcpLayout(activeMcp));

    let exchangeEl: HTMLElement;
    let mcpEl: HTMLElement;
    let transitionEl: HTMLElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gsap: any;
    let stageRun = 0;
    let mcpRun = 0;

    const motionPath = (path: string) => ({
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
    });

    async function goStage(i: number) {
        if (i === activeStage && i !== 0) return;
        const run = ++stageRun;
        activeStage = i;
        await tick();
        if (run !== stageRun || !gsap) return;

        const q = gsap.utils.selector(exchangeEl);
        // dim the prose, light the active step
        const prose = Array.from(
            document.querySelectorAll<HTMLElement>(".tc-step"),
        );
        gsap.to(prose, { opacity: 0.3, duration: 0.3, overwrite: true });
        if (prose[i])
            gsap.to(prose[i], { opacity: 1, duration: 0.3, overwrite: true });

        // card swaps instantly (reactive); fade for polish
        gsap.fromTo(
            q(".ex-card"),
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
        );

        // travelling chip on the rail
        const s = STAGES[i];
        if (s.dir === "in") {
            gsap.set(q(".chip-cool"), { opacity: 1 });
            gsap.fromTo(
                q(".chip-cool"),
                { opacity: 1 },
                {
                    duration: 0.9,
                    ease: "power1.inOut",
                    ...motionPath("#ex-cool"),
                    onComplete: () => gsap.set(q(".chip-cool"), { opacity: 0 }),
                },
            );
        } else if (s.dir === "out") {
            gsap.set(q(".chip-warm"), { opacity: 1 });
            gsap.fromTo(
                q(".chip-warm"),
                { opacity: 1 },
                {
                    duration: 0.9,
                    ease: "power1.inOut",
                    ...motionPath("#ex-warm"),
                    onComplete: () => gsap.set(q(".chip-warm"), { opacity: 0 }),
                },
            );
        } else if (s.dir === "down") {
            gsap.set(q(".chip-act"), { opacity: 1 });
            gsap.fromTo(
                q(".chip-act"),
                { opacity: 1 },
                {
                    duration: 0.8,
                    ease: "power1.inOut",
                    ...motionPath("#ex-act"),
                    onComplete: () => gsap.set(q(".chip-act"), { opacity: 0 }),
                },
            );
        }

        // soft pop on the active actor's outline
        const target =
            s.lit === "machine"
                ? ".box-machine .box-shell"
                : s.lit === "llm"
                  ? ".box-llm .box-shell"
                  : ".box-agent .box-shell";
        gsap.fromTo(
            q(target),
            { strokeWidth: 2.4 },
            { strokeWidth: 1.5, duration: 0.6, ease: "power2.out" },
        );

        // boundary flare on the "run" stage
        if (s.boundary) {
            gsap.fromTo(
                q(".ex-boundary"),
                { opacity: 0.3 },
                { opacity: 1, duration: 0.4, yoyo: true, repeat: 1 },
            );
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
        const tl = gsap.timeline({
            defaults: { duration: 0.6, ease: "power2.inOut" },
        });
        tl.fromTo(
            q(".tk-tool"),
            { attr: { y: prev.yTool, height: prev.hTool } },
            { attr: { y: next.yTool, height: next.hTool } },
            0,
        )
            .fromTo(
                q(".tk-tool-stripe"),
                { attr: { y: prev.yTool, height: prev.hTool } },
                { attr: { y: next.yTool, height: next.hTool } },
                0,
            )
            .fromTo(
                q(".tk-tool-label"),
                { attr: { y: prev.yTool + prev.hTool / 2 } },
                { attr: { y: next.yTool + next.hTool / 2 } },
                0,
            )
            .fromTo(
                q(".tk-hist"),
                { attr: { y: prev.yHist } },
                { attr: { y: next.yHist } },
                0,
            )
            .fromTo(
                q(".tk-user"),
                { attr: { y: prev.yUser } },
                { attr: { y: next.yUser } },
                0,
            )
            .fromTo(
                q(".tk-surface"),
                { attr: { y1: prev.surface, y2: prev.surface } },
                { attr: { y1: next.surface, y2: next.surface } },
                0,
            );

        const prose = Array.from(
            document.querySelectorAll<HTMLElement>(".tc-mcp-step"),
        );
        gsap.to(prose, { opacity: 0.3, duration: 0.3, overwrite: true });
        if (prose[i])
            gsap.to(prose[i], { opacity: 1, duration: 0.3, overwrite: true });

        // new server cards drop in
        gsap.fromTo(
            q(".mcp-server"),
            { opacity: 0.15, x: 10 },
            {
                opacity: (idx: number) => (idx < MCP[i].servers ? 1 : 0.15),
                x: 0,
                duration: 0.5,
                stagger: 0.06,
            },
        );

        if (i === MCP.length - 1) {
            gsap.fromTo(
                q(".tk-maxline"),
                { opacity: 0.5 },
                { opacity: 1, duration: 0.3, yoyo: true, repeat: 3 },
            );
        }
    }

    onMount(() => {
        let io: IntersectionObserver | undefined;
        let mio: IntersectionObserver | undefined;
        let disposed = false;
        let txContext: { revert: () => void } | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let txTl: any;
        let removeTxOverlay = () => {};

        Promise.all([
            import("gsap"),
            import("gsap/MotionPathPlugin"),
            import("gsap/ScrollTrigger"),
        ]).then(([core, mp, st]) => {
            if (disposed) return;
            gsap = core.gsap ?? core.default;
            const ScrollTrigger = st.ScrollTrigger ?? st.default;
            gsap.registerPlugin(
                mp.MotionPathPlugin ?? mp.default,
                ScrollTrigger,
            );

            // initial step emphasis
            gsap.set(".tc-step", { opacity: 0.3 });
            gsap.set(".tc-step:first-child", { opacity: 1 });
            gsap.set(".tc-mcp-step", { opacity: 0.3 });
            gsap.set(".tc-mcp-step:first-child", { opacity: 1 });
            gsap.set(
                [
                    exchangeEl.querySelector(".chip-cool"),
                    exchangeEl.querySelector(".chip-warm"),
                    exchangeEl.querySelector(".chip-act"),
                ],
                { opacity: 0 },
            );

            io = new IntersectionObserver(
                (entries) => {
                    for (const e of entries) {
                        if (!e.isIntersecting) continue;
                        const n = Number((e.target as HTMLElement).dataset.i);
                        if (!Number.isNaN(n)) void goStage(n);
                    }
                },
                { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
            );
            document
                .querySelectorAll(".tc-step")
                .forEach((el) => io?.observe(el));

            mio = new IntersectionObserver(
                (entries) => {
                    for (const e of entries) {
                        if (!e.isIntersecting) continue;
                        const n = Number((e.target as HTMLElement).dataset.i);
                        if (!Number.isNaN(n)) void goMcp(n);
                    }
                },
                { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
            );
            document
                .querySelectorAll(".tc-mcp-step")
                .forEach((el) => mio?.observe(el));

            const q = gsap.utils.selector(transitionEl);
            let txOverlay: SVGSVGElement | undefined;
            let txSourceStart:
                | { x: number; y: number; width: number; height: number }
                | undefined;
            const toBox = (r: DOMRect) => ({
                x: r.left,
                y: r.top,
                width: r.width,
                height: r.height,
            });
            const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
            const removeOverlay = () => {
                txOverlay?.remove();
                txOverlay = undefined;
            };
            removeTxOverlay = removeOverlay;
            const createBandOverlay = () => {
                removeOverlay();
                const band = document.querySelector<SVGGElement>(
                    '#context [data-band="tools"]',
                );
                const body = band?.querySelector<SVGRectElement>(".band-body");
                if (!band || !body) return undefined;
                const box = band.getBBox();
                const overlay = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "svg",
                );
                overlay.setAttribute(
                    "viewBox",
                    `${box.x} ${box.y} ${box.width} ${box.height}`,
                );
                overlay.setAttribute("aria-hidden", "true");
                overlay.classList.add("tx-band-overlay");
                const defs = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "defs",
                );
                defs.innerHTML =
                    '<pattern id="tx-overlay-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--paper)" stroke-width="1" opacity="0.06" /></pattern>';
                const clone = band.cloneNode(true) as SVGGElement;
                clone
                    .querySelectorAll('[fill="url(#ctx-fixed-hatch)"]')
                    .forEach((el) =>
                        el.setAttribute("fill", "url(#tx-overlay-hatch)"),
                    );
                overlay.append(defs, clone);
                document.body.appendChild(overlay);
                txOverlay = overlay;
                return { overlay, body };
            };
            const setTransitionInitial = () => {
                gsap.set(q(".tx-schema-line"), { autoAlpha: 0, y: 8 });
                gsap.set(q(".tx-schema-shell"), { autoAlpha: 0 });
                gsap.set(q(".tx-emitted"), { autoAlpha: 0, y: 10 });
                gsap.set(q(".tx-connect"), {
                    attr: { "stroke-dasharray": 420, "stroke-dashoffset": 420 },
                });
                gsap.set(q(".tx-chip"), { autoAlpha: 0, x: 0, y: 0 });
                gsap.set(q(".tx-claim"), { autoAlpha: 0, y: 10 });
                gsap.set(q(".tc-head"), { autoAlpha: 0, y: 18 });
            };
            const buildRevealTimeline = () => {
                txTl?.kill();
                setTransitionInitial();
                txTl = gsap
                    .timeline({ paused: true, defaults: { ease: "none" } })
                    .to({}, { duration: 1 }, 0)
                    .to(
                        q(".tx-schema-shell"),
                        { autoAlpha: 1, duration: 0.04 },
                        0.78,
                    )
                    .to(
                        q(".tx-schema-line"),
                        { autoAlpha: 1, y: 0, duration: 0.08, stagger: 0.006 },
                        0.8,
                    )
                    .to(
                        q(".tx-emitted"),
                        { autoAlpha: 1, y: 0, duration: 0.08 },
                        0.86,
                    )
                    .to(
                        q(".tx-connect"),
                        {
                            attr: { "stroke-dashoffset": 0 },
                            duration: 0.08,
                            ease: "power1.inOut",
                        },
                        0.9,
                    )
                    .set(q(".tx-chip"), { autoAlpha: 1 }, 0.9)
                    .to(
                        q(".tx-chip"),
                        {
                            duration: 0.08,
                            ease: "power1.inOut",
                            ...motionPath("#tx-connect"),
                        },
                        0.9,
                    )
                    .to(q(".tx-chip"), { autoAlpha: 0, duration: 0.02 }, 0.98)
                    .to(
                        q(".tx-claim"),
                        { autoAlpha: 1, y: 0, duration: 0.04 },
                        0.94,
                    )
                    .to(
                        q(".tc-head"),
                        { autoAlpha: 1, y: 0, duration: 0.04 },
                        0.96,
                    );
                return txTl;
            };
            const updateTransition = (progress: number) => {
                const overlay = txOverlay ?? createBandOverlay()?.overlay;
                const target =
                    transitionEl.querySelector<SVGRectElement>(
                        ".tx-schema-body",
                    );
                const sourceBody = document.querySelector<SVGRectElement>(
                    '#context [data-band="tools"] .band-body',
                );
                if (!overlay || !target || !sourceBody) return;
                if (!txSourceStart || progress <= 0.001)
                    txSourceStart = toBox(sourceBody.getBoundingClientRect());
                const targetBox = toBox(target.getBoundingClientRect());
                const fade =
                    progress < 0.86
                        ? 1
                        : Math.max(0, 1 - (progress - 0.86) / 0.12);
                gsap.set(overlay, {
                    autoAlpha: fade,
                    x: lerp(txSourceStart.x, targetBox.x, progress),
                    y: lerp(txSourceStart.y, targetBox.y, progress),
                    width: lerp(txSourceStart.width, targetBox.width, progress),
                    height: lerp(
                        txSourceStart.height,
                        targetBox.height,
                        progress,
                    ),
                });
                txTl?.progress(progress);
            };
            txContext = gsap.context(() => {
                setTransitionInitial();
                buildRevealTimeline();
                ScrollTrigger.create({
                    trigger: transitionEl,
                    start: "top bottom",
                    end: "top 20%",
                    scrub: 0.35,
                    invalidateOnRefresh: true,
                    onUpdate: (self: { progress: number }) =>
                        updateTransition(self.progress),
                    onLeaveBack: () => {
                        txSourceStart = undefined;
                        gsap.set(txOverlay, { autoAlpha: 0 });
                        setTransitionInitial();
                    },
                });
                if (document.fonts) {
                    document.fonts.ready.then(() => {
                        if (!disposed) ScrollTrigger.refresh();
                    });
                }
            }, transitionEl);
        });

        return () => {
            disposed = true;
            io?.disconnect();
            mio?.disconnect();
            txTl?.kill();
            removeTxOverlay();
            txContext?.revert();
        };
    });
</script>

<section id="tools" class="tc" data-chapter="05" aria-labelledby="tc-title">
    <!-- 1 · TRANSITION — Ch.4's tool-definition band becomes Ch.5's schema contract -->
    <div class="tc-tx" bind:this={transitionEl}>
        <figure class="tc-frame tx-frame">
            <svg
                viewBox="0 0 1000 460"
                role="img"
                aria-label="The violet tool definitions band from the context window detaches into a schema box; the model then emits warm text that matches the schema contract."
            >
                <text
                    x="72"
                    y="34"
                    font-family="var(--mono)"
                    font-size="10"
                    font-weight="600"
                    letter-spacing="0.1em"
                    fill={BRAND}>THE MENU, CARRIED FORWARD</text
                >
                <text
                    x="72"
                    y="53"
                    font-family="var(--mono)"
                    font-size="9"
                    fill={FAINT}>what rode in the window</text
                >

                <g
                    class="tx-schema-shell"
                    style="filter: drop-shadow(0 0 12px rgba(179,148,230,.34))"
                >
                    <rect
                        class="tx-schema-body"
                        x="366"
                        y="80"
                        width="356"
                        height="168"
                        rx="5"
                        fill="var(--cat-tools-fill)"
                        stroke="var(--cat-tools)"
                        stroke-width="1.2"
                    />
                    <rect
                        x="366"
                        y="80"
                        width="3"
                        height="168"
                        fill="var(--cat-tools)"
                    />
                    <rect
                        x="366"
                        y="80"
                        width="356"
                        height="30"
                        rx="5"
                        fill="rgba(179,148,230,.12)"
                    />
                    <line x1="366" y1="110" x2="722" y2="110" stroke={LINE} />
                    <text
                        x="382"
                        y="99"
                        font-family="var(--mono)"
                        font-size="10"
                        font-weight="600"
                        letter-spacing="0.07em"
                        fill="var(--cat-tools)"
                        >TOOL DEFINITION · SCHEMA CONTRACT</text
                    >
                </g>
                <g>
                    {#each RUN_SHELL_SCHEMA as line, i}
                        <text
                            class="tx-schema-line"
                            x="386"
                            y={132 + i * 14}
                            font-family="var(--mono)"
                            font-size="10.4"
                            fill={PAPER}
                            xml:space="preserve">{line}</text
                        >
                    {/each}
                </g>

                <g class="tx-emitted">
                    <rect
                        x="520"
                        y="286"
                        width="390"
                        height="126"
                        rx="5"
                        fill="var(--surface)"
                        stroke={WARM}
                        stroke-width="1.2"
                    />
                    <rect
                        x="520"
                        y="286"
                        width="390"
                        height="27"
                        rx="5"
                        fill="var(--warm-soft)"
                    />
                    <text
                        x="536"
                        y="304"
                        font-family="var(--mono)"
                        font-size="10"
                        font-weight="600"
                        letter-spacing="0.06em"
                        fill={WARM}>WHAT THE MODEL ACTUALLY EMITTED · TEXT</text
                    >
                    {#each RUN_SHELL_CALL as line, i}
                        <text
                            x="540"
                            y={338 + i * 18}
                            font-family="var(--mono)"
                            font-size="11.5"
                            fill={PAPER}
                            xml:space="preserve">{line}</text
                        >
                    {/each}
                    <text
                        x="540"
                        y="396"
                        font-family="var(--mono)"
                        font-size="9"
                        fill={FAINT}
                        >characters, not a command · validated by the harness</text
                    >
                </g>

                <path
                    id="tx-connect"
                    class="tx-connect"
                    d="M 624 250 C 632 276, 684 264, 712 286"
                    fill="none"
                    stroke={WARM}
                    stroke-width="1.2"
                    opacity="0.58"
                    stroke-linecap="round"
                />
                <g
                    class="tx-chip"
                    style="filter: drop-shadow(var(--glow-warm))"
                >
                    <rect
                        x="-42"
                        y="-12"
                        width="84"
                        height="24"
                        rx="5"
                        fill="var(--warm-soft)"
                        stroke={WARM}
                    />
                    <text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="8.5"
                        font-weight="600"
                        fill={WARM}>predicts text</text
                    >
                </g>
            </svg>
        </figure>

        <div class="tc-head chapter-head">
            <p class="eyebrow tc-eyebrow">Chapter 05 · the hands</p>
            <h2 id="tc-title" class="tc-title">
                It only writes text.<br />So who runs the command?
            </h2>
            <p class="tc-lede">
                The model has no shell, no files, no network — it can only emit
                tokens (Chapter 3). Yet agents run commands, edit files, hit
                APIs. The trick is that a “tool call” is just text that matches
                a schema contract, and something else does the running.
            </p>
        </div>
    </div>

    <!-- 2 · THE EXCHANGE — reader-stepped round trip -->
    <div class="tc-scrolly">
        <figure class="tc-frame tc-sticky" bind:this={exchangeEl}>
            <svg
                viewBox="0 0 1000 600"
                role="img"
                aria-label="An agent on the left and an LLM on the right exchange text across a channel. The agent owns a YOUR MACHINE box (shell, files, network); a dashed boundary marks that the model never crosses into it. A central card shows the message currently on the wire as the round trip steps through schema, tool call, parse, run, result, and answer."
            >
                <defs>
                    <marker
                        id="tc-cool"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                        ><path d="M0,0 L10,5 L0,10 z" fill={COOL} /></marker
                    >
                    <marker
                        id="tc-warm"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                        ><path d="M0,0 L10,5 L0,10 z" fill={WARM} /></marker
                    >
                </defs>

                <!-- rails -->
                <path
                    id="ex-cool"
                    d="M 330 215 C 470 195, 540 195, 668 205"
                    fill="none"
                    stroke={COOL}
                    stroke-width="1.1"
                    opacity="0.3"
                    marker-end="url(#tc-cool)"
                />
                <path
                    id="ex-warm"
                    d="M 668 250 C 540 270, 470 270, 332 260"
                    fill="none"
                    stroke={WARM}
                    stroke-width="1.1"
                    opacity="0.3"
                    marker-end="url(#tc-warm)"
                />
                <text
                    x="500"
                    y="188"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="8.5"
                    fill={FAINT}>context in →</text
                >
                <text
                    x="500"
                    y="286"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="8.5"
                    fill={FAINT}>← text out</text
                >
                <!-- internal "run" rail: agent → machine -->
                <path
                    id="ex-act"
                    d="M 170 360 C 170 392, 170 408, 170 432"
                    fill="none"
                    stroke={COOL}
                    stroke-width="1.1"
                    opacity="0.3"
                    marker-end="url(#tc-cool)"
                />

                <!-- AGENT -->
                <g class="box-agent" style:opacity={agentLit ? 1 : 0.5}>
                    <rect
                        class="box-shell"
                        x="40"
                        y="120"
                        width="260"
                        height="240"
                        rx="10"
                        fill={SURFACE}
                        stroke={agentLit ? LINE_B : LINE}
                        stroke-width="1.5"
                    />
                    <text
                        x="60"
                        y="148"
                        font-family="var(--mono)"
                        font-size="11"
                        font-weight="600"
                        letter-spacing="0.14em"
                        fill={PAPER}>AGENT · ONE TURN</text
                    >
                    <text
                        x="282"
                        y="148"
                        text-anchor="end"
                        font-family="var(--mono)"
                        font-size="8.5"
                        fill={FAINT}>↺ Chapter 1</text
                    >
                    <text
                        x="60"
                        y="164"
                        font-family="var(--mono)"
                        font-size="8.5"
                        fill={FAINT}>the same routine, line by line</text
                    >
                    <line x1="60" y1="176" x2="280" y2="176" stroke={LINE} />
                    <rect
                        class="ex-codehi"
                        x="54"
                        y={codeY - 11}
                        width="248"
                        height="15"
                        rx="2"
                        fill="var(--brand-soft)"
                    />
                    {#each CODE as ln, i}
                        <text
                            x="60"
                            y={202 + i * 16}
                            font-family="var(--mono)"
                            font-size="9"
                            font-weight={i === codeLine ? 600 : 400}
                            fill={i === codeLine
                                ? BRAND
                                : ln.head
                                  ? PAPER
                                  : MUTED}
                            xml:space="preserve">{ln.t}</text
                        >
                    {/each}
                </g>

                <!-- YOUR MACHINE -->
                <g class="box-machine" style:opacity={machineLit ? 1 : 0.45}>
                    <rect
                        class="box-shell"
                        x="40"
                        y="432"
                        width="260"
                        height="118"
                        rx="10"
                        fill={machineLit ? "var(--cat-tool-fill)" : SURFACE}
                        stroke={machineLit ? COOL : LINE}
                        stroke-width="1.5"
                        style:filter={machineLit
                            ? "drop-shadow(var(--glow-cool))"
                            : "none"}
                    />
                    <text
                        x="60"
                        y="458"
                        font-family="var(--mono)"
                        font-size="11"
                        font-weight="600"
                        letter-spacing="0.14em"
                        fill={machineLit ? COOL : MUTED}>YOUR MACHINE</text
                    >
                    <text
                        x="60"
                        y="484"
                        font-family="var(--mono)"
                        font-size="10"
                        fill={machineLit ? PAPER : FAINT}>$ shell</text
                    >
                    <text
                        x="150"
                        y="484"
                        font-family="var(--mono)"
                        font-size="10"
                        fill={machineLit ? PAPER : FAINT}>▤ files</text
                    >
                    <text
                        x="60"
                        y="508"
                        font-family="var(--mono)"
                        font-size="10"
                        fill={machineLit ? PAPER : FAINT}>⇅ network</text
                    >
                    <text
                        x="150"
                        y="508"
                        font-family="var(--mono)"
                        font-size="10"
                        fill={machineLit ? PAPER : FAINT}>⚙ processes</text
                    >
                    <text
                        x="60"
                        y="532"
                        font-family="var(--mono)"
                        font-size="9"
                        fill={FAINT}>only the agent can reach here</text
                    >
                </g>

                <!-- LLM -->
                <g class="box-llm" style:opacity={llmLit ? 1 : 0.5}>
                    <rect
                        class="box-shell"
                        x="700"
                        y="120"
                        width="260"
                        height="240"
                        rx="10"
                        fill={SURFACE}
                        stroke={llmLit ? LINE_B : LINE}
                        stroke-width="1.5"
                    />
                    <text
                        x="720"
                        y="150"
                        font-family="var(--mono)"
                        font-size="12"
                        font-weight="600"
                        letter-spacing="0.16em"
                        fill={PAPER}>LLM</text
                    >
                    <text
                        x="940"
                        y="150"
                        text-anchor="end"
                        font-family="var(--mono)"
                        font-size="9"
                        fill={FAINT}>Chapter 3</text
                    >
                    <line x1="720" y1="162" x2="940" y2="162" stroke={LINE} />
                    <text
                        x="720"
                        y="190"
                        font-family="var(--mono)"
                        font-size="10.5"
                        fill={MUTED}>reads tokens →</text
                    >
                    <text
                        x="720"
                        y="214"
                        font-family="var(--mono)"
                        font-size="10.5"
                        fill={MUTED}>predicts tokens →</text
                    >
                    <text
                        x="720"
                        y="244"
                        font-family="var(--mono)"
                        font-size="13"
                        fill={PAPER}>text in · text out</text
                    >
                    <text
                        x="720"
                        y="286"
                        font-family="var(--mono)"
                        font-size="9.5"
                        fill={FAINT}>no shell. no files.</text
                    >
                    <text
                        x="720"
                        y="304"
                        font-family="var(--mono)"
                        font-size="9.5"
                        fill={FAINT}>no network. no memory.</text
                    >
                    <text
                        x="720"
                        y="332"
                        font-family="var(--mono)"
                        font-size="9.5"
                        fill={MUTED}>it can only ever emit text</text
                    >
                </g>

                <!-- the boundary the model never crosses -->
                <line
                    class="ex-boundary"
                    x1="640"
                    y1="96"
                    x2="640"
                    y2="566"
                    stroke={WARM}
                    stroke-width="1.3"
                    stroke-dasharray="5 5"
                    opacity="0.55"
                />
                <text
                    class="ex-boundary"
                    x="654"
                    y="556"
                    font-family="var(--mono)"
                    font-size="9"
                    letter-spacing="0.06em"
                    fill={WARM}
                    opacity="0.8">the model never crosses this line ↑</text
                >

                <!-- zoom cue: the detail card is the inside of the live routine line -->
                <g class="ex-zoom" style:opacity={zoom ? 1 : 0}>
                    <path
                        d={`M 304 ${codeY} C 332 ${codeY}, 344 326, 356 326`}
                        fill="none"
                        stroke="var(--cat-tools)"
                        stroke-width="1"
                        stroke-dasharray="3 3"
                    />
                    <text
                        x="316"
                        y={codeY - 6}
                        font-family="var(--mono)"
                        font-size="8"
                        letter-spacing="0.04em"
                        fill="var(--cat-tools)">zoom in ↓</text
                    >
                </g>

                <!-- the message on the wire -->
                <g class="ex-card">
                    <rect
                        x="358"
                        y="318"
                        width="284"
                        height="218"
                        rx="6"
                        fill="var(--surface)"
                        stroke={ACCENT[stage.accent]}
                        stroke-width="1.2"
                    />
                    <rect
                        x="358"
                        y="318"
                        width="4"
                        height="218"
                        fill={ACCENT[stage.accent]}
                    />
                    <rect
                        x="358"
                        y="318"
                        width="284"
                        height="24"
                        fill={SURFACE}
                    />
                    <text
                        x="374"
                        y="334"
                        font-family="var(--mono)"
                        font-size="9"
                        font-weight="600"
                        letter-spacing="0.04em"
                        fill={ACCENT[stage.accent]}>{stage.cardLabel}</text
                    >
                    <line x1="358" y1="342" x2="642" y2="342" stroke={LINE} />
                    {#each stage.card as line, li}
                        <text
                            x="374"
                            y={364 + li * 20}
                            font-family="var(--mono)"
                            font-size="10.5"
                            fill={line.startsWith("✓") ? COOL : PAPER}
                            xml:space="preserve">{line}</text
                        >
                    {/each}
                </g>

                <!-- travelling chips -->
                <g
                    class="chip-cool"
                    style="filter: drop-shadow(var(--glow-cool))"
                    ><rect
                        x="-30"
                        y="-11"
                        width="60"
                        height="22"
                        rx="5"
                        fill="var(--cool-soft)"
                        stroke={COOL}
                    /><text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="8.5"
                        font-weight="600"
                        fill={COOL}>context</text
                    ></g
                >
                <g
                    class="chip-warm"
                    style="filter: drop-shadow(var(--glow-warm))"
                    ><rect
                        x="-30"
                        y="-11"
                        width="60"
                        height="22"
                        rx="5"
                        fill="var(--warm-soft)"
                        stroke={WARM}
                    /><text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="8.5"
                        font-weight="600"
                        fill={WARM}>text</text
                    ></g
                >
                <g
                    class="chip-act"
                    style="filter: drop-shadow(var(--glow-cool))"
                    ><rect
                        x="-22"
                        y="-11"
                        width="44"
                        height="22"
                        rx="5"
                        fill="var(--cool-soft)"
                        stroke={COOL}
                    /><text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="8.5"
                        font-weight="600"
                        fill={COOL}>run</text
                    ></g
                >
            </svg>
            <figcaption class="tc-note mono">{stage.note}</figcaption>
        </figure>

        <ol class="tc-steps">
            {#each STAGES as s, i}
                <li
                    class="tc-step"
                    data-i={i}
                    aria-current={i === activeStage ? "step" : undefined}
                >
                    <span class="step-n mono">0{i + 1} · {s.k}</span>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                </li>
            {/each}
        </ol>
    </div>

    <div class="tc-seam" aria-hidden="true">
        <span class="seam-line"></span><span class="seam-tick"></span><span
            class="seam-line"
        ></span>
    </div>

    <!-- 3 · MCP -->
    <div class="tc-mcp-head">
        <p class="eyebrow">scaling the menu · MCP</p>
        <h2>One plug, many tools — and a hidden bill.</h2>
        <p class="tc-mcp-intro">
            MCP (the Model Context Protocol) is a standard way for outside
            services to hand an agent a list of tools. It makes adding
            capabilities trivial — which is exactly why it is easy to overload
            the context window.
        </p>
    </div>

    <div class="tc-scrolly tc-mcp-scrolly">
        <figure class="tc-frame tc-sticky" bind:this={mcpEl}>
            <svg
                viewBox="0 0 560 470"
                role="img"
                aria-label="A context-window tank. As MCP servers connect on the right, their tool schemas register into the tool-definitions layer, which grows until it breaches the budget line."
            >
                <defs>
                    <pattern
                        id="mcp-hatch"
                        width="7"
                        height="7"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                    >
                        <line
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="7"
                            stroke={PAPER}
                            stroke-width="1"
                            opacity="0.06"
                        />
                    </pattern>
                </defs>

                <!-- gauge -->
                <text
                    x={VX}
                    y="40"
                    font-family="var(--mono)"
                    font-size="12"
                    fill={MUTED}
                >
                    <tspan fill={overflow ? WARM : PAPER} font-weight="600"
                        >{fmt(toolUsed)}</tspan
                    ><tspan fill={FAINT}> / {fmt(MAX)} tokens</tspan>
                </text>

                <!-- vessel -->
                <rect
                    x={VX}
                    y={MAXY - 16}
                    width={VW}
                    height={FLOOR - (MAXY - 16)}
                    rx="9"
                    fill={SURFACE}
                    stroke={LINE_B}
                    stroke-width="1.5"
                />
                <!-- max line -->
                <line
                    class="tk-maxline"
                    x1={VX - 6}
                    y1={MAXY}
                    x2={VX + VW + 6}
                    y2={MAXY}
                    stroke={overflow ? WARM : FAINT}
                    stroke-width="1.2"
                    stroke-dasharray="4 4"
                />
                <text
                    x={VX + VW + 10}
                    y={MAXY + 4}
                    font-family="var(--mono)"
                    font-size="10"
                    fill={overflow ? WARM : FAINT}>max</text
                >

                <!-- strata -->
                <g>
                    <rect
                        class="tk-sys"
                        x={VX + 4}
                        y={lay.ySys}
                        width={VW - 8}
                        height={lay.hSys}
                        rx="3"
                        fill="var(--cat-system-fill)"
                    /><rect
                        x={VX + 4}
                        y={lay.ySys}
                        width="3"
                        height={lay.hSys}
                        fill="var(--cat-system)"
                    />
                    <!-- tool definitions: the growing band -->
                    <rect
                        class="tk-tool"
                        x={VX + 4}
                        y={lay.yTool}
                        width={VW - 8}
                        height={lay.hTool}
                        rx="3"
                        fill="var(--cat-tools-fill)"
                        stroke="var(--cat-tools)"
                        stroke-width="1"
                    />
                    <rect
                        x={VX + 4}
                        y={lay.yTool}
                        width={VW - 8}
                        height={lay.hTool}
                        rx="3"
                        fill="url(#mcp-hatch)"
                        class="tk-tool-hatch"
                        style="pointer-events:none"
                    />
                    <rect
                        class="tk-tool-stripe"
                        x={VX + 4}
                        y={lay.yTool}
                        width="3"
                        height={lay.hTool}
                        fill="var(--cat-tools)"
                    />
                    <text
                        class="tk-tool-label"
                        x={VX + 13}
                        y={lay.yTool + lay.hTool / 2}
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="10"
                        fill="var(--cat-tools)">tool definitions</text
                    >
                    <rect
                        class="tk-hist"
                        x={VX + 4}
                        y={lay.yHist}
                        width={VW - 8}
                        height={lay.hHist}
                        rx="3"
                        fill="var(--cat-history-fill)"
                    /><rect
                        class="tk-hist-stripe"
                        x={VX + 4}
                        y={lay.yHist}
                        width="3"
                        height={lay.hHist}
                        fill="var(--cat-history)"
                    />
                    <rect
                        class="tk-user"
                        x={VX + 4}
                        y={lay.yUser}
                        width={VW - 8}
                        height={lay.hUser}
                        rx="3"
                        fill="var(--cat-user-fill)"
                    /><rect
                        class="tk-user-stripe"
                        x={VX + 4}
                        y={lay.yUser}
                        width="3"
                        height={lay.hUser}
                        fill="var(--cat-user)"
                    />
                </g>
                <line
                    class="tk-surface"
                    x1={VX + 2}
                    y1={lay.surface}
                    x2={VX + VW - 2}
                    y2={lay.surface}
                    stroke={PAPER}
                    stroke-width="1.2"
                    opacity="0.4"
                />

                <!-- fixed bracket on tool definitions -->
                <path
                    d={`M ${VX - 8} ${FLOOR - lay.hSys - lay.hTool} h -7 v ${lay.hTool} h 7`}
                    fill="none"
                    stroke={FAINT}
                />
                <text
                    x={VX - 20}
                    y={FLOOR - lay.hSys - lay.hTool / 2}
                    text-anchor="middle"
                    transform={`rotate(-90 ${VX - 20} ${FLOOR - lay.hSys - lay.hTool / 2})`}
                    font-family="var(--mono)"
                    font-size="8"
                    letter-spacing="0.06em"
                    fill={FAINT}>FIXED · EVERY CALL</text
                >

                <!-- MCP servers -->
                <text
                    x="300"
                    y="36"
                    font-family="var(--mono)"
                    font-size="10.5"
                    font-weight="600"
                    letter-spacing="0.1em"
                    fill={PAPER}>MCP SERVERS</text
                >
                <text
                    x="300"
                    y="52"
                    font-family="var(--mono)"
                    font-size="9"
                    fill={FAINT}>each advertises tools · name + schema</text
                >
                {#each SERVERS as srv, i}
                    <g
                        class="mcp-server"
                        style:opacity={i < mcp.servers ? 1 : 0.15}
                    >
                        <rect
                            x="300"
                            y={66 + i * 40}
                            width="210"
                            height="32"
                            rx="4"
                            fill="var(--surface-raised)"
                            stroke={i < mcp.servers ? "var(--cat-tools)" : LINE}
                            stroke-width="1"
                        />
                        <text
                            x="312"
                            y={86 + i * 40}
                            font-family="var(--mono)"
                            font-size="10.5"
                            fill={i < mcp.servers ? PAPER : FAINT}
                            >{srv.name}</text
                        >
                        <text
                            x="498"
                            y={86 + i * 40}
                            text-anchor="end"
                            font-family="var(--mono)"
                            font-size="9"
                            fill={i < mcp.servers ? "var(--cat-tools)" : FAINT}
                            >+{srv.tools} tools</text
                        >
                        {#if i < mcp.servers}
                            <path
                                d={`M 300 ${82 + i * 40} C 270 ${82 + i * 40}, 250 ${FLOOR - lay.hSys - lay.hTool / 2}, ${VX + VW + 4} ${FLOOR - lay.hSys - lay.hTool / 2}`}
                                fill="none"
                                stroke="var(--cat-tools)"
                                stroke-width="0.8"
                                opacity="0.28"
                            />
                        {/if}
                    </g>
                {/each}

                <text
                    x="300"
                    y="438"
                    font-family="var(--mono)"
                    font-size="9.5"
                    fill={FAINT}>tools/list → schemas register into</text
                >
                <text
                    x="300"
                    y="454"
                    font-family="var(--mono)"
                    font-size="9.5"
                    fill={FAINT}>the fixed tool-definitions layer</text
                >
            </svg>
            <figcaption class="tc-note mono">{mcp.note}</figcaption>
        </figure>

        <ol class="tc-steps tc-mcp-steps">
            {#each MCP as s, i}
                <li
                    class="tc-mcp-step"
                    data-i={i}
                    aria-current={i === activeMcp ? "step" : undefined}
                >
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
            The model only ever emits text. The harness turns some of that text
            into actions, runs them, and feeds the results back. So the real
            lever is not the model — it is <em>what you put in front of it.</em>
        </p>

        <details class="deeper">
            <summary
                ><span class="mono">Go deeper</span> — how the harness actually spots
                a tool call</summary
            >
            <div class="deeper-body">
                <p>
                    The plain JSON shown here is a teaching simplification. In
                    practice the model providers train the model to emit a tool
                    call as a dedicated, structured block, and the API hands it
                    back as typed data — e.g. a <span class="mono"
                        >tool_use</span
                    >
                    block carrying a
                    <span class="mono">name</span>, an
                    <span class="mono">input</span>
                    object, and an id, with the response marked
                    <span class="mono">stop_reason: "tool_use"</span>. The
                    harness loops: call the model → if it asked for a tool, run
                    it and append a
                    <span class="mono">tool_result</span> with the matching id → call
                    again → stop when the model replies with no tool call. The model
                    can also request several tools at once (parallel tool calls).
                    Either way the principle holds: the model produces text-shaped
                    output; your code does the doing.
                </p>
            </div>
        </details>

        <details class="deeper">
            <summary
                ><span class="mono">Go deeper</span> — MCP is more than tools</summary
            >
            <div class="deeper-body">
                <p>
                    An MCP server can expose <em>tools</em> (actions), but also
                    <em>resources</em>
                    (read-only context the agent can pull in) and
                    <em>prompts</em>
                    (reusable templates). The agent discovers tools with a
                    <span class="mono">tools/list</span>
                    call and invokes one with
                    <span class="mono">tools/call</span>, over a transport such
                    as stdio (a local process) or HTTP. Because every connected
                    tool’s schema is part of the fixed context, a good rule is
                    the same as the chapter’s: connect what the task needs, and
                    turn the rest off.
                </p>
            </div>
        </details>

        <p class="disclaimer tc-disclaimer">
            Illustrative: the JSON shapes, token counts, and tool list are
            simplified and made up. The behaviours are real — the model only
            emits text, the harness parses it and runs the tool, the result is
            fed back as text, and every connected tool’s schema is re-sent to
            the model on every call.
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

    /* 1 · transition — normal document flow; ScrollTrigger only plays/reverses */
    .tc-tx {
        min-height: 100svh;
        display: grid;
        align-content: center;
        gap: clamp(1.4rem, 4vw, 2.8rem);
        padding: clamp(1rem, 4vw, 3rem) 0 clamp(2rem, 5vw, 4rem);
    }
    .tx-frame {
        max-width: min(100%, 62rem);
        margin-inline: auto;
    }
    :global(.tx-band-overlay) {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 20;
        pointer-events: none;
        overflow: visible;
        filter: drop-shadow(0 0 12px rgba(179, 148, 230, 0.34));
        will-change: transform, width, height, opacity;
    }
    .tc-tx .tc-head {
        max-width: 48rem;
    }
    .tc-title {
        /* size/colour come from the shared .chapter-head rules */
        margin-bottom: 1rem;
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
        content: "+ ";
        color: var(--brand-strong);
        font-family: var(--mono);
    }
    .deeper[open] > summary::before {
        content: "– ";
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

    @media (max-width: 760px) {
        .tc {
            padding-inline: clamp(0.75rem, 3.5vw, 1rem);
        }
        .tc-tx {
            min-height: 92svh;
            gap: 1.2rem;
        }
        .tx-frame {
            padding: 0.7rem;
        }
        .tc-tx .tc-head {
            margin-inline: 0.2rem;
        }
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
    :global(html.no-js) .tx-chip {
        display: none;
    }
    :global(html.no-js) .tx-schema-line,
    :global(html.no-js) .tx-schema-shell,
    :global(html.no-js) .tx-emitted,
    :global(html.no-js) .tx-claim,
    :global(html.no-js) .tc-tx .tc-head {
        opacity: 1;
        visibility: visible;
    }
</style>
