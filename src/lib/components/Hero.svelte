<script lang="ts">
    import { onMount } from "svelte";

    const SURFACE = "#11151F";
    const LINE = "#1E2533";
    const LINE_B = "#2C3650";
    const PAPER = "#E8E6DF";
    const MUTED = "#8A93A6";
    const FAINT = "#5A6275";
    const COOL = "#38E1C6";
    const WARM = "#FF9D4D";

    type CodeLine = {
        text: string;
        cls?: string;
        note?: string;
        head?: boolean;
    };

    // The agent routine, read top-to-bottom. Highlighted line-by-line as the loop runs.
    const CODE: CodeLine[] = [
        { text: "turn(user_message):", head: true },
        {
            text: "  context.append(user_message)",
            cls: "code-input",
            note: "append input",
        },
        {
            text: "  while True:",
            cls: "code-loop",
            head: true,
            note: "inner loop",
        },
        {
            text: "    response = LLM(context)",
            cls: "code-call",
            note: "send all",
        },
        {
            text: "    context.append(response)",
            cls: "code-append",
            note: "append",
        },
        { text: "    if response.tool_call:", cls: "code-if" },
        {
            text: "      out = run_tool(response)",
            cls: "code-tool",
            note: "act",
        },
        {
            text: "      context.append(out)",
            cls: "code-toolapp",
            note: "loop",
        },
        {
            text: "    else: return response",
            cls: "code-return",
            note: "to user",
        },
    ];

    // Context window strata, top (oldest / fixed) → bottom (newest, appended this turn).
    type Band = {
        label: string;
        detail: string;
        y: number;
        h: number;
        fill: string;
        accent: string; // category hue — left stripe + label
        fixed?: boolean;
        response?: boolean;
        cls?: string;
    };
    // One distinct hue per category so adjacent layers read apart by color.
    const SYSTEM = "#6E7BB0";
    const TOOLS = "#A284D6";
    const HISTORY = "#4FA6D6";
    const USER = "#5BC592";
    const STRATA: Band[] = [
        {
            label: "system prompt",
            detail: "fixed",
            y: 206,
            h: 30,
            fill: "#1C2238",
            accent: SYSTEM,
            fixed: true,
        },
        {
            label: "tool definitions",
            detail: "fixed",
            y: 238,
            h: 34,
            fill: "#272140",
            accent: TOOLS,
            fixed: true,
        },
        {
            label: "conversation",
            detail: "carried",
            y: 274,
            h: 30,
            fill: "#143040",
            accent: HISTORY,
        },
        {
            label: "user input",
            detail: "appended",
            y: 306,
            h: 36,
            fill: "#163127",
            accent: USER,
            cls: "band-user",
        },
        {
            label: "model response",
            detail: "tool call",
            y: 344,
            h: 36,
            fill: "#352513",
            accent: WARM,
            response: true,
            cls: "band-toolcall",
        },
        {
            label: "tool output",
            detail: "appended",
            y: 382,
            h: 40,
            fill: "#103330",
            accent: COOL,
            cls: "band-toolout",
        },
        {
            label: "model response",
            detail: "answer",
            y: 424,
            h: 36,
            fill: "#352513",
            accent: WARM,
            response: true,
            cls: "band-answer",
        },
    ];

    // Context shown as tokens entering the model. Sub-word splits ("fail"+"ing")
    // foreshadow Ch.2 tokenization; x is laid out left→right once.
    let readAcc = 752;
    const READ_TOKENS = [
        { t: "fix", w: 30 },
        { t: " the", w: 32 },
        { t: " fail", w: 34 },
        { t: "ing", w: 30 },
        { t: " test", w: 36 },
        { t: "…", w: 20 },
    ].map((d) => {
        const o = { ...d, x: readAcc };
        readAcc += d.w + 4;
        return o;
    });

    // Narration synced to the timeline so the eye can follow each hop.
    const PHASES = [
        { k: "turn", t: "A turn begins with your message to the agent." },
        {
            k: "append",
            t: "The agent appends your message to the bottom of the context window.",
        },
        {
            k: "send",
            t: "It sends the entire context window — every stratum — to the model.",
        },
        {
            k: "forward",
            t: "Inside, the context flows down through stacked layers — each token looking back at the others.",
        },
        {
            k: "sample",
            t: "It scores every possible token and samples one, looping to build the reply one token at a time — here, a tool call.",
        },
        {
            k: "tool",
            t: "The agent runs the tool and appends its output — the loop, not the user.",
        },
        {
            k: "again",
            t: "With the new context, the model is called again from the top.",
        },
        {
            k: "answer",
            t: "This time it returns the final answer to you, ending the turn.",
        },
    ];

    let stageEl: HTMLElement;
    let phase = $state(0);
    let used = $state("1.8k");
    let gen = $state("read");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gsap: any;

    const beat = $derived(PHASES[phase]);

    onMount(() => {
        let context: { revert: () => void } | undefined;
        let disposed = false;

        Promise.all([import("gsap"), import("gsap/MotionPathPlugin")]).then(
            ([core, motion]) => {
                if (disposed) return;
                gsap = core.gsap ?? core.default;
                const MotionPathPlugin =
                    motion.MotionPathPlugin ?? motion.default;
                gsap.registerPlugin(MotionPathPlugin);

                context = gsap.context(() => {
                    const q = gsap.utils.selector(stageEl);
                    const DIM = { opacity: 0.4 };
                    const bands =
                        ".band-user, .band-toolcall, .band-toolout, .band-answer";

                    const rest = () => {
                        gsap.set(q(".code-line"), DIM);
                        gsap.set(q(".flow-chip"), { opacity: 0 });
                        gsap.set(q(bands), {
                            scaleY: 0,
                            transformOrigin: "50% 0%",
                        });
                        gsap.set(q(".transformer-step"), { opacity: 0.3 });
                        gsap.set(q(".generated-token"), { opacity: 0 });
                        gsap.set(q(".gen-loop-chip"), { opacity: 0 });
                    };

                    rest();

                    const motionPath = (path: string) => ({
                        motionPath: {
                            path,
                            align: path,
                            alignOrigin: [0.5, 0.5],
                        },
                    });
                    const setPhase = (i: number) => () => (phase = i);
                    const setUsed = (v: string) => () => (used = v);
                    const setGen = (v: string) => () => (gen = v);

                    // One full pass through the LLM: embeddings → layers → logits → token.
                    const forwardPass = (tl: any, label: string) => {
                        tl.to(q(".embedding-step"), {
                            opacity: 1,
                            duration: 0.3,
                        })
                            .to(q(".block-1"), { opacity: 1, duration: 0.32 })
                            .to(q(".block-2"), { opacity: 1, duration: 0.32 })
                            .to(q(".block-n"), { opacity: 1, duration: 0.32 })
                            .to(q(".logits-step"), {
                                opacity: 1,
                                duration: 0.3,
                            })
                            .call(setGen(label))
                            .fromTo(
                                q(".generated-token"),
                                { opacity: 0, scale: 0.7 },
                                {
                                    opacity: 1,
                                    scale: 1,
                                    duration: 0.3,
                                    transformOrigin: "50% 50%",
                                },
                            )
                            // inner generation loop: append this token, predict the next
                            .set(q(".gen-loop-chip"), { opacity: 1 })
                            .to(q(".gen-loop-chip"), {
                                duration: 0.5,
                                ease: "none",
                                repeat: 1,
                                ...motionPath("#gen-loop-path"),
                            })
                            .set(q(".gen-loop-chip"), { opacity: 0 });
                    };
                    const dimLLM = (tl: any) => {
                        tl.to(q(".transformer-step"), {
                            opacity: 0.3,
                            duration: 0.25,
                        }).to(
                            q(".generated-token"),
                            { opacity: 0, duration: 0.2 },
                            "<",
                        );
                    };

                    // id lets ch.2's break-away transition pause the loop mid-zoom
                    const tl = gsap.timeline({
                        id: "hero-loop",
                        repeat: -1,
                        repeatDelay: 1,
                    });

                    tl.call(() => {
                        rest();
                        used = "1.8k";
                    })
                        .call(setPhase(0))
                        .to({}, { duration: 0.6 })

                        // 1 — append the user message
                        .call(setPhase(1))
                        .to(q(".code-input"), { opacity: 1, duration: 0.25 })
                        .set(q(".input-chip"), { opacity: 1 })
                        .to(q(".input-chip"), {
                            duration: 0.95,
                            ease: "power1.inOut",
                            ...motionPath("#input-path"),
                        })
                        .to(q(".input-chip"), { opacity: 0, duration: 0.15 })
                        .to(
                            q(".band-user"),
                            { scaleY: 1, duration: 0.4, ease: "power2.out" },
                            "<",
                        )
                        .call(setUsed("2.0k"))
                        .to(q(".code-input"), DIM, "+=0.1")

                        // 2 — send the whole context to the model
                        .call(setPhase(2))
                        .to(q(".code-loop"), { opacity: 1, duration: 0.2 })
                        .to(q(".code-call"), { opacity: 1, duration: 0.2 })
                        .to(
                            q(".tank-shell"),
                            {
                                stroke: PAPER,
                                duration: 0.25,
                                yoyo: true,
                                repeat: 1,
                            },
                            "<",
                        )
                        .set(q(".context-chip"), { opacity: 1 })
                        .to(q(".context-chip"), {
                            duration: 1.05,
                            ease: "power1.inOut",
                            ...motionPath("#send-path"),
                        })
                        .to(q(".context-chip"), { opacity: 0, duration: 0.15 })
                        .to(q(".code-loop"), DIM, "<")

                        // 3 — forward pass
                        .call(setPhase(3));
                    forwardPass(tl, "read");

                    tl
                        // 4 — sample a token (tool call) and append it
                        .call(setPhase(4))
                        .to(q(".code-call"), DIM)
                        .to(q(".code-append"), { opacity: 1, duration: 0.22 })
                        .set(q(".output-chip"), { opacity: 1 })
                        .to(q(".output-chip"), {
                            duration: 1.05,
                            ease: "power1.inOut",
                            ...motionPath("#return-path-1"),
                        })
                        .to(q(".output-chip"), { opacity: 0, duration: 0.15 })
                        .to(
                            q(".band-toolcall"),
                            { scaleY: 1, duration: 0.4, ease: "power2.out" },
                            "<",
                        )
                        .call(setUsed("2.4k"))
                        .to(q(".code-append"), DIM, "+=0.1");

                    dimLLM(tl);

                    tl
                        // 5 — run the tool, append its output (the loop)
                        .call(setPhase(5))
                        .to(q(".code-if"), { opacity: 1, duration: 0.2 })
                        .to(q(".code-tool"), { opacity: 1, duration: 0.2 })
                        .to(q(".code-toolapp"), { opacity: 1, duration: 0.2 })
                        .set(q(".tool-chip"), { opacity: 1 })
                        .to(q(".tool-chip"), {
                            duration: 0.95,
                            ease: "power1.inOut",
                            ...motionPath("#tool-path"),
                        })
                        .to(q(".tool-chip"), { opacity: 0, duration: 0.15 })
                        .to(
                            q(".band-toolout"),
                            { scaleY: 1, duration: 0.4, ease: "power2.out" },
                            "<",
                        )
                        .call(setUsed("3.6k"))
                        .to(q(".code-if, .code-tool"), DIM, "+=0.1")

                        // 6 — call the model again from the top of the loop
                        .call(setPhase(6))
                        .to(q(".code-toolapp"), DIM)
                        .to(q(".code-loop"), { opacity: 1, duration: 0.2 })
                        .to(q(".code-call"), { opacity: 1, duration: 0.2 })
                        .to(
                            q(".tank-shell"),
                            {
                                stroke: PAPER,
                                duration: 0.25,
                                yoyo: true,
                                repeat: 1,
                            },
                            "<",
                        )
                        .set(q(".context-chip"), { opacity: 1 })
                        .to(q(".context-chip"), {
                            duration: 1.05,
                            ease: "power1.inOut",
                            ...motionPath("#send-path"),
                        })
                        .to(q(".context-chip"), { opacity: 0, duration: 0.15 })
                        .to(q(".code-loop"), DIM, "<");

                    forwardPass(tl, "Fixed");

                    tl
                        // 7 — return the final answer to the user
                        .call(setPhase(7))
                        .to(q(".code-call"), DIM)
                        .to(q(".code-append"), { opacity: 1, duration: 0.22 })
                        .set(q(".output-chip"), { opacity: 1 })
                        .to(q(".output-chip"), {
                            duration: 1.05,
                            ease: "power1.inOut",
                            ...motionPath("#return-path-2"),
                        })
                        .to(q(".output-chip"), { opacity: 0, duration: 0.15 })
                        .to(
                            q(".band-answer"),
                            { scaleY: 1, duration: 0.4, ease: "power2.out" },
                            "<",
                        )
                        .call(setUsed("4.2k"))
                        .to(q(".code-append"), DIM, "+=0.1")
                        .to(q(".code-return"), { opacity: 1, duration: 0.25 })
                        .to(q(".code-return"), { opacity: 1, duration: 0.9 })
                        .to({}, { duration: 1.3 });
                }, stageEl);
            },
        );

        return () => {
            disposed = true;
            context?.revert();
        };
    });
</script>

<section id="machine" class="hero" aria-labelledby="hero-title">
    <div class="intro">
        <p class="eyebrow">The whole machine</p>
        <h1 id="hero-title">One continuous cycle.</h1>
    </div>

    <figure class="stage" bind:this={stageEl}>
        <svg
            viewBox="0 0 1100 630"
            role="img"
            aria-label="A coding agent appends user input to the bottom of a stratified context window, then sends the whole context to a model that reads it as tokens, weighs them across stacked layers, and predicts a reply one token at a time. The agent runs the tool the model calls and appends the output, then loops until the model returns the final answer."
        >
            <defs>
                <marker
                    id="arrow-cool"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M0,0 L10,5 L0,10 z" fill={COOL} />
                </marker>
                <marker
                    id="arrow-warm"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M0,0 L10,5 L0,10 z" fill={WARM} />
                </marker>
                <marker
                    id="arrow-faint"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                >
                    <path d="M0,0 L10,5 L0,10 z" fill={FAINT} />
                </marker>
                <pattern
                    id="hero-dots"
                    width="26"
                    height="26"
                    patternUnits="userSpaceOnUse"
                >
                    <circle cx="1" cy="1" r="1" fill={LINE} opacity="0.55" />
                </pattern>
                <pattern
                    id="fixed-hatch"
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
                        opacity="0.05"
                    />
                </pattern>
            </defs>

            <rect
                class="hero-bg"
                width="1100"
                height="630"
                fill="url(#hero-dots)"
            />

            <g>
                <!-- Flow paths: cool travels right into the model, warm returns left. Also the static fallback. -->
                <g class="hero-flows">
                <path
                    id="input-path"
                    d="M 360 272 C 410 286, 432 314, 470 324"
                    fill="none"
                    stroke={COOL}
                    stroke-width="1.2"
                    opacity="0.34"
                    marker-end="url(#arrow-cool)"
                />
                <path
                    id="send-path"
                    d="M 630 360 C 686 348, 696 178, 742 163"
                    fill="none"
                    stroke={COOL}
                    stroke-width="1.2"
                    opacity="0.34"
                    marker-end="url(#arrow-cool)"
                />
                <path
                    id="tool-path"
                    d="M 360 428 C 414 416, 438 404, 470 402"
                    fill="none"
                    stroke={COOL}
                    stroke-width="1.2"
                    opacity="0.34"
                    marker-end="url(#arrow-cool)"
                />
                <path
                    id="return-path-1"
                    d="M 820 500 C 706 540, 654 408, 632 362"
                    fill="none"
                    stroke={WARM}
                    stroke-width="1.2"
                    opacity="0.34"
                    marker-end="url(#arrow-warm)"
                />
                <path
                    id="return-path-2"
                    d="M 820 500 C 700 545, 648 472, 632 442"
                    fill="none"
                    stroke={WARM}
                    stroke-width="1.2"
                    opacity="0.3"
                    marker-end="url(#arrow-warm)"
                />
                </g>

                <!-- AGENT — the routine, read top to bottom -->
                <g class="hero-agent">
                <rect
                    x="40"
                    y="150"
                    width="320"
                    height="388"
                    rx="18"
                    fill={SURFACE}
                    stroke={LINE_B}
                    stroke-width="1.5"
                />
                <text
                    x="64"
                    y="182"
                    font-family="var(--mono)"
                    font-size="11"
                    font-weight="600"
                    letter-spacing="0.16em"
                    fill={PAPER}>AGENT · ONE USER TURN</text
                >
                <text
                    x="64"
                    y="206"
                    font-family="var(--mono)"
                    font-size="10"
                    fill={FAINT}>user_message = "fix the failing test"</text
                >
                <line x1="64" y1="220" x2="336" y2="220" stroke={LINE} />

                {#each CODE as line, i}
                    {@const y = 246 + i * 26}
                    <g class="code-line {line.cls ?? ''}">
                        <text
                            x="64"
                            {y}
                            xml:space="preserve"
                            font-family="var(--mono)"
                            font-size="11.8"
                            fill={line.head ? PAPER : MUTED}>{line.text}</text
                        >
                        {#if line.note}
                            <text
                                x="336"
                                {y}
                                text-anchor="end"
                                font-family="var(--mono)"
                                font-size="9"
                                fill={FAINT}>{"# " + line.note}</text
                            >
                        {/if}
                    </g>
                {/each}

                <line x1="64" y1="470" x2="336" y2="470" stroke={LINE} />
                <text
                    x="64"
                    y="500"
                    font-family="var(--mono)"
                    font-size="9.5"
                    fill={FAINT}>the loop runs, not you — until it returns</text
                >
                </g>

                <!-- CONTEXT WINDOW — a tank that fills top→bottom as the turn runs -->
                <g class="hero-ctx">
                <text
                    x="552"
                    y="184"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="11"
                    font-weight="600"
                    letter-spacing="0.12em"
                    fill={PAPER}>CONTEXT WINDOW</text
                >
                <text
                    x="552"
                    y="199"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="9"
                    fill={FAINT}>what the model sees · {used} / 8k</text
                >
                <rect
                    class="tank-shell"
                    x="474"
                    y="200"
                    width="156"
                    height="312"
                    rx="9"
                    fill={SURFACE}
                    stroke={LINE_B}
                    stroke-width="1.5"
                />
                <line
                    x1="468"
                    y1="496"
                    x2="636"
                    y2="496"
                    stroke={FAINT}
                    stroke-width="1"
                    stroke-dasharray="3 4"
                />
                <text
                    x="640"
                    y="499"
                    font-family="var(--mono)"
                    font-size="8"
                    fill={FAINT}>max</text
                >

                {#each STRATA as band}
                    <g class={band.cls}>
                        <rect
                            x="479"
                            y={band.y}
                            width="146"
                            height={band.h - 2}
                            rx="3"
                            fill={band.fill}
                            stroke={LINE}
                            stroke-width="0.8"
                        />
                        {#if band.fixed}
                            <rect
                                x="479"
                                y={band.y}
                                width="146"
                                height={band.h - 2}
                                rx="3"
                                fill="url(#fixed-hatch)"
                            />
                        {/if}
                        <rect
                            x="479"
                            y={band.y}
                            width="3"
                            height={band.h - 2}
                            fill={band.accent}
                        />
                        <text
                            x="488"
                            y={band.y + band.h / 2}
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="9.5"
                            fill={band.accent}>{band.label}</text
                        >
                        <text
                            x="618"
                            y={band.y + band.h / 2}
                            text-anchor="end"
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="8"
                            fill={FAINT}>{band.detail}</text
                        >
                    </g>
                {/each}

                <path
                    d="M 467 206 h -7 v 64 h 7"
                    fill="none"
                    stroke={FAINT}
                    stroke-width="1"
                />
                <text
                    x="453"
                    y="238"
                    text-anchor="middle"
                    transform="rotate(-90 453 238)"
                    font-family="var(--mono)"
                    font-size="8"
                    letter-spacing="0.08em"
                    fill={FAINT}>FIXED</text
                >
                <path
                    d="M 467 306 h -7 v 154 h 7"
                    fill="none"
                    stroke={MUTED}
                    stroke-width="1"
                />
                <text
                    x="453"
                    y="383"
                    text-anchor="middle"
                    transform="rotate(-90 453 383)"
                    font-family="var(--mono)"
                    font-size="8"
                    letter-spacing="0.08em"
                    fill={MUTED}>APPENDED THIS TURN</text
                >
                </g>

                <!-- LLM — a next-token predictor: reads context, weighs it, predicts one token, loops -->
                <g class="hero-llm">
                <rect
                    x="720"
                    y="96"
                    width="340"
                    height="446"
                    rx="18"
                    fill={SURFACE}
                    stroke={LINE_B}
                    stroke-width="1.5"
                />
                <text
                    x="744"
                    y="126"
                    font-family="var(--mono)"
                    font-size="12"
                    font-weight="600"
                    letter-spacing="0.16em"
                    fill={PAPER}>LLM</text
                >
                <text
                    x="1036"
                    y="126"
                    text-anchor="end"
                    font-family="var(--mono)"
                    font-size="9.5"
                    fill={FAINT}>a next-token predictor</text
                >
                <line x1="744" y1="138" x2="1036" y2="138" stroke={LINE} />

                <!-- 1 — READS the whole context, broken into tokens -->
                <text
                    class="read-label"
                    x="744"
                    y="162"
                    font-family="var(--mono)"
                    font-size="10.5"
                    font-weight="600"
                    letter-spacing="0.12em"
                    fill={MUTED}><tspan fill={PAPER}>1</tspan>  READS THE CONTEXT</text
                >
                <text
                    class="read-label"
                    x="1036"
                    y="162"
                    text-anchor="end"
                    font-family="var(--mono)"
                    font-size="8.5"
                    fill={FAINT}>the window → tokens</text
                >
                <g class="transformer-step embedding-step">
                    {#each READ_TOKENS as tk}
                        <g class="read-tk" class:read-ellipsis={tk.t === "…"}>
                            <rect
                                x={tk.x}
                                y="176"
                                width={tk.w}
                                height="20"
                                rx="4"
                                fill="#1B2434"
                                stroke={LINE_B}
                                stroke-width="0.8"
                            />
                            <text
                                x={tk.x + tk.w / 2}
                                y="187"
                                text-anchor="middle"
                                dominant-baseline="middle"
                                xml:space="preserve"
                                font-family="var(--mono)"
                                font-size="9"
                                fill={PAPER}>{tk.t}</text
                            >
                        </g>
                    {/each}
                </g>

                <!-- 2 — WEIGHS it: a stack of identical layers; attention lets each token look back -->
                <text
                    x="744"
                    y="226"
                    font-family="var(--mono)"
                    font-size="10.5"
                    font-weight="600"
                    letter-spacing="0.12em"
                    fill={MUTED}><tspan fill={PAPER}>2</tspan>  WEIGHS IT</text
                >
                <text
                    x="1000"
                    y="226"
                    text-anchor="end"
                    font-family="var(--mono)"
                    font-size="8.5"
                    fill={FAINT}>decoder-only transformer</text
                >

                <!-- ghosted depth: the same layer, repeated N times -->
                <g class="transformer-step block-n">
                    <rect
                        x="748"
                        y="234"
                        width="240"
                        height="78"
                        rx="7"
                        fill={SURFACE}
                        stroke={LINE}
                    />
                </g>
                <g class="transformer-step block-2">
                    <rect
                        x="754"
                        y="240"
                        width="240"
                        height="78"
                        rx="7"
                        fill={SURFACE}
                        stroke={LINE}
                    />
                </g>
                <g class="transformer-step block-1">
                    <rect
                        x="760"
                        y="246"
                        width="240"
                        height="78"
                        rx="7"
                        fill="#171D2A"
                        stroke={LINE_B}
                    />
                    <text
                        x="994"
                        y="262"
                        text-anchor="end"
                        font-family="var(--mono)"
                        font-size="8"
                        fill={FAINT}>×N layers</text
                    >
                    <circle cx="778" cy="276" r="3" fill={MUTED} />
                    <circle cx="812" cy="276" r="3" fill={MUTED} />
                    <circle cx="846" cy="276" r="3" fill={MUTED} />
                    <circle cx="880" cy="276" r="3" fill={MUTED} />
                    <circle cx="914" cy="276" r="3" fill={MUTED} />
                    <circle cx="948" cy="276" r="3" fill={MUTED} />
                    <circle cx="982" cy="276" r="3" fill={MUTED} />
                    <path d="M 982 276 Q 880 304 778 276" fill="none" stroke={LINE_B} stroke-width="1" opacity="0.7" />
                    <path d="M 948 276 Q 880 300 812 276" fill="none" stroke={LINE_B} stroke-width="1" opacity="0.7" />
                    <path d="M 914 276 Q 880 296 846 276" fill="none" stroke={LINE_B} stroke-width="1" opacity="0.7" />
                    <path d="M 880 276 Q 846 292 812 276" fill="none" stroke={LINE_B} stroke-width="1" opacity="0.7" />
                    <path d="M 846 276 Q 812 290 778 276" fill="none" stroke={LINE_B} stroke-width="1" opacity="0.7" />
                    <text
                        x="880"
                        y="316"
                        text-anchor="middle"
                        font-family="var(--mono)"
                        font-size="8"
                        fill={FAINT}>self-attention · every token looks back</text
                    >
                </g>

                <!-- 3 — PREDICTS the next token: score the vocabulary, sample one -->
                <text
                    x="744"
                    y="350"
                    font-family="var(--mono)"
                    font-size="10.5"
                    font-weight="600"
                    letter-spacing="0.12em"
                    fill={MUTED}><tspan fill={PAPER}>3</tspan>  PREDICTS WHAT'S NEXT</text
                >
                <text
                    x="1000"
                    y="350"
                    text-anchor="end"
                    font-family="var(--mono)"
                    font-size="8.5"
                    fill={FAINT}>score every token</text
                >

                <g class="transformer-step logits-step">
                    <text x="786" y="369" text-anchor="end" dominant-baseline="middle" font-family="var(--mono)" font-size="9.5" font-weight="600" fill={WARM}>{gen}</text>
                    <rect x="794" y="362" width="93" height="14" rx="3" fill="rgba(255,157,77,0.16)" stroke={WARM} />
                    <text x="900" y="369" dominant-baseline="middle" font-family="var(--mono)" font-size="8.5" fill={FAINT}>0.62</text>
                    <text x="946" y="369" dominant-baseline="middle" font-family="var(--mono)" font-size="8" fill={WARM}>◀ sampled</text>

                    <text x="786" y="393" text-anchor="end" dominant-baseline="middle" font-family="var(--mono)" font-size="9.5" fill={MUTED}>open</text>
                    <rect x="794" y="386" width="31" height="14" rx="3" fill="#26344A" stroke={LINE} />
                    <text x="900" y="393" dominant-baseline="middle" font-family="var(--mono)" font-size="8.5" fill={FAINT}>0.21</text>

                    <text x="786" y="417" text-anchor="end" dominant-baseline="middle" font-family="var(--mono)" font-size="9.5" fill={MUTED}>fix</text>
                    <rect x="794" y="410" width="14" height="14" rx="3" fill="#26344A" stroke={LINE} />
                    <text x="900" y="417" dominant-baseline="middle" font-family="var(--mono)" font-size="8.5" fill={FAINT}>0.09</text>
                </g>

                <path d="M 841 380 L 841 466" fill="none" stroke={FAINT} stroke-width="1" stroke-dasharray="2 3" marker-end="url(#arrow-faint)" />

                <g class="generated-token">
                    <rect
                        x="792"
                        y="470"
                        width="100"
                        height="28"
                        rx="6"
                        fill="rgba(255,157,77,0.12)"
                        stroke={WARM}
                    />
                    <text
                        x="842"
                        y="485"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="10"
                        font-weight="600"
                        fill={WARM}>{gen}</text
                    >
                </g>

                <!-- the generation loop: each token is appended, then the model predicts again -->
                <path
                    id="gen-loop-path"
                    d="M 892 484 C 1006 484, 1022 452, 1022 330 C 1022 235, 1010 188, 958 186"
                    fill="none"
                    stroke={WARM}
                    stroke-width="1.2"
                    opacity="0.3"
                    marker-end="url(#arrow-warm)"
                />
                <text
                    x="1040"
                    y="338"
                    text-anchor="middle"
                    transform="rotate(-90 1040 338)"
                    font-family="var(--mono)"
                    font-size="7.5"
                    letter-spacing="0.08em"
                    fill={FAINT}>APPEND · PREDICT AGAIN</text
                >
                <text
                    x="744"
                    y="524"
                    font-family="var(--mono)"
                    font-size="8"
                    fill={FAINT}>one token at a time — sample, append, predict the next</text
                >
                <g class="gen-loop-chip" style="filter: drop-shadow(var(--glow-warm));">
                    <circle r="4" fill={WARM} />
                </g>
                </g>

                <!-- Travelling token chips -->
                <g class="hero-flows">
                <g
                    class="flow-chip input-chip"
                    style="filter: drop-shadow(var(--glow-cool));"
                >
                    <rect
                        x="-26"
                        y="-10"
                        width="52"
                        height="20"
                        rx="5"
                        fill="rgba(56,225,198,0.12)"
                        stroke={COOL}
                    />
                    <text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="9"
                        font-weight="600"
                        fill={COOL}>input</text
                    >
                </g>
                <g
                    class="flow-chip tool-chip"
                    style="filter: drop-shadow(var(--glow-cool));"
                >
                    <rect
                        x="-34"
                        y="-10"
                        width="68"
                        height="20"
                        rx="5"
                        fill="rgba(56,225,198,0.12)"
                        stroke={COOL}
                    />
                    <text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="8.5"
                        font-weight="600"
                        fill={COOL}>tool out</text
                    >
                </g>
                <g
                    class="flow-chip context-chip"
                    style="filter: drop-shadow(var(--glow-cool));"
                >
                    <rect
                        x="-38"
                        y="-18"
                        width="76"
                        height="36"
                        rx="5"
                        fill="rgba(56,225,198,0.1)"
                        stroke={COOL}
                    />
                    <line
                        x1="-27"
                        y1="-8"
                        x2="25"
                        y2="-8"
                        stroke={COOL}
                        opacity="0.65"
                    />
                    <line
                        x1="-27"
                        y1="0"
                        x2="20"
                        y2="0"
                        stroke={COOL}
                        opacity="0.5"
                    />
                    <line
                        x1="-27"
                        y1="8"
                        x2="28"
                        y2="8"
                        stroke={COOL}
                        opacity="0.35"
                    />
                    <text
                        y="29"
                        text-anchor="middle"
                        font-family="var(--mono)"
                        font-size="8"
                        fill={COOL}>whole context</text
                    >
                </g>
                <g
                    class="flow-chip output-chip"
                    style="filter: drop-shadow(var(--glow-warm));"
                >
                    <rect
                        x="-30"
                        y="-10"
                        width="60"
                        height="20"
                        rx="5"
                        fill="rgba(255,157,77,0.12)"
                        stroke={WARM}
                    />
                    <text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="9"
                        font-weight="600"
                        fill={WARM}>response</text
                    >
                </g>
                </g>
            </g>
        </svg>

        <figcaption class="caption">
            <span class="eyebrow caption-label">{beat.k}</span>
            <span class="caption-text">{beat.t}</span>
        </figcaption>
    </figure>

    <p class="disclaimer note">
        Illustrative: layer count, token counts, and contents are simplified.
        The transformer structure and context flow are representative.
    </p>
</section>

<style>
    .hero {
        /* One slide: fill the viewport below the sticky header, no scroll. */
        --header: 3.15rem;
        --ratio: 1.746; /* 1100 / 630 svg aspect */
        --hero-chrome: clamp(19rem, 30svh, 24rem);
        width: 100%;
        margin: 0 auto;
        min-height: calc(100svh - var(--header));
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: clamp(0.6rem, 1.6vh, 1.2rem);
        padding: clamp(0.75rem, 2vh, 1.5rem) var(--page-gutter);
    }

    .intro {
        max-width: 44rem;
    }

    .eyebrow {
        color: var(--cool);
    }

    #hero-title {
        font-size: clamp(1.8rem, 5vh, 3rem);
        margin: 0.2rem 0 0;
        line-height: 1.02;
    }

    .stage {
        /* Grow with the display while preserving room for the surrounding copy. */
        align-self: center;
        width: 100%;
        max-width: min(
            100%,
            calc((100svh - var(--hero-chrome)) * var(--ratio))
        );
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
        padding: 0.7rem 1.1rem;
        border-top: 1px solid var(--line);
        min-height: 0;
    }

    .caption-label {
        color: var(--paper);
        white-space: nowrap;
    }

    .caption-text {
        font-family: var(--serif);
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--muted);
        flex: 1;
        min-width: 16rem;
        transition: opacity 0.2s ease;
    }

    .note {
        margin: 0;
        max-width: 48rem;
        font-size: 0.66rem;
    }

    @media (max-width: 700px) {
        .hero {
            min-height: 0;
            padding-inline: 0.75rem;
        }

        .caption {
            padding-inline: 1rem;
        }
    }

    @media (max-height: 720px) and (min-width: 701px) {
        .hero {
            --hero-chrome: 290px;
            justify-content: flex-start;
        }
    }
</style>
